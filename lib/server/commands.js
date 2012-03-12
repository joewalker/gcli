/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var main = require('../../gcli');
var build = require('./build');

var fs = require('fs');
var jsdom = require('jsdom').jsdom;

var gcli = main.requirejs('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand({
    name: 'standard',
    description: 'Build the basic GCLI web target',
    exec: function(args, context) {
      return build.buildStandard();
    }
  });

  gcli.addCommand({
    name: 'firefox',
    description: 'Build the firefox-GCLI target',
    params: [
      {
        name: 'location',
        type: 'string',
        defaultValue: '../devtools',
        description: 'The location of the mozilla-central checkout'
      }
    ],
    exec: function(args, context) {
      return build.buildFirefox(args.location);
    }
  });

  gcli.addCommand({
    name: 'incrbuild',
    description: 'Incremental firefox build/run',
    exec: function(args, context) {
      return build.buildMain();
    }
  });

  gcli.addCommand({
    name: 'test',
    description: 'Run GCLI unit tests',
    exec: function(args, context) {
      jsdom.env({
        html: fs.readFileSync(main.gcliHome + '/index.html').toString(),
        src: [
          fs.readFileSync(main.gcliHome + '/scripts/html5-shim.js').toString()
        ],
        features: {
          QuerySelector: true
        },
        done: main.requirejs('gclitest/nodeIndex').run
      });
    }
  });

};

exports.shutdown = function() {
  console.warn('server/commands does not unregister commands');
};
