var path = require('path'),
    fs = require('fs'),
    express = require('express'),
    request = require('supertest'),
    DevBundler = require('../index'),
    assert = require('chai').assert;

describe('DevBundler', function() {

    var MAIN_SRC = /module\.exports = \'main\'/;

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

    it('should bundle a top level named file', function(done) {
        var app = express(),
            bundler = DevBundler({
                root: path.join(__dirname, 'files')
            });

        app.use(bundler.middleware());

        requestFile(app, '/main.js')
            .expect(MAIN_SRC)
            .end(done);
    });

    it('should bundle a nested index file', function(done) {
        var app = express(),
            bundler = DevBundler({
                root: path.join(__dirname, 'files')
            });

        app.use(bundler.middleware());

        requestFile(app, '/sub.js')
            .expect(/module\.exports = \'sub-index\'/)
            .end(done);
    });

    it('should bundle a nested file', function(done) {
        var app = express(),
            bundler = DevBundler({
                root: path.join(__dirname, 'files')
            });

        app.use(bundler.middleware());

        requestFile(app, '/sub/thing.js')
            .expect(/module\.exports = \'sub-thing\'/)
            .end(done);
    });

    it('should not bundle non-matched files', function(done) {
        var app = express(),
            bundler = DevBundler({
                root: path.join(__dirname, 'files')
            });

        app.use(bundler.middleware());

        request(app)
            .get('/main.css')
            .expect(404)
            .end(done);
    });

    it('should bundle a file with a single transform', function(done) {
        var app = express(),
            bundler = DevBundler({
                root: path.join(__dirname, 'files'),
                transforms: ['jadeify']
            });

        app.use(bundler.middleware());

        requestFile(app, '/sub/template.js')
            .expect(/<h1>sub-template<\/h1>/)
            .end(done);
    });

    it('should bundle a file with an transform defined as an array', function(done) {
        var app = express(),
            bundler = DevBundler({
                root: path.join(__dirname, 'files'),
                transforms: [ [{}, 'jadeify'] ]
            });

        app.use(bundler.middleware());

        requestFile(app, '/sub/template.js')
            .expect(/<h1>sub-template<\/h1>/)
            .end(done);
    });

    it('should return subsequent requests from cache', function(done) {
        var app = express(),
            bundler = DevBundler({
                root: path.join(__dirname, 'files')
            });

        app.use(bundler.middleware());

        requestFile(app, '/main.js')
            .expect(MAIN_SRC)
            .end(function() {
                requestFile(app, '/main.js')
                    .expect(MAIN_SRC)
                    .end(done);
            });
    });

    it('should bundle without watching a top level named file', function(done) {
        var app = express(),
            bundler = DevBundler({
                watchify: false,
                root: path.join(__dirname, 'files')
            });

        app.use(bundler.middleware());

        requestFile(app, '/main.js')
            .expect(MAIN_SRC)
            .end(done);
    });

    it('should update source when files changed', function(done) {
        this.timeout(3000);
        var app = express(),
            CHANGES_SRC = /module\.exports = \'changes\'/,
            INCLUDE_SRC = /module\.exports = \'included\'/,
            sourceFile = path.join(__dirname, 'files', 'changes', 'source.js'),
            tempFile = path.join(__dirname, 'files', 'changes', 'temp.js'),
            bundler = DevBundler({
                root: path.join(__dirname, 'files')
            });

        app.use(bundler.middleware());

        // get rid of temp file if it exists
        if(fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

        // copy source file
        fs.writeFileSync(
            tempFile,
            fs.readFileSync(sourceFile)
        );

        // slight delay, ensure bundler has file watch setup
        setTimeout(function() {

            // first request to file
            requestFile(app, '/changes/temp.js')
                .expect(CHANGES_SRC)
                .expect(function(res) {
                    if(INCLUDE_SRC.test(res.text)) return "contains updates";
                })
                .end(function(err) {
                    assert.isNull(err);

                    // listen for change - then make another request
                    bundler.on('new-source', function() {
                        // give bundler enough time to update
                        setTimeout(function() {
                            // ensure next request has updates
                            requestFile(app, '/changes/temp.js')
                                .expect(CHANGES_SRC)
                                .expect(INCLUDE_SRC)
                                .end(function(err, res) {
                                    assert.isNull(err);

                                    fs.unlink(tempFile, done);
                                });
                        }, 500);
                    });

                    // add a new require to file
                    setTimeout(fs.appendFileSync.bind(fs, tempFile, 'require("./included");'), 500);
                });
            }, 500);

    });

    function requestFile(app, path) {
        return request(app)
            .get(path)
            .expect('Content-Type', 'text/javascript')
            .expect('Cache-Control', 'no-cache')
            .expect(200);
    }

});
