'use strict';

var gulp = require('gulp'),
    runSequence = require('run-sequence'),
    browserSync = require('browser-sync'),
    gulp_watch = require('gulp-watch'),
    plumber = require('gulp-plumber'),
    clean = require('gulp-clean');
var log = require('fancy-log');

var hmWatch = require('./gulp/watch');
var handleErrors = require('./gulp/handle-errors'),
    util = require('./gulp/utils'),
    copy = require('./gulp/copy'),
    inject = require('./gulp/inject'),
    buildStyle = require('./gulp/build-style'),
    merge = require('./gulp/merge'),
    minify = require('./gulp/minify'),
    manifestHelper = require('./gulp/manifest-helper'),
    config = require('./gulp/config');

gulp.task('inject-index', inject.index);
gulp.task('inject-home', inject.homeModule);
gulp.task('inject-states', inject.states);

gulp.task('build-styles', buildStyle.buildStylesByFolders);

gulp.task('merge-css', merge.mergeCssByModule);
gulp.task('merge-component', merge.mergeComponentsByModule);
gulp.task('merge-service', merge.mergeServicesByModule);
gulp.task('merge-state', merge.mergeAllStates);

gulp.task('copy-modules', copy.copyByModule);
gulp.task('copy-assets', copy.copyAssets);
gulp.task('copy-tmp-rev', copy.copyTmpRev);
gulp.task('copy-index', copy.copyIndex);
gulp.task('copy-changed-rev', copy.copyChangedRev);
gulp.task('copy-changed-dist', copy.copyChangedDist);

gulp.task('rev-modules', minify.revModules);
gulp.task('rev-components', minify.revComponent);
gulp.task('rev-states', minify.revState);
gulp.task('rev-replace-index', minify.revReplaceIndex);
gulp.task('rev-replace-html', minify.revReplaceHtml);

gulp.task('mvn-clean', function (cb) {
    var exec = require('child_process').exec;
    exec('mvn clean', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb && cb(err);
    });
});
gulp.task('clean-readonly', function (cb) {
    var exec = require('child_process').exec;
    var os = require('os');
    if (os.platform() === 'darwin') {
        exec('chmod -R 777 ' + configWrap.config.dist, function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            cb && cb(err);
        });
    } else {
        exec('attrib -r ' + configWrap.config.dist + ' /s', function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            cb && cb(err);
        });
    }

});

gulp.task('mvn-install', function (cb) {
    var exec = require('child_process').exec;
    exec('mvn install', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb && cb(err);
    });
});

gulp.task('clean-dist', function () {
    return gulp.src(configWrap.config.dist, {read: false})
        .pipe(plumber({errorHandler: handleErrors.reportError}))
        .pipe(clean());
});
gulp.task('clean-temp', function () {
    return gulp.src([configWrap.config.tmp], {read: false})
        .pipe(plumber({errorHandler: handleErrors.reportError}))
        .pipe(clean());
});
gulp.task('clean-temp-css', function () {
    var env = util.getEnv();
    var tmpCss = [];
    env.modules.forEach(function (m) {
        tmpCss.push(m.tmpPath + '/**/*.css');
        tmpCss.push('!' + m.tmpPath + '/**/*.all.css');

    });
    log('css to clean', tmpCss);
    return gulp.src(tmpCss)
        .pipe(plumber({errorHandler: handleErrors.reportError}))
        .pipe(clean());
});
gulp.task('clean-temp-state', function () {
    var tmpStates = [configWrap.config.tmp + '**/*.state.js', '!' + configWrap.config.tmp + 'app/app.all.state.js'];
    log('state to clean', tmpStates);
    return gulp.src(tmpStates)
        .pipe(plumber({errorHandler: handleErrors.reportError}))
        .pipe(clean());
});
gulp.task('clean-temp-rev', function () {
    return gulp.src([configWrap.config.tmp + 'rev'], {read: false})
        .pipe(plumber({errorHandler: handleErrors.reportError}))
        .pipe(clean());
});
gulp.task('clean-dist-app', function () {
    return gulp.src([configWrap.config.dist + 'app'], {read: false})
        .pipe(plumber({errorHandler: handleErrors.reportError}))
        .pipe(clean());
});


