/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;
var canon = require('gcli/canon');
var domtemplate = require("gcli/ui/domtemplate");

var examiner = require("test/examiner");

var testCss = require("text!test/ui/test.css");
var testHtml = require('text!test/ui/test.html');


var template;

/**
 * Registration and de-registration.
 */
exports.setup = function() {
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
      dom.importCss(testCss, context.document);
      template = dom.createElement(context.document, 'div');
      dom.setInnerHtml(template, testHtml);
    }

    var promise = context.createPromise();
    examiner.runAsync(function() {
      var newNode = template.cloneNode(true);
      domtemplate.template(newNode, examiner.toRemote(), { stack: 'test.html' });
      promise.resolve(newNode);
    });
    return promise;
  }
};


});
