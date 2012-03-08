/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var Display = require('gcli/ui/display').Display;
var gclitest = require('gclitest/index');

/**
 * Setup an environment to run GCLI tests in jsdom in node
 */
exports.run = function(errors, window) {
  var display = new Display({ document: window.document });
  gclitest.run({
    window: window,
    isNode: true,
    detailedResultLog: true,
    inputter: display.inputter,
    requisition: display.requisition
  });
};


});
