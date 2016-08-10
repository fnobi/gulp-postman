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

    const markdown = opts.markdown;
    const postParams = opts.postParams;
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
    let templateData;

    function transform (file, encoding, callback) {
        if (!base) {
            base = file.base;
        }
        
        // postの元になるテンプレートは、そのままでは使用しない
        if(!path.relative(template, file.path)) {
            templateData = file.data;
            return callback();
        }

        file.data = _.assign({}, file.data, locals);
        files.push(file);
        
        return callback();
    };

    function flush (callback) {
        const archive = [];

        const packFiles = () => {
            files.forEach((file) => {
                file.data[archiveProperty] = archive;
                this.push(file);
            });
        };

        const createPostFile = (slug, meta, body='') => {
            const convertPath = path.resolve(path.join(
                path.dirname(template),
                slug + path.extname(template)
            ));
            
            const post = new gutil.File({
                cwd: '.',
                base: base,
                path: convertPath
            });

            meta.slug = slug;
            
            post.contents = new Buffer(templateSource);
            post.data = _.assign({}, templateData, locals);
            post.data[metaProperty] = meta;
            post.data[bodyProperty] = body;
            files.push(post);
                
            archive.push(meta);
        };
        
        if (postParams) {
            _.each(postParams, (meta, slug) => {
                createPostFile(slug, meta);
            });
            
            packFiles();
            callback();
            return;
        } else if (markdown) {
            gulp.src(markdown)
                .pipe(frontMatter({
                    property: frontMatterProperty,
                    remove: true
                }))
                .pipe(through.obj((file, encode, callback) => {
                    createPostFile(
                        path.basename(file.path, '.md'),
                        file[frontMatterProperty] || {},
                        marked(file.contents.toString(), markedOpts)
                    );
                    
                    callback();
                }, (cb) => {
                    packFiles();
                    cb();
                    callback();
                }));
        }
    };

    return through.obj(transform, flush);
};
