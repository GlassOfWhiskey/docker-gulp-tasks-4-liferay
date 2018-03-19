'use strict';

var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var plugins = require('gulp-load-plugins')();
var lfrThemeConfig = require('liferay-theme-tasks/lib/liferay_theme_config');
var themeUtil = require('liferay-theme-tasks/lib/util');
var gutil = plugins.util;
var livereload = plugins.livereload;
var themeConfig = lfrThemeConfig.getConfig(true);
var execSync = require('child_process').execSync;

module.exports = function(options) {
	
	var gulp = options.gulp;
	var store = gulp.storage;
	var pathBuild = options.pathBuild;
	var pathSrc = options.pathSrc;
	var runSequence = require('run-sequence').use(gulp);
	var argv = options.argv;

	gulp.task('deploy:css-files', function() {
		
		gutil.log('Gulp deploy:css-files task overridden by liferay-docker-gulp-tasks hook module');
		
		var version = themeConfig.liferayTheme.version;
		var srcPath = path.join(pathBuild, 'css/*.css');
		var filePath = store.get('changedFile').path;

		if (version === '6.2' && !themeUtil.isSassPartial(filePath)) {
			
			var fileName = path.basename(filePath);

			srcPath = path.join(pathBuild, 'css', fileName);
		}

		return fastDeploy(srcPath, pathBuild);
	});

	gulp.task('deploy:file', function() {
		
		gutil.log('Gulp deploy:file task overridden by liferay-docker-gulp-tasks hook module');
		
		var changedFile = store.get('changedFile');

		return fastDeploy(changedFile.path, pathSrc);
	});

	gulp.task('deploy:folder', function() {
		
		gutil.log('Gulp deploy:folder task overridden by liferay-docker-gulp-tasks hook module');
		
		var changedFile = store.get('changedFile');
		var relativeFilePath = path.relative(path.join(process.cwd(), pathSrc), changedFile.path);
		var filePathArray = relativeFilePath.split(path.sep);
		var rootDir = filePathArray.length ? filePathArray[0] : '';

		return fastDeploy(path.join(pathBuild, rootDir, '**/*'), pathBuild);
	});

	function fastDeploy(srcPath, basePath) {
		
		var fastDeployPaths = getFastDeployPaths();	
		var webBundleDirName = '.web_bundle_build';
		var dockerThemesDir = options.dockerThemesDir || '/tmp/themes';
		var dockerThemePath = path.join(dockerThemesDir, getThemeFolderName());
		var dockerBundleDirPath = path.join(dockerThemePath, webBundleDirName).split(path.sep).join('/');
		var dockerContainerName = options.dockerContainerName;
		
		var stream = gulp.src(srcPath, {
			base: basePath
		})
			.pipe(plugins.debug())
			.pipe(gulp.dest(fastDeployPaths.dest));

		if (fastDeployPaths.tempDest) {
			stream.pipe(gulp.dest(fastDeployPaths.tempDest));
		}
		
		stream.pipe(gutil.buffer(function(err, files) {
			for(let file of files) {
			    var filePath = file.path
					.substring(fastDeployPaths.dest.length)
					.split(path.sep).join('/');
				var dockerFilePath = path.join(dockerBundleDirPath, filePath);
				
				execSync('docker cp ' + file.path + ' ' + dockerContainerName + ':' + dockerFilePath);
				livereload.changed(`/${themeConfig.name}${filePath}`);
			}
	  	}));

		return stream;
	}

	function getFastDeployPaths() {
		var fastDeployPaths = {
			dest: store.get('appServerPathPlugin')
		};

		var tempDirPath = path.join(fastDeployPaths.dest, '../../temp/');

		var tempThemeDir;

		if (fs.existsSync(tempDirPath) && fs.statSync(tempDirPath).isDirectory()) {
			var themeName = getThemeFolderName();

			var tempDir = fs.readdirSync(tempDirPath);

			tempThemeDir = _.find(tempDir, function(fileName) {
				return fileName.indexOf(themeName) > -1;
			});
		}

		fastDeployPaths.tempDest = tempThemeDir;

		return fastDeployPaths;
	}
	
	function getThemeFolderName() {
		
		var themeFolderName = store.get('themeName');
		
		if(!themeFolderName) {
				
			themeFolderName = store.get('pluginName');
		}
		
		if(!themeFolderName) {
				
			themeFolderName = themeConfig.name;
		}
		
		return themeFolderName;
	}
};