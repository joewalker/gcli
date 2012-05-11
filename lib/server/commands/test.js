/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var fs = require('fs');
var jsdom = require('jsdom').jsdom;
var main = require('../../../gcli');
var gcli = main.require('gcli/index');

var Display = main.require('gcli/ui/display').Display;
var gclitest = main.require('gclitest/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(testCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(testCmdSpec);
};

/**
 * 'test' command.
 */
var testCmdSpec = {
  name: 'test',
  description: 'Run GCLI unit tests',
  returnType: 'terminal',
  exec: function(args, context) {
    jsdom.env({
      html: fs.readFileSync(main.gcliHome + '/index.html').toString(),
      src: [
        fs.readFileSync(main.gcliHome + '/scripts/html5-shim.js').toString()
      ],
      features: {
        QuerySelector: true
      },
      done: function(errors, window) {
        var display = new Display({ document: window.document });
        gclitest.run({
          window: window,
          isNode: true,
          detailedResultLog: true,
          display: display,
          isUnamdized: main.useUnamd
        });
      }
    });
  }
};
