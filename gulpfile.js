var gulp = require('gulp'),
	angularFilesort = require('gulp-angular-filesort'),
	connect = require('gulp-connect'),
	uglify = require('gulp-uglify'),
	concat = require('gulp-concat'),
	del = require('del'),
	mainBowerFiles = require('main-bower-files'),
    inject = require('gulp-inject'),
    sass = require('gulp-sass'),
    plugins = require('gulp-load-plugins')(),
    htmlbuild = require('gulp-htmlbuild/lib'),
    es = require('event-stream'),
    minifyCss = require('gulp-minify-css');
 
gulp.task('webserver', function() {
	connect.server({
    	livereload: true,
    	port : 5000
  	});
});
 

gulp.task('html', function () {
  	gulp.src('./*.html')
    .pipe(connect.reload());
});
gulp.task('views', function () {
  	gulp.src('./views/*.html')
    .pipe(connect.reload());
});
gulp.task('js', function () {
  	gulp.src(['./script/*.js','./script/*.*.js'])
    .pipe(connect.reload());
});

gulp.task('sass', function () {
  gulp.src(['./sass/reset.scss', './sass/emo.scss', './sass/main.scss', './sass/media.scss'])
    .pipe(sass().on('error', sass.logError))
    .pipe(concat('style.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest('./css'))
    .pipe(connect.reload());
});

gulp.task('watch', function() {
	gulp.watch('./sass/*.scss', ['sass']);
	gulp.watch(['./script/*.js', './script/*.*.js'], ['js']);
	gulp.watch('./views/*.html', ['views']);
    gulp.watch('./*.html', ['html']);
})

gulp.task('move', function() {
	gulp.src(['./views/*.*'])
	.pipe(gulp.dest('./dist/views/'));
	gulp.src(['./fonts/*.*'])
	.pipe(gulp.dest('./dist/fonts/'));
	gulp.src(['./img/*.*'])
	.pipe(gulp.dest('./dist/img/'));
	gulp.src(['./source/**'])
	.pipe(gulp.dest('./dist/source/'));
	gulp.src(['./proto/*.*'])
	.pipe(gulp.dest('./dist/proto/'));
})

var randomVersion = function(){
	var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return "";//"_"+text;
}();

gulp.task('htmlbuild', function() { 

	var gulpSrc = function (opts) {
		var paths = es.through();
		var files = es.through();

		paths.pipe(es.writeArray(function (err, srcs) {
		gulp.src(srcs, opts).pipe(files);
		}));

		return es.duplex(paths, files);
	};
	var jsBuild = es.pipeline(
	  plugins.concat('vendors'+ randomVersion +'.js'),
	  gulp.dest('./dist/script')
	);
	var cssBuild = es.pipeline(
		plugins.concat('style'+ randomVersion +'.css'),
		gulp.dest('./dist/css')
	);

	var appStream = gulp.src(['./script/*.js', './script/*.*.js', './script/*/*.js'])
		.pipe(angularFilesort())
	  	.pipe(concat('app'+randomVersion+'.js')) 
	  	.pipe(uglify())
	  	.pipe(gulp.dest('./dist/script'));

    return gulp.src('./index.html')
		.pipe(htmlbuild({

		    js: htmlbuild.preprocess.js(function (block) {
        
		        block.pipe(gulpSrc())
		          .pipe(jsBuild);
		        
		        block.end('script/vendors'+ randomVersion +'.js');
		        
		    }),
			// build css with preprocessor 
			css: htmlbuild.preprocess.css(function (block) {
				block.pipe(gulpSrc()) 
				    .pipe(minifyCss()) 
		  			.pipe(cssBuild);

				block.end('css/style'+ randomVersion +'.css');
			}),

			// remove blocks with this target 
			remove: function (block) {
				block.end();
			},

			// add a template with this target 
			template: function (block) {
				es.readArray([
				  '<!--',
				  '  processed by htmlbuild (' + block.args[0] + ')',
				  '-->'
				].map(function (str) {
					return block.indent + str;
				})).pipe(block);
				}
			}))
		.pipe(gulp.dest('./dist'))
		.pipe(inject(appStream, {name: 'customer', relative:true}))
		.pipe(gulp.dest('./dist'));

});

gulp.task('inject', function() { 

	/*var vendorStream = gulp.src(mainBowerFiles())
		.pipe(concat('vendors_'+randomVersion+'.js'))
		.pipe(uglify())
		.pipe(gulp.dest('./dist/script'));*/

	// Concatenate AND minify app sources 
	var appStream = gulp.src(['./script/*.js', './script/*.*.js', './script/*/*.js'])
		.pipe(angularFilesort())
	  	.pipe(concat('app'+randomVersion+'.js'))
	  	.pipe(uglify())
	  	.pipe(gulp.dest('./dist/script'));

    return gulp.src('./index.html')
		//.pipe(inject(es.merge(vendorStream, appStream)))
		//.pipe(gulp.dest('./dist'));
		// .pipe(inject(es.merge(
		// 	vendorStream
		// )), {starttag: '<!-- bower:js -->', name: 'bower'})
		//.pipe(inject(vendorStream, {name: 'bower', relative:true,}))
		.pipe(inject(appStream, {name: 'customer'}))
		.pipe(gulp.dest('./'));

});

gulp.task('clean', function(cb) {
	// You can use multiple globbing patterns as you would with `gulp.src`
  	del(['./dist/'], cb);
});

gulp.task('default', ['webserver', 'sass', 'watch']);

gulp.task('build', ['htmlbuild',  'move']);