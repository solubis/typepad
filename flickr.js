var fs = require('fs'),
    q = require('q'),
    flickr = require('flickr-with-uploads'),
    config = require('./config');

var api = flickr(
    config.api_key,
    config.secret,
    config.access_token,
    config.access_token_secret
);

function upload(media) {
  var options,
      stream,
      path = config.defaultDir + media.filename,
      promise;

  media.posted = media.posted || new Date().getTime() / 1000;
  stream = fs.createReadStream(path);

  options = {
    method: 'upload',
    title: media.title,
    description: '',
    is_public: 0,
    is_friend: 1,
    is_family: 1,
    safety_level: 2,
    hidden: 2,
    photo: stream
  };

  promise = q.nfcall(api, options)
      .then(function (response) {
        var options;

        options = {
          method: 'flickr.photos.setDates',
          photo_id: response['photoid']._content,
          date_posted: media.posted,
          date_taken: media.taken
        };

        return q.nfcall(api, options);
      });

  return promise;
}

module.exports = {
  upload: upload
}
