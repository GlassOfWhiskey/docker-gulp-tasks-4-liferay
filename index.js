'use strict';

var globby = require('globby');
var path = require('path');

module.exports = function(gulp, options) {
	
	globby.sync(path.resolve(__dirname, 'tasks/**/*')).forEach(function(item) {
		require(item)(options);
	});
}