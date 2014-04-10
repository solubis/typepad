var async = require('async'),
    client = require('node-rest-client'),
    dom = require('cheerio'),
    fs = require('fs'),
    url = require('url'),
    http = require('http'),
    ytdl = require('ytdl'),

    database = require('./database');

var downloadDir = './downloads/',
    blogId = '6a0133f3ab24c2970b0133f3ab24e3970b',
    restClient = new client.Client(),
    db = new database.Database('localhost', 27017);


function downloadYouTube(videoUrl) {
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

  options = {
    filter: function (format) {
      return format.container === 'mp4';
    }
  };

  try {
    ytdl(url, options)
        .pipe(fs.createWriteStream('./downloads/' + id + '.mp4'));

  } catch (error) {
    console.log(error);
  }
}

function downloadFile(type, fileUrl) {
  var fileName,
      file,
      options;

  options = {
    host: url.parse(fileUrl).host,
    port: 80,
    path: url.parse(fileUrl).pathname
  };

  fileName = type + '_' + url.parse(fileUrl).pathname.split('/').pop();
  file = fs.createWriteStream(downloadDir + fileName);

  http.get(options, function (response) {
    response
        .on('data', function (data) {
          file.write(data);
        })
        .on('end', function () {
          file.end();
          console.log(fileName + ' downloaded to ' + downloadDir);
        });
  });
}

function getPosts() {
  var processed = 0,
      total = 0;

  async.doWhilst(
      function (callback) {
        console.log('--------------');

        getPostsPage(processed + 1, function (resultSize, batchSize) {

          console.log('Callback from getPostsPage with : ' + resultSize + ',' + batchSize);

          if (resultSize instanceof Error) {
            return callback(resultSize);
          }
          processed += batchSize;
          total = resultSize;

          return callback();
        });
      },
      function () {
        console.log(processed + '/' + total);

        return processed < total;
      },
      function (error) {
        console.log('***************');

        if (error) {
          console.log('ERROR - Finish doWhilst with Error:' + error);
        }
        else {
          console.log('SUCCESS - Finish doWhilst');
        }
      }
  );
}

function getPostsPage(start, callback) {
  var url;

  console.log("getPosts from " + start);

  url = 'http://api.typepad.com/blogs/' + blogId + '/post-assets.json?start-index=' + start;

  restClient.get(url, function (result) {
    if (result instanceof Error) {
      console.log('Retrying after error.........');
      this.retry(5000); // try again after 5 sec
      return callback(result);

    } else {

      console.log('onComplete for start: ' + start + ' with : ' + result.entries.length + '(' + result.totalResults + ')');

      console.log(result);

      processResult(result);

      return callback(result.totalResults, result.entries.length);
    }
  });
}


function processResult(result) {
  result.entries.forEach(function (item) {
        var hasMediaLinks = false;
        var post = {};

        post.title = item.title;
        post.published = item.published;

        item.embeddedVideoLinks.forEach(function (item) {
          if (item.embedCode) {
            var content = dom.load(item.embedCode);
            var iframe = content('iframe');
            var embed = content('embed');

            hasMediaLinks = true;

            if (embed.length > 0) {
              post.url = embed[0].attribs.src;
            } else if (iframe.length > 0) {
              post.url = iframe[0].attribs.src;
            }
          }

          if (post.url && post.url.indexOf("youtube") > 0) {
            post.type = "youtube";
          } else {
            post.type = 'video';
          }
        });

        item.embeddedImageLinks.forEach(function (item) {
          if (item.url) {
            hasMediaLinks = true;
            post.type = 'image';
            post.url = item.url;
          }
        });

        if (!hasMediaLinks) {
          var content = dom.load(item.content);
          var a = content('a');

          if (a.length) {
            post.type = 'video';
            post.url = a[0].attribs.href;
          }
        }

      }
  );
}

getPosts();