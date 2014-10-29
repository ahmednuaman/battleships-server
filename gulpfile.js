var gulp = require('gulp'),
    istanbul = require('gulp-istanbul'),
    jscs = require('gulp-jscs'),
    jshint = require('gulp-jshint'),
    mocha = require('gulp-mocha'),
    plumber = require('gulp-plumber');

gulp.task('lint', function () {
  gulp.src([
    'lib/**/*.js',
    'test/**/*.js',
    '*.js'
  ])
    .pipe(plumber())
    .pipe(jscs())
    .pipe(jshint());
});

gulp.task('test', [
  'lint'
], function (done) {
  gulp.src([
    'lib/**/*.js',
    '*.js'
  ])
    .pipe(plumber())
    .pipe(istanbul())
    .on('finish', function () {
      gulp.src([
        'test/**/*.js'
      ])
        .pipe(plumber())
        .pipe(mocha())
        .pipe(istanbul.writeReports())
        .on('end', done);
    });
});

gulp.task('default', function () {
  gulp.watch([
    'lib/**/*.js',
    'test/**/*.js',
    '*.js'
  ], [
    'test'
  ]);
});