gulp.task('watch-assets-vender', hmWatch.assets_vender);
gulp.task('watch-dist', hmWatch.dist);
gulp.task('watch-module', hmWatch.module);
gulp.task('watch-normalJsHtml', hmWatch.normalJsHtml);
var start_dev_building = false;
var runWatchLoopCounter = 0;
gulp.task('watch-dev', function () {
    var changedCount = 1;
    var lastLoopTime;
    var lastWatchLoop;
    var watchTime = 1500;
    return gulp_watch(configWrap.config.tmp + 'app/**/*', function (f) {
        log('changedCount:', changedCount,'start_dev_building:', start_dev_building, f.path);
        if (start_dev_building) {
            return;
        }
        changedCount++;
        if (!lastLoopTime || new Date().getTime() - lastLoopTime > watchTime) {
            log('开始 run watch loop');
            lastWatchLoop = runWatchLoop();
        } else {
            if (lastWatchLoop) {
                log('清除上次计划', watchTime - (new Date().getTime() - lastLoopTime));
                clearTimeout(lastWatchLoop);
                lastWatchLoop = runWatchLoop();
            }
        }
    });

    function runWatchLoop() {
        lastLoopTime = new Date();
        log(watchTime,'毫秒后执行 build-dev');
        return setTimeout(function () {
            if (changedCount > 0) {
                runWatchLoopCounter++;
                start_dev_building = true;
                browserSync.needWait = true;
                log('开始执行 build-dev');
                changedCount = 1;
                gulp.start('build-dev');
            }
        }, watchTime);
    }
});

gulp.task('build-dev-done', function (cb) {//, ['clean-readonly']
    start_dev_building = false;
    log('browserSync.needWait',browserSync.needWait);
    runWatchLoopCounter--;
    if(runWatchLoopCounter<=0){
        browserSync.needWait = false;
    }
    cb && cb();
});


gulp.task('save-old-manifest', manifestHelper.saveOldManifest);
/**
 * 完整构建：
 * 1.  清空原先 dist 和tmp 目录
 * 2.  复制项目commonAssets
 * 3.  编译样式文件 到tmp目录
 * 4   合并 组件，样式
 * 5   清除 临时 样式文件
 */
gulp.task('build', function (cb) {
    runSequence(
        'mvn-clean',
        'clean-dist',
        'clean-temp',
        'copy-assets',

        'build-styles',
        'merge-css',
        'clean-temp-css',

        'merge-component',

        'merge-service',

        'copy-modules',

        'inject-index',
        'inject-home',
        'inject-states',
        'merge-state',
        'clean-temp-state',

        'rev-modules',
        'rev-components',
        'rev-states',
        'rev-replace-index',
        'copy-tmp-rev',
        'rev-replace-html',
        'clean-readonly',
        'mvn-install',
        cb);
});

gulp.task('build-dev', function (cb) {
    log('开始重新构建');
    runSequence(
        'save-old-manifest',
        'clean-temp-rev',
        'inject-index',
        'inject-home',
        'inject-states',
        'merge-state',
        'clean-temp-state',
        'rev-modules',
        'rev-components',
        'rev-states',
        'rev-replace-index',
        'copy-changed-rev',
        'rev-replace-html',
        'build-dev-done',
        cb);
});


gulp.task('start-browser-sync', function (cb) {

    var env = util.getEnv();
    var port = env.port;
    configWrap.config.proxyUrl = 'http://localhost:' + port + '/sims-gis-map-frontend/';
    configWrap.config.projectName = 'sims-gis-map-frontend';

    var get = require('simple-get');
    var maxTryTimes = 200;
    getHttpStatus();
    function getHttpStatus() {
        get(configWrap.config.proxyUrl, function (err, res) {
            // if (err) throw err;
            if ((err || res.statusCode !== 200) && maxTryTimes-- > 0) {
                setTimeout(getHttpStatus, 2000);
                if(res && res.statusCode === 404){
                    log('无法自动重启，请重新启动 tomcat');
                }else {
                    log('等待 tomcat启动中 。。');
                }
            } else {
                browserSync({
                    port: configWrap.config.port,
                    proxy: configWrap.config.proxyUrl
                });
                cb && cb();
            }
        });
    }
});

var demoConfig = require('./src/config-wrap');
gulp.task('temp', function (cb) {

    console.log('temp taks logged',demoConfig);
    cb();
});

gulp.task('build-watch', function (cb) {
    var argv = process.argv;
    if (!argv || !argv[2]) {
        console.error('用法：gulp --port \r\n如：gulp --8080');
        return;
    }
    runSequence('build', ['watch-module', 'watch-assets-vender', 'watch-normalJsHtml', 'watch-dist', 'watch-dev', 'start-browser-sync'], cb);
});


function buildAndWatch(cb){
    runSequence('build-watch', cb);
}

function build(cb){
    runSequence('temp',cb);
}

module.exports = {
    buildAndWatch:buildAndWatch,
    build:build
};