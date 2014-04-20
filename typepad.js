var q = require('q'),
    dom = require('cheerio'),
    fs = require('fs'),
    url = require('url'),
    http = require('http'),
    ytdl = require('ytdl'),
    log = require('./logger'),
    utils = require('./utils'),
    config = require('./config'),
    flickr = require('./flickr');

var defaultDir = config.defaultDir,
    blogId = config.blog,
    numberOfPosts = config.limit;

if (require.main === module) {
  transfer();
}

function transfer() {
  var media, promise;

  utils.readJson('blog.json')
      .catch(function (error) {
        return getPosts(numberOfPosts)
            .then(function (entries) {
              return processPosts(entries);
            })
            .then(function (result) {
              return utils.saveJson(result, 'blog.json');
            })
      })
      .then(function (result) {
        media = result;
        return downloadMediaFiles(media);
      })
      .then(function () {
        return utils.saveJson(media, 'blog.json');
      })
      .then(function () {
        return uploadToFlickr(media);
      })
      .catch(function (e) {
        log.error(e);
      })
      .finally(function () {
        utils.saveJson(media, 'blog.json');
      });
}

function clone(object) {
  if (object instanceof Object) {
    var copy = {};
    for (var attr in object) {
      if (object.hasOwnProperty(attr)) copy[attr] = object[attr];
    }
    return copy;
  }
}

function getNumberOfPosts() {
  return getPostsPage(1, 1);
}

function getPosts(noOfPosts) {
  var size = 50,
      promises = [],
      posts = [],
      promise;

  log.debug('Reading post data from Typepad');

  promise = getNumberOfPosts()
      .then(function (result) {
        return result['totalResults'];
      })
      .then(function (total) {
        if (noOfPosts && noOfPosts < total) {
          total = noOfPosts;

          if (noOfPosts < size) {
            size = noOfPosts;
          }
        }

        for (var i = 1; i <= total; i += size) {
          promises.push(getPostsPage(i, size));
        }

        return q.all(promises)
            .then(function (result) {
              for (var i = 0; i < result.length; i++) {
                posts = posts.concat(result[i]['entries']);
              }

              return posts;
            });
      });

  return promise;
}

function getPostsPage(start, size) {
  var url;

  url = 'http://api.typepad.com/blogs/' + blogId + '/post-assets.json?start-index=' + start + '&max-results=' + size;

  return getRemoteJsonFile(url);
}

function getRemoteJsonFile(url) {
  var deferred = q.defer(),
      request;

  request = http.get(url, function (response) {
    var buffer = "",
        data,
        route;

    response.on("data", function (chunk) {
      buffer += chunk;
    });

    response.on("end", function (error) {
      if (error) {
        deferred.reject('getRemoteJsonFile error in response ' + error);
      } else {
        data = JSON.parse(buffer);
        deferred.resolve(data);
      }
    });

    response.on("error", function (error) {
      deferred.reject('getRemoteJsonFile error in response ' + error);
    });
  });

  request.setTimeout(10000, function () {
    deferred.reject('getRemoteJsonFile timeout error');
  });

  request.on('error', function (error) {
    deferred.reject('getRemoteJsonFile error in  ' + error);
  });

  request.end();

  return deferred.promise;
}

function processPosts(entries) {
  var media = [];

  entries.forEach(function (item, index) {
        var embeddedVideoLinks = item['embeddedVideoLinks'],
            embeddedImageLinks = item['embeddedImageLinks'],
            hasMediaLinks = false,
            post = {};

        post.title = item.title;
        post.taken = item.published;
        post.filename = item.filename;

        embeddedVideoLinks.forEach(function (item, index) {
          var content,
              iframe,
              embed,
              video;

          if (item['embedCode']) {
            video = clone(post);
            content = dom.load(item['embedCode']);
            iframe = content('iframe');
            embed = content('embed');

            if (embed.length > 0) {
              video.url = embed[0].attribs.src;
            } else if (iframe.length > 0) {
              video.url = iframe[0].attribs.src;
            }

            if (video.url && video.url.indexOf("youtube") > 0) {
              video.type = "youtube";
              video.url = convertYouTubeUrl(video.url);
              video.filename = video.filename + '-' + (index + 1) + '.mp4';
            } else {
              video.type = 'video';
              video.filename = video.filename + '-' + (index + 1) + '.mov';
            }

            media.push(video);

            hasMediaLinks = true;
          }
        });

        embeddedImageLinks.forEach(function (item, index) {
          var image;

          if (item.url) {
            image = clone(post);
            image.filename = image.filename + '-' + (index + 1) + '.jpg';
            image.type = 'image';
            image.url = item.url;

            media.push(image);

            hasMediaLinks = true;
          }
        });

        if (!hasMediaLinks) {
          var content,
              a;

          content = dom.load(item['content']);
          a = content('a');

          if (a.length) {
            post.type = 'video';
            post.url = a[0].attribs.href;
            post.filename = post.filename + '.mov';

            media.push(post);
          }
        }
      }
  );

  return media;
}

