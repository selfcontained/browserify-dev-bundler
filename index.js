var Bundler = require('./lib/bundler'),
    browserify = require('browserify');

var bundler = module.exports = function(config) {

    return new Bundler(config);
};

// expose browserify lib
bundler.browserify = browserify;
