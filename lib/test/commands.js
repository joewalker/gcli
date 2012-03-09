/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var canon = require('gcli/canon');
var domtemplate = require("gcli/ui/domtemplate");

var examiner = require("test/examiner");

var testCss = require("text!test/ui/test.css");
var testHtml = require('text!test/ui/test.html');


var template;

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
    if (!template) {
      util.importCss(testCss, context.document, 'gcli-test');
      template = util.toDom(context.document, testHtml);
    }

    var promise = context.createPromise();
    var options = { window: window };

    examiner.runAsync(options, function() {
      var newNode = template.cloneNode(true);
      domtemplate.template(newNode, examiner.toRemote(), {
        allowEval: true,
        stack: 'test.html'
      });
      promise.resolve(newNode);
    });
    return promise;
  }
};


});
