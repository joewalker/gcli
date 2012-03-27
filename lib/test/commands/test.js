/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
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
  params: [],
  exec: function(env, context) {
    var promise = context.createPromise();

    examiner.runAsync({}, function() {
      promise.resolve(context.createView({
        html: testHtml,
        css: testCss,
        cssId: 'gcli-test',
        data: examiner.toRemote(),
        options: { allowEval: true, stack: 'test.html' }
      }));
    });

    return promise;
  }
};


});
