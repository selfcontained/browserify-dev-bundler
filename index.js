var Bundler = require('./lib/bundler');

var bundler = module.exports = function(config) {

    return new Bundler(config);
};
