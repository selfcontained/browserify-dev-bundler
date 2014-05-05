var DevBundler = require('../index'),
    assert = require('chai').assert;

describe('DevBundler', function() {

    it('should require a root', function() {
        assert.throws(DevBundler);
    });

    it('should instantiate with a root', function() {
        var bundler = DevBundler({
            root: '/my/modules'
        });

        assert.isObject(bundler);
        assert.isFunction(bundler.middleware);
        assert.isFunction(bundler.bundle);
        assert.isFunction(bundler.createBundle);
        assert.isFunction(bundler.normalizeSource);
    });

    it('should return a middleware function', function() {
        var bundler = DevBundler({
            root: '/my/modules'
        });

        assert.isFunction(bundler.middleware());
    });

    it('should set source to error string if error is present', function() {
        var error = new Error('my error'),
            bundler = DevBundler({
                root: '/my/modules'
            });

        assert.equal(bundler.normalizeSource(error, 'module.exports={};'), error.toString());
    });

    it('should leave source alone if there is no error present', function() {
        var source = 'module.exports={};',
            bundler = DevBundler({
                root: '/my/modules'
            });

        assert.equal(bundler.normalizeSource(null, source), source);
    });

});
