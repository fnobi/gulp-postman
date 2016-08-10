const path = require('path');

const gulp = require('gulp');
const through = require('through2');
const gutil = require('gulp-util');
const frontMatter = require('gulp-front-matter');
const marked = require('marked');
const _ = require('lodash');

const PLUGIN_NAME = 'gulp-postman';

module.exports = (opts) => {
    opts = opts || {};

    const posts = opts.posts;
    const template = opts.template;

    const locals = opts.locals || {};
    const metaProperty = opts.metaProperty || 'meta';
    const bodyProperty = opts.bodyProperty || 'body';
    const frontMatterProperty = opts.frontMatterProperty || 'frontMatter';
    const archiveProperty = opts.archiveProperty || 'archive';
    const markedOpts = opts.markedOpts || {
        breaks: true
    };

    let base;
    const files = [];

    if (!template) {
        this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'no template'));
    }

    const templateSource = require('fs').readFileSync(template, 'utf8');

    function transform (file, encoding, callback) {
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
    };

    function flush (callback) {
        const archive = [];
        
        gulp.src(posts)
            .pipe(frontMatter({
                property: frontMatterProperty,
                remove: true
            }))
            .pipe(through.obj((file, encode, callback) => {
                const convertPath = path.resolve(path.join(
                    path.dirname(template),
                    path.basename(file.path, '.md') + path.extname(template)
                ));
                
                const post = new gutil.File({
                    cwd: '.',
                    base: base,
                    path: convertPath
                });

                const meta = file[frontMatterProperty] || {};
                meta.slug = path.basename(file.path, '.md');
                
                post.contents = new Buffer(templateSource);
                post.data = _.clone(locals);
                post.data[metaProperty] = meta;
                post.data[bodyProperty] = marked(file.contents.toString(), markedOpts);
                files.push(post);
                
                archive.push(meta);
                
                callback();
            }, (cb) => {
                files.forEach((file) => {
                    file.data[archiveProperty] = archive;
                    this.push(file);
                });
                cb();
                callback();
            }));
    };

    return through.obj(transform, flush);
};
