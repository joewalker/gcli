/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var canon = require('gcli/canon');

var examiner = require("test/examiner");

var testCss = require("text!test/commands/test.css");
var testHtml = require('text!test/commands/test.html');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  canon.addCommand(testCommandSpec);
};

exports.shutdown = function() {
  canon.removeCommand(testCommandSpec);
};

/**
 * The 'test' command
 */
var testCommandSpec = {
  name: 'test',
  description: 'Runs the GCLI Unit Tests',
  params: [
    {
      name: 'suite',
      type: {
        name: 'selection',
        lookup: function() {
          return Object.keys(examiner.suites).map(function (name) {
            return { name: name, value: examiner.suites[name] };
          });
        },
      },
      description: 'Test suite to run.',
      defaultValue: null
    }
  ],
  exec: function(args, context) {
    var promise = context.createPromise();

    var options = {};
    examiner.mergeDefaultOptions(options);

    examiner.reset();

    if (args.suite) {
      args.suite.runAsync(options, this.createResolver(promise, context));
    }
    else {
      examiner.runAsync(options, this.createResolver(promise, context));
    }

    return promise;
  },
  createResolver: function(promise, context) {
    return function() {
      promise.resolve(context.createView({
        html: testHtml,
        css: testCss,
        cssId: 'gcli-test',
        data: examiner.toRemote(),
        options: { allowEval: true, stack: 'test.html' }
      }));
      context.update('');
    };
  }
};


});
