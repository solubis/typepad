var q = require('q'),
    flickr = require('flickrapi'),
    config = require('./config');

var options = {
  api_key: config.api_key,
  secret: config.secret,
  permissions: config.permissions
};

q.nfcall(flickr.authenticate, options)
    .then(function (api) {
      config.user_id = api.options.user_id;
      config.access_token = api.options.access_token;
      config.access_token_secret = api.options.access_token_secret;

      config.save();

      console.log('Saved config, you can kill process if it is hanging');
    })
    .catch(function (error) {
      console.log(error);
    })
    .done();