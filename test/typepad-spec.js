var typepad = require('../typepad'),
    utils = require('../utils'),
    config = require('../config');

describe('Typepad Downloader :', function () {
  var noOfPosts = config.limit;

  jasmine.getEnv().defaultTimeoutInterval = 500000;

  it('write and read config file', function () {
    expect(config).toBeDefined();
    expect(config.blog).toEqual('6a0133f3ab24c2970b0133f3ab24e3970b');

    config.save();
  });

  it('write and read JSON file', function (done) {
    var data = { name: 'test'},
        file = 'test.json',
        object,
        error;

    utils.saveJson(data, file)
        .then(function () {
          return utils.readJson(file)
        })
        .then(function (result) {
          return object = result;
        })
        .catch(function (e) {
          return error = e;
        })
        .finally(function () {
          done();

          expect(error).toBeUndefined();
          expect(object).toBeDefined();
          expect(object.name).toEqual('test');
        });
  });

  it("write and read JSON file with arrays of objects", function (done) {
    var data = [
          { string: '1'},
          { number: 2},
          { object: {name: 'object'}}
        ],
        file = 'test.json',
        object,
        error;

    utils.saveJson(data, file)
        .then(function () {
          return utils.readJson(file)
        })
        .then(function (result) {
          return object = result;
        })
        .catch(function (e) {
          return error = e;
        })
        .finally(function () {
          done();

          expect(error).toBeUndefined();
          expect(object).toBeDefined();
          expect(object[0].string).toEqual('1');
          expect(object[1].number).toEqual(2);
          expect(object[2].object.name).toEqual('object');
        });
  });

  it("get posts", function (done) {
    var entries,
        error;

    typepad.getPosts(noOfPosts)
        .then(function (result) {
          entries = result;
        })
        .catch(function (e) {
          error = e;
        })
        .finally(function () {
          done();

          expect(error).toBeUndefined();
          expect(entries).toBeDefined();
          expect(entries.length).toEqual(noOfPosts);
          expect(entries[0]['author']['displayName']).toEqual('Yoorek');
        });
  });

  it("save posts to file", function (done) {
    var entries,
        error;

    typepad.getPosts(noOfPosts)
        .then(function (entries) {
          return utils.saveJson(entries, 'blog.json');
        })
        .then(function () {
          return utils.readJson('blog.json');
        })
        .then(function (result) {
          entries = result;
        })
        .catch(function (e) {
          error = e;
        })
        .finally(function () {
          done();

          expect(error).toBeUndefined();
          expect(entries).toBeDefined();
          expect(entries.length).toEqual(noOfPosts);
          expect(entries[0]['author']['displayName']).toEqual('Yoorek');
        });
  });

  it("process posts", function (done) {
    var media,
        error;

    typepad.getPosts(noOfPosts)
        .then(function (entries) {
          return typepad.processPosts(entries);
        })
        .then(function (result) {
          media = result;

          return utils.saveJson(result, 'blog.json');
        })
        .catch(function (e) {
          console.error(e);
          error = e;
        })
        .finally(function () {
          done();

          expect(error).toBeUndefined();
          expect(media).toBeDefined();
          expect(media[0].taken).toBeDefined();
          expect(media[0].title).toBeDefined();
          expect(media[0].filename).toBeDefined();
          expect(media[0].url).toBeDefined();

          expect(media).not.toContain(null);
        });
  });

  it("download media files", function (done) {
    var media,
        error;

    typepad.getPosts(noOfPosts)
        .then(function (entries) {
          return typepad.processPosts(entries);
        })
        .then(function (result) {
          var promise;

          media = result;

          promise =
              typepad.downloadMediaFiles(result)
                  .catch(function (e) {
                    console.error('downloadMediaFiles error - ' + e);
                  })
                  .then(function () {
                    return utils.saveJson(result, 'blog.json');
                  });

          return promise;
        })
        .then(function () {
          done();
        })
        .catch(function (e) {
          console.error('Test error : ' + e);
          error = e;
        })
        .finally(function () {
          expect(error).toBeUndefined();
          expect(media).toBeDefined();
          expect(media[0].taken).toBeDefined();
          expect(media[0].title).toBeDefined();
          expect(media[0].filename).toBeDefined();
          expect(media[0].url).toBeDefined();
          expect(media).not.toContain(null);
          expect(media.length).toEqual(typepad.mediaFiles().length);
        });
  });
});   