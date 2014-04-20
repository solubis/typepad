var q = require('q'),
    fs = require('fs'),
    log = require('./logger'),
    defaultDir = require('./config').defaultDir;

function makeDir() {
  var promise;

  promise = q.nfcall(fs.mkdir, defaultDir)
      .catch(function (error) {
        if (error.errno !== 47) {
          throw error;
        }
      })

  return promise;
}

function saveJson(object, name, dir) {
  var promise,
      path = (dir || defaultDir) + name;

  log.debug('Saving JSON file : ' + name);

  if (!object) {
    throw new Error('Passed data is undefined');
  }

  promise = makeDir()
      .then(function () {
        return q.nfcall(fs.writeFile, path, JSON.stringify(object));
      })
      .then(function () {
        return object;
      })

  return promise;
}

function readJson(name, dir) {
  var promise,
      path = (dir || defaultDir) + name;

  log.debug('Reading JSON file : ' + name);

  promise = q.nfcall(fs.readFile, path, 'utf8')
      .then(function (data) {
        data = JSON.parse(data);

        return data;
      });

  return promise;
}

module.exports = {
  makeDir: makeDir,
  readJson: readJson,
  saveJson: saveJson
}