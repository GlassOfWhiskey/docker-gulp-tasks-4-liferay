# Docker Gulp Tasks For Liferay

> The docker-gulp-tasks-4-liferay module is intended for use with Yeoman generated [Liferay themes](https://github.com/liferay/generator-liferay-theme). In particular, it allows to use gulp watch features on the host machine when Liferay runs on a local container. Please refer to this [blog article](https://web.liferay.com/it/web/glassofwhiskey/blog/-/blogs/liferay-and-docker-dockerised-liferay-workspace) for more details.

## How to use

The `docker-gulp-tasks-4-liferay` module should be added as an hook module in your theme's gulpfile.js and in package.json's devDependencies. The `dockerContainerName` parameter is required.

```js
var gulp = require('gulp');
var liferayThemeTasks = require('liferay-theme-tasks');

liferayThemeTasks.registerTasks({
	gulp: gulp,
	hookModules: [ 'docker-gulp-tasks-4-liferay' ],
	dockerContainerName: 'liferay_docker_container_name'
});
```

### Options

#### dockerContainerName

type: `string`
required: `true`

The name of the Liferay container in which theme files should be deployed by `gulp watch` task.

#### dockerThemesDir

type: `string`
default: `/tmp/themes`

Determines a folder into the container into which files are syncronised by `gulp watch` task. In particular, `gulp watch` copies theme files into ${dockerThemesDir}/${themeName}/.web_bundle_build directory.