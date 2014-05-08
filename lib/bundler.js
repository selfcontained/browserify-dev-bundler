var path = require('path'),
    EventEmitter = require('events').EventEmitter,
    deap = require('deap'),
    watchify = require('watchify'),
    browserify = watchify.browserify;

var Bundler = module.exports = function(config) {
    this.cache = {};

    this.config = deap.updateShallow({
        root: null, // root directory for client-side js files
        watchify: true, // if watchify should be used - bundle source is cached when it is
        transforms: null, // an array of transforms
        debug: false, // browserify debug flag - generates sourcemaps if true
        // add files to bundle your own way by overriding this
        addFile: function(bundle, module, modulePath) {
            bundle.add(modulePath);
        },
        // browserify default options
        options: {
            insertGlobals: true,
            detectGlobals: false,
            noParse: []
        }
    }, config||{});

    if(!this.config.root) throw new Error('no root provided to Bundler');

    var self = this;

    // update local cache from watchify updates
    this.on('new-source', function(module, source) {
        if(self.config.watchify) self.cache[module] = source;
    });
};

Bundler.prototype = deap({

    //
    // Generate a middeware function
    // + moduleRegex - regex - used to match urls - requires the first capture group to be the module
    middleware: function(moduleRegex) {
        var self = this;

        moduleRegex = moduleRegex || /^(.+)\.js$/;

        return function(req, res, next) {
            var match = req.url.match(moduleRegex);
            if(!match) return next();

            var module= match[1];

            self.bundle(module, function(err, src) {
                res.setHeader('Content-Type', 'text/javascript');
                res.setHeader('Cache-Control', 'no-cache');

                // expost event to allow for custom headers
                self.emit('pre-response', err, res, module, src);

                res.send(src);
            });
        };
    },

    bundle: function(module, done) {
        // check for cached source if we're using watchify
        if(this.config.watchify && this.cache[module]) return done(null, this.cache[module]);

        // create bundle if it doesn't exist
        return this.createBundle(module, done);
    },

    createBundle: function(module, done) {
        var bundle,
            self = this,
            bundleOptions = { debug: this.config.debug },
            modulePath = path.join(this.config.root, module);

        // handle updates if we're using watchify
        if(this.config.watchify) {
            bundle = watchify(this.config.options)
                .on('update', function() {
                    // re-bundle on updates and update local src cache
                    bundle.bundle(bundleOptions, function(err, src) {
                        src = self.normalizeSource(err, src);

                        self.emit('new-source', module, src);
                    });
                });
        }else {
            bundle = browserify(this.config.options);
        }

        this.config.addFile(bundle, module, modulePath);

        (this.config.transforms||[]).forEach(function(transform) {
            if(Array.isArray(transform)) {
                bundle.transform.apply(bundle, transform);
            }else {
                bundle.transform(transform);
            }
        });

        this.emit('pre-bundle', bundle, module, modulePath);

        return bundle.bundle(bundleOptions, function(err, src) {
            src = self.normalizeSource(err, src);

            self.emit('new-source', module, src);

            done(err, src);
        });
    },

    normalizeSource: function(err, src) {
        if(err) {
            this.emit('bundle-error', err);
            src = err.toString();
        }

        return src;
    }

}, EventEmitter.prototype);
