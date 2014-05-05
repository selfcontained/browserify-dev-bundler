var Bundler = require('./lib/bundler');

module.exports = function(config) {

    return new Bundler(config);
};
