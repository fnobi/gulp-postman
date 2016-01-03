var path = require('path');

var gulp = require('gulp');
var through = require('through2');
var gutil = require('gulp-util');
var frontMatter = require('gulp-front-matter');
var marked = require('marked');
var _ = require('lodash');

var PLUGIN_NAME = 'gulp-postman';

module.exports = function (opts) {
    opts = opts || {};

    var posts = opts.posts;
    var template = opts.template;

    var locals = opts.locals || {};
    var metaProperty = opts.metaProperty || 'meta';
    var bodyProperty = opts.bodyProperty || 'body';
    var frontMatterProperty = opts.frontMatterProperty || 'frontMatter';
    var archiveProperty = opts.archiveProperty || 'archive';
    var markedOpts = opts.markedOpts || {
        breaks: true
    };

    var base;
    var files = [];

    if (!template) {
        this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'no template'));
    }

    var templateSource = require('fs').readFileSync(template, 'utf8');

    function transform(file, encoding, callback) {
        if (!base) {
            base = file.base;
        }
        
        // postの元になるテンプレートは、そのままでは使用しない
        if(!path.relative(template, file.path)) {
            return callback();
        }

        file.data = locals;
        files.push(file);
        
        return callback();
    }

    function flush(callback) {
        var archive = [];
        
        gulp.src(posts)
            .pipe(frontMatter({
                property: frontMatterProperty,
                remove: true
            }))
            .pipe(through.obj(function (file, encode, callback) {
                var convertPath = path.resolve(path.join(
                    path.dirname(template),
                    path.basename(file.path, '.md') + path.extname(template)
                ));
                
                var post = new gutil.File({
                    cwd: '.',
                    base: base,
                    path: convertPath
                });

                var meta = file[frontMatterProperty] || {};
                meta.slug = path.basename(file.path, '.md');
                
                post.contents = new Buffer(templateSource);
                post.data = _.clone(locals);
                post.data[metaProperty] = meta;
                post.data[bodyProperty] = marked(file.contents.toString(), markedOpts);
                files.push(post);
                
                archive.push(meta);
                
                callback();
            }, function (cb) {
                files.forEach(function (file) {
                    file.data[archiveProperty] = archive;
                    this.push(file);
                }.bind(this));
                cb();
                callback();
            }.bind(this)));
    }

    return through.obj(transform, flush);
};
