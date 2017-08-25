'use strict';

const gulp        = require('gulp');
const del         = require('del');
const util        = require('gulp-util');
const sass        = require('gulp-sass');
const sourcemaps  = require('gulp-sourcemaps');
const prefixer    = require('gulp-autoprefixer');
const uglify      = require('gulp-uglify');
const concat      = require('gulp-concat');
const rename      = require('gulp-rename');
const handlebars  = require('gulp-compile-handlebars');
const browserSync = require('browser-sync');
const ghPages     = require('gulp-gh-pages');
const sassGlob    = require('gulp-sass-bulk-import');
const watch       = require('gulp-watch');
const babel       = require('gulp-babel');
const exec        = require('child_process').exec;


const path = require('path');
var config = {
  development: !!util.env.development
};

var paths = {
  src: { root: 'src' },
  dist: { root: 'dist' },
  temp: { root: 'temp' },
  init: function() {

    // Source Files
    this.src.sass        = this.src.root + '/scss/main.scss';
    this.src.templates   = this.src.root + '/**/*.hbs';
    this.src.images      = this.src.root + '/images/**/*.{jpg,jpeg,svg,png,gif}';
    this.src.files       = this.src.root + '/*.{html,txt}';

        // Vendor JS Files - add each vendor file here
        this.src.libs        = [
          this.src.root + '/js/libs/*.js',
          path.resolve("node_modules/bootstrap-sass/assets/javascripts/bootstrap.js"),
        ];
        // path.resolve("node_modules/imagesloaded/imagesloaded.pkgd.min.js"),
        // path.resolve("node_modules/isotope-layout/dist/isotope.pkgd.min.js"),
        // path.resolve("node_modules/isotope-packery/packery-mode.pkgd.min.js"),

        // Font Files - add each vendor file here
        this.src.fonts       = [
          this.src.root + '/fonts/**/*.{eot,svg,ttf,woff,woff2,otf}',
          path.resolve("node_modules/font-awesome/fonts/fontawesome-webfont.eot"),
          path.resolve("node_modules/font-awesome/fonts/fontawesome-webfont.svg"),
          path.resolve("node_modules/font-awesome/fonts/fontawesome-webfont.ttf"),
          path.resolve("node_modules/font-awesome/fonts/fontawesome-webfont.woff"),
          path.resolve("node_modules/font-awesome/fonts/fontawesome-webfont.woff2"),
          path.resolve("node_modules/font-awesome/fonts/FontAwesome.otf"),
        ];

        // JS Files
        this.src.javascript  = this.src.root + '/js/*.js';

    // Distribution
    this.dist.css        = this.dist.root + '/css';
    this.dist.images     = this.dist.root + '/images';
    this.dist.fonts      = this.dist.root + '/fonts';
    this.dist.javascript = this.dist.root + '/js';
    this.dist.libs       = this.dist.root + '/js/libs';

    return this;
  },
}.init();

gulp.task('serve', () => {
  browserSync.init({
    server: {
      baseDir: [paths.dist.root]
    },
    open: false,
    notify: false,

    // Whether to listen on external
    online: false,
  });
});

gulp.task('styles', () => {
  gulp.src([paths.src.sass])
    .pipe(sassGlob())
    .on('error', util.log)
    .pipe(sourcemaps.init())
    .pipe(sass({
      includePaths: ['src/scss'],
      includePaths: ['node_modules'],
    })
    .on('error', sass.logError))
    .pipe(config.development ? sourcemaps.write({includeContent: false, sourceRoot: './scss'}) : util.noop())
    .on('error', util.log)
    .pipe(prefixer('last 2 versions'))
    .on('error', util.log)
    .pipe(gulp.dest(paths.dist.css))
    .pipe(browserSync.reload({stream: true}));
});

/*
* Compile handlebars/partials into html
*/
gulp.task('templates', () => {
  var templateData = require('./src/data/data.json');
  var opts = {
    ignorePartials: true,
    batch: ['src/partials'],
  };

  gulp.src([paths.src.root + '/*.hbs'])
    .pipe(handlebars(templateData, opts))
    .on('error', util.log)
    .pipe(rename({
      extname: '.html',
    }))
    .on('error', util.log)
    .pipe(gulp.dest(paths.dist.root))
    .pipe(browserSync.reload({stream: true}));
});

/*
* Bundle all javascript files
*/
gulp.task('scripts', () => {
  gulp.src(paths.src.javascript)
    .pipe(babel({
      presets: ['es2015'],
    }))
    .pipe(concat('bundle.js'))
    .on('error', util.log)
    .pipe( config.development ? util.noop() : uglify() )
    .on('error', util.log)
    .pipe(gulp.dest(paths.dist.javascript))
    .pipe(browserSync.reload({stream: true}));

    /*
    * Uglify JS libs and move to dist folder
    */
    gulp.src(paths.src.libs)
      .pipe(gulp.dest(paths.dist.libs));
      // .pipe(browserSync.reload({stream: true}));
});

gulp.task('images', () => {
  gulp.src([paths.src.images])
    .pipe(gulp.dest(paths.dist.images));
});

gulp.task('files', () => {
  gulp.src([paths.src.files])
    .pipe(gulp.dest(paths.dist.root));
});

gulp.task('fonts', () => {
  gulp.src(paths.src.fonts)
    .pipe(gulp.dest(paths.dist.fonts));
});

watch(paths.src.images, () => {
  gulp.start('images');
});

watch(paths.src.files, () => {
  gulp.start('files');
});

watch(paths.src.fonts, () => {
  gulp.start('fonts');
});

gulp.task('watch', () => {
  gulp.watch('src/scss/**/*.scss', ['styles']);
  gulp.watch(paths.src.javascript, ['scripts']);
  gulp.watch(paths.src.templates, ['templates']);
});

gulp.task('deploy', () => {
  return gulp.src([paths.dist.root + '/**/*'])
    .pipe(ghPages());
});

gulp.task('createTemp', function() {
  exec("git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\,'", {maxBuffer: 500*1024}, function(error, stdout, stderror){
    var branchName = /[^/]*$/.exec(arguments[1])[0].trim();
    gulp.src([paths.dist.root + '/**/*'])
      .pipe(gulp.dest('./temp/' + branchName));
  });
});

gulp.task('branchDeploy', function() {
  return gulp.src([paths.temp.root + '/**/*'])
    .pipe(ghPages({
      remove: false
    }));
});

gulp.task('delTemp', function() {
  return del('temp/**', {force:true});
});

gulp.task('markie', ['createTemp', 'branchDeploy']);
gulp.task('default', ['watch', 'serve', 'images', 'files', 'fonts', 'styles', 'scripts', 'templates']);
