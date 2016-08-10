gulp-postman
==============

gulp postman plugin.

## install

### from npm

```
npm install gulp-postman
```

### from github

```
git clone git://github.com/fnobi/gulp-postman.git
```

## usage

ejs sample.

```
gulp.task 'html', ->
  gulp.src "ejs/*.ejs"
    .pipe postman
      markdown: "posts/*.md"
      template: "ejs/article.ejs"
    .pipe ejs()
    .pipe gulp.dest "htdocs"
```
