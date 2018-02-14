'use strict';

var _ = require('lodash');
var path = require('path');
var livereload = require('gulp-livereload');
var plugins = require('gulp-load-plugins')();
var gutil = plugins.util;
var lfrThemeConfig = require('liferay-theme-tasks/lib/liferay_theme_config.js');
var themeConfig = lfrThemeConfig.getConfig();
var DockerWatchSocket = require('../lib/docker_watch_socket.js');
var execSync = require('child_process').execSync;

var CONNECT_PARAMS = {
	port: 11311
};

module.exports = function(options) {
	
	var gulp = options.gulp;
	var store = gulp.storage;
	var runSequence = require('run-sequence').use(gulp);
	var webBundleDirName = '.web_bundle_build';
	var dockerThemesDir = options.dockerThemesDir || '/tmp/themes';
	var dockerThemePath = path.join(dockerThemesDir, store.get('themeName'));
	var webBundleDir = path.join(process.cwd(), webBundleDirName);
	var connectParams = _.assign({}, CONNECT_PARAMS, options.gogoShellConfig);
	var dockerContainerName = options.dockerContainerName;
	var argv = options.argv;
	var fullDeploy = (argv.full || argv.f);
	var pathSrc = options.pathSrc;
	var staticFileDirs = ['images', 'js'];
	
	gulp.task('watch', function() {
		options.watching = true;
		
		gutil.log('Gulp watch task overridden by liferay-docker-gulp-tasks hook module');
		
		if (themeConfig.version === '6.2') {
			startWatch();
		}
		else {
			store.set('appServerPathPlugin', webBundleDir);

			runSequence('build', 'watch:clean', 'watch:osgi:clean', 'watch:docker:clean', 'watch:setup', 'watch:docker:copy', function(err) {
				if (err) {
					throw err;
				}

				var watchSocket = startWatchSocket();

				watchSocket.connect(connectParams)
					.then(function() {
						return watchSocket.deploy();
					})
					.then(function() {
						store.set('webBundleDir', 'watching');

						startWatch();
					});
			});
		}
	});
	
	gulp.task('watch:docker:clean', function() {
		
		var tempPath = path.join(dockerThemePath, 'temp').split(path.sep).join('/');
		var bundleDirPath = path.join(dockerThemePath, webBundleDirName).split(path.sep).join('/');
		
		execSync('docker exec --user="root" ' + dockerContainerName + ' rm -rf ' + tempPath + ' ' + bundleDirPath);
	});
	
	gulp.task('watch:docker:copy', function() {
		
		var localPath = webBundleDir + path.sep + '.';
		var tempPath = path.join(dockerThemePath, 'temp').split(path.sep).join('/') + '/';
		var bundleDirPath = path.join(dockerThemePath, webBundleDirName).split(path.sep).join('/') + '/';
		
		execSync('docker exec ' + dockerContainerName + ' mkdir -p ' + tempPath + ' ' + bundleDirPath);
		execSync('docker cp ' + localPath + ' ' + dockerContainerName + ':' + tempPath);
		execSync('docker exec ' + dockerContainerName + ' /bin/cp -rf ' + tempPath + '. ' + bundleDirPath);
		execSync('docker exec --user="root" ' + dockerContainerName + ' rm -rf ' + tempPath);
	});

	function clearChangedFile() {
		store.set('changedFile');
	}	
	
	function getTaskArray(rootDir, defaultTaskArray) {
		var taskArray = defaultTaskArray || [];

		if (staticFileDirs.indexOf(rootDir) > -1) {
			taskArray = ['deploy:file'];
		}
		else if (rootDir === 'WEB-INF') {
			taskArray = ['build:clean', 'build:src', 'build:web-inf', 'deploy:folder'];
		}
		else if (rootDir === 'templates') {
			taskArray = ['build:src', 'build:themelet-src', 'build:themelet-js-inject', 'deploy:folder'];
		}
		else if (rootDir === 'css') {
			taskArray = [
				'build:clean',
				'build:base',
				'build:src',
				'build:themelet-src',
				'build:themelet-css-inject',
				'build:rename-css-dir',
				'build:prep-css',
				'build:compile-css',
				'build:move-compiled-css',
				'build:remove-old-css-dir',
				'deploy:css-files'
			];
		}

		return taskArray;
	}
	
	function startWatch() {
		clearChangedFile();

		livereload.listen();

		gulp.watch(path.join(pathSrc, '**/*'), function(vinyl) {
			store.set('changedFile', vinyl);

			var relativeFilePath = path.relative(path.join(process.cwd(), pathSrc), vinyl.path);

			var filePathArray = relativeFilePath.split(path.sep);

			var rootDir = filePathArray.length ? filePathArray[0] : '';

			var taskArray = ['deploy'];

			if (themeConfig.version !== '6.2') {
				taskArray = ['deploy:gogo'];
			}

			if (!fullDeploy && store.get('deployed')) {
				
				taskArray = getTaskArray(rootDir, taskArray);
			}

			taskArray.push(clearChangedFile);

			runSequence.apply(this, taskArray);
		});
	}
	
	function startWatchSocket() {
		var watchSocket = new DockerWatchSocket({
			webBundleDir: webBundleDirName,
			dockerThemePath: dockerThemePath
		});

		watchSocket.on('error', function(err) {
			if (err.code === 'ECONNREFUSED' || err.errno === 'ECONNREFUSED') {
				gutil.log(gutil.colors.yellow('Cannot connect to gogo shell. Please ensure local Liferay instance is running.'));
			}
		});

		return watchSocket;
	}
}