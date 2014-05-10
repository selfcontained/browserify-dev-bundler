[![Build Status](https://secure.travis-ci.org/selfcontained/browserify-dev-bundler.png?branch=master)](http://travis-ci.org/selfcontained/browserify-dev-bundler)


browserify-dev-bundler
======================

On-demand browserify bundler middleware for development with watchify support

## Install

```bash
npm install browserify-dev-bundler
```

It's a dynamic browserify bundler via a middleware request handler that uses watchify internally to keep your bundles cached, and your response times *fast* in development.  You don't have to manage watchify tasks/processes, or temporary files since it's all on-demand via your http server.  As the name implies, this is meant for development environments, you should be building your browserify bundles for production, or something other than this.

## Examples

```javascript
var DevBundler = require('browserify-dev-bundler');

var bundler = DevBundler({
    root: '/path/to/my/modules'
});

// attach it an express app - intercepts *.js by default
app.use(bundler.middleware());

// request comes in for "/apps/main.js"

// response is browserified version of /path/to/my/modules/apps/main.js

// handle a prefixed js folder in the url
app.use('/js', bundler.middleware()); // let express handle it
app.use(bundler.middleware(/^\/js\/(.+)\.js/)); // or handle it w/ the bundler
```

## Moar configs

```javascript
var DevBundler = require('browserify-dev-bundler');

// create your bundler
var bundler = DevBundler({
    root: '/where/my/modules/are',
    watchify: true,
    transforms: ['jadeify'],
    debug: true,
    addFile: function(bundle, module, modulePath) {
        // i want my "apps" files requireable
        if(/^\/apps/.test(module)) {
            bundle.require(modulePath, { expose: module })
        }else {
            bundle.add(modulePath);
        }
    },
    options: {
        insertGlobals: true,
        detectGlobals: false,
        noParse: []
    }
});

// attach it to an express server

// by default it will intercept any *.js files, using the full path as the module name
app.use(bundler.middleware());

// you can override this to support your own url structures
app.use(bundler.middleware(/^\/js\/(.+)\.js$/));

// The first capture group of your regex is the module name used for the bundle
// in conjunction with the `root` config option
```

## `DevBundler(options)`

`options` config object supports the following:
+    `root` - required - root directory where you modules are located.
+    `watchify` - optional - defaults to true - enabled watchify support/caching
+    `transforms` - optional - Array of transforms to apply.  Each entry can be a single transform like you'd pass into `bundle.transform()`, or an `Array` that is applied against the transform function if you need to pass in options.
+    `debug` - defaults to false - sets `browserify` debug flag for sourcemaps.
+    `addFile` - optional function that receives the bundle, module name, and full module file path.  This provides a hook to add the top level file to your bundle however needed.  By default `bundle.addFile(modulePath)` is used.  If you prefer to `bundle.require(modulePath)` you can override this function and provide whatever logic you need.
+    `options` - optional configuration object passed into the `browserify()` or `watchify()` call.

## `events`

+    `pre-bundle` - [bundle, moduleName, modulePath] - prior to bundle call
+    `pre-response` - [error, response, moduleName, source] - prior to calling `send()` on the response
+    `new-source` - [moduleName, source] - whenever the source updates due to files changing.

```javascript
bundler = DevBundler({ root: '/my/modules' });

// add custom headers
bundler.on('pre-response', function(err, res, module, src) {
    res.setHeader('X-Module-Name', module);
});

// log source updates
bundler.on('new-source', function(module, src) {
    console.log('Source updated: ', module);
});

// manipulate browserify bundle directly
bundler.on('pre-bundle', function(bundle, module, modulePath) {
    // add my own transform manually
    bundle.transform('my-custom-transform');
    // add specific files
    bundle.add('some/random-file.js');
});
```

## Why did I build this?

#### standalone watchify

For small applications, a simple `watchify` command can usually cover what you need for development purposes.  Subsequent `bundle()` operations that occur as you update files are extremely fast due to it's ability to cache unchanged files.  As you start having multiple top-level files you need bundled by `browserify`, the management of those tasks, and the processes they require can get verbose and not-simple, especially if you need multiple transforms/configuration for each bundle.

#### browserify middleware

There are some existing solutions for setting up an http response handler to dynamically build your bundles.  It's a fairly nice solution to the problem of managing multiple top-level files you need bundled in development.  The benefit is that you don't have to manage watchify tasks / processes.  The big drawback is that as your bundle grows in size, it can be time-consuming to generate that on every page load.

#### combine watchify & dynamic bundler middleware

I worked with both of these approaches on different sized projects, and wanted a better solution.  `browserify-dev-bundler` provides dynamic bundler middleware, but with the added bonus of having seamless watchify support.  You don't have to run watchify processes for your files, but your bundles are automatically kept up to date internally with watchify, which means really fast response times for dynamic bundles in development.
