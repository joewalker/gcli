/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var Requisition = require('gcli/cli').Requisition;
var Inputter = require('gcli/ui/inputter').Inputter;

/**
 * createView() for Firefox requires an options object with the following
 * members:
 *
 * - document: this.doc
 * - inputElement: this.inputNode
 * - completeElement: this.completeNode
 * - inputBackgroundElement: this.inputStack
 */
exports.createView = function(options) {
  options.preStyled = true;
  options.autoHide = true;
  options.requisition = new Requisition();
  options.completionPrompt = '';
  options.inputter = new Inputter(options);
  options.inputter.update();
};

// The API for use by UI integrators
// Expose the command output manager so that GCLI can be integrated with
// Firefox.
exports.commandOutputManager = require('gcli/canon').commandOutputManager;

});
