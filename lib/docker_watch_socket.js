'use strict';

var _ = require('lodash');
var path = require('path');
var lfrThemeConfig = require('liferay-theme-tasks/lib/liferay_theme_config.js');
var themeConfig = lfrThemeConfig.getConfig(true);
var WatchSocket = require('liferay-theme-tasks/lib/watch_socket.js');

var DockerWatchSocket = function(config) {
	WatchSocket.call(this, config);
	
	config = config || {};
	
	this.dockerThemePath = config.dockerThemePath;
};

DockerWatchSocket.prototype = _.create(WatchSocket.prototype, {
	
	_installWebBundleDir: function() {
		
		return this.sendCommand(this._formatWebBundleDirCommand(
			this.dockerThemePath));
	},
	
	_formatWebBundleDirCommand: function(themePath) {
		var buildPath = path.join(themePath, this.webBundleDir);

		buildPath = '/' + buildPath.split(path.sep).join('/');
		
		buildPath = buildPath.replace(/\s/g, '%20');

		var themeName = themeConfig.name;
		
		return 'install webbundledir:file:/' + buildPath + '?Web-ContextPath=/' + themeName;
	}
});

module.exports = DockerWatchSocket;