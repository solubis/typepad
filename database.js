var Db = require('mongodb').Db;
var Server = require('mongodb').Server;

Database = function (host, port) {
    this.db = new Db('posts', new Server(host, port, {safe: false}, {auto_reconnect: true}, {}), {w: 1});
    this.db.open(function () {});
};

Database.prototype.getCollection = function (callback) {
    this.db.collection('posts', function (error, collection) {
        if (error) callback(error);
        else callback(null, collection);
    });
};

Database.prototype.findAll = function (callback) {
    this.getCollection(function (error, collection) {
        if (error) callback(error)
        else {
            collection.find().toArray(function (error, results) {
                if (error) callback(error)
                else callback(null, results)
            });
        }
    });
};

Database.prototype.findById = function (id, callback) {
    this.getCollection(function (error, collection) {
        if (error) callback(error)
        else {
            collection.findOne({_id: collection.db.bson_serializer.ObjectID.createFromHexString(id)}, function (error, result) {
                if (error) callback(error)
                else callback(null, result)
            });
        }
    });
};

Database.prototype.save = function (posts, callback) {

    if (typeof callback !== 'function') {
        callback = function(){};
    }

    this.getCollection(function (error, collection) {
        if (error) callback(error)
        else {
            if (typeof(posts.length) == "undefined")
                posts = [posts];

            for (var i = 0; i < posts.length; i++) {
                debt = posts[i];
                debt.created_at = new Date();
            }

            collection.insert(posts, function () {
                callback(null, posts);
            });
        }
    });
};

// update
Database.prototype.update = function (id, post, callback) {
    this.getCollection(function (error, collection) {
        if (error) callback(error);
        else {
            collection.update(
                {_id: collection.db.bson_serializer.ObjectID.createFromHexString(id)},
                post,
                function (error, post) {
                    if (error) callback(error);
                    else callback(null, post)
                });
        }
    });
};

//delete
Database.prototype.delete = function (id, callback) {
    this.getCollection(function (error, collection) {
        if (error) callback(error);
        else {
            collection.remove(
                {_id: collection.db.bson_serializer.ObjectID.createFromHexString(id)},
                function (error, post) {
                    if (error) callback(error);
                    else callback(null, post)
                });
        }
    });
};

exports.Database = Database;