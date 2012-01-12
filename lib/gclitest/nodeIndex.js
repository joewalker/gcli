/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var Display = require('gcli/ui/display').Display;
var gclitest = require('gclitest/index');

/**
 * Setup an environment to run GCLI tests in jsdom in node
 */
exports.run = function(errors, window) {

  var options = {
    requisition: new Requisition(),
    document: window.document
  };

  options.display = new Display(options);

  gclitest.run({
    window: window,
    isNode: true,
    detailedResultLog: true,
    inputter: options.display.inputter,
    requisition: options.requisition
  });
};


});
