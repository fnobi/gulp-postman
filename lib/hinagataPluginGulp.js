"use strict";

var through = require('through2');
var gutil = require('gulp-util');

module.exports = function (opts) {
    opts = opts || {};

    function transform(file, encoding, callback) {
        console.log(file.path);
        this.push(file);
        callback();
    }

    function flush(callback) {
        callback();
    }

    return through.obj(transform, flush);
};
