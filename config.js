var fs = require('fs');

var file,
    config,
    path = process.cwd() + '/config.json';

file = fs.readFileSync(path);
config = JSON.parse(file);

module.exports = {
  "blog": config.blog,
  "api_key": config.api_key,
  "secret": config.secret,
  "permissions": config.permissions,
  "user_id": config.user_id,
  "access_token": config.access_token,
  "access_token_secret": config.access_token_secret,
  "defaultDir" : config.defaultDir,
  "limit": config.limit,

  "save": function(){
    fs.writeFileSync(path, JSON.stringify(this));
  }
};