function uploadToFlickr(media) {
  var item,
      promise = q(media[media.length - 1]),
      length = media.length,
      count = 1;

  log.debug('Uploading to Flickr');

  media.reverse().forEach(function (item) {
    if (item.uploaded) {
      log.info('Skipped existed in Flickr (' + count++ + ' of ' + length + ') : ' + item.filename);
      return;
    }

    promise = promise
        .then(function () {
          return flickr.upload(item);
        })
        .then(function (result) {
          log.info('Uploaded to Flickr (' + count++ + ' of ' + length + ') : ' + item.filename);
          item.uploaded = true;
        })
        .catch(function (error) {
          log.error('File upload error : ' + item.filename, error);
        });
  });

  return promise;
}

function downloadMediaFiles(media) {
  var promise,
      promises = [],
      result,
      length = media.length;

  log.debug('Downloading media files');

  return utils.makeDir()

      .then(function () {
        var count = 1;

        media.forEach(function (item, index) {

          if (!item || !item.url || !item.filename || !item.type) {
            throw new Error('Undefined item, url, filename or type for media index : ' + index);
          }

          if (item.downloaded) {
            log.info('Skipped existed file (' + count++ + ' of ' + length + ') ' + item.type + ' : ' + item.filename);
            return;
          }

          if (item.type === 'youtube') {
            promise = downloadYouTube(item.url, item.filename);
          } else {
            promise = downloadFile(item.url, item.filename);
          }

          promise = promise
              .then(function (result) {
                item.downloaded = true;
                log.info('Downloaded (' + count++ + ' of ' + length + ') ' + item.type + ' : ' + item.filename);
              })
              .catch(function (error) {
                item.downloaded = false;
                log.error('Download error for ' + item.type + ' : ' + item.filename, error);
              });

          promises.push(promise);
        });

        result = q.all(promises)
            .then(function () {
              log.debug('Success downloading files');
            })
            .catch(function (error) {
              log.error('Error downloading files', error);
            });

        return result;

      });
}

function convertYouTubeUrl(videoUrl) {
  var urlBase = 'http://www.youtube.com/watch?v=',
      regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/,
      url,
      match,
      id,
      options;

  match = videoUrl.match(regExp);

  if (match && match[2].length == 11) {
    id = match[2];
  } else {
    throw new Error("Incorrect YouTube URL: " + url);
  }

  url = urlBase + id;

  return url;
}

function downloadYouTube(videoUrl, filename) {
  var options,
      file,
      readStream,
      path = defaultDir + filename,
      deferred = q.defer();

  options = {
    filter: function (format) {
      return format.container === 'mp4';
    }
  };

  file = fs.createWriteStream(path);
  readStream = ytdl(videoUrl, options);

  readStream.on('end', function () {
    deferred.resolve();
  });

  readStream.on('error', function (error) {
    deferred.reject(error);
  });

  try {
    readStream.pipe(file);
  } catch (error) {
    deferred.reject(error);
  }

  return deferred.promise;
}

function downloadFile(fileUrl, filename) {
  var file,
      path = defaultDir + filename,
      request,
      deferred = q.defer();

  file = fs.createWriteStream(path);

  request = http.get(fileUrl, function (response) {
    response
        .on('data', function (data) {
          file.write(data);
        })
        .on('end', function () {
          file.end();
          deferred.resolve();
        })
        .on('error', function (error) {
          file.end();
          deferred.reject(error);
        });
  });

  request.setTimeout(10000, function () {
    deferred.reject(new Error('Timeout error downloading file'));
  });

  request.on('error', function (error) {
    deferred.reject(error);
  });

  request.end();

  return deferred.promise;
}

function mediaFiles() {
  var list;

  list = fs.readdirSync(defaultDir);

  list = list.filter(function (elem) {
    return elem.match(/^.*\.(jpg|mov|mp4)$/i);
  });

  return list;
}

module.exports = {
  getPosts: getPosts,
  processPosts: processPosts,
  downloadMediaFiles: downloadMediaFiles,
  mediaFiles: mediaFiles
}