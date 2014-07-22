var Bundler = require('./lib/bundler');

var bundler = module.exports = function(config) {

    return new Bundler(config);
};

// expose browserify lib
bundler.browserify = require('watchify').browserify;
