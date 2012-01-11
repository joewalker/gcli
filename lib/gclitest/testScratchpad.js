/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var Display = require('gcli/ui/display').Display;

var test = require('test/assert');

var instance = undefined;

exports.setup = function(options) {
  var scratchpad = {
    shouldActivate: function Scratchpad_shouldActivate(ev) {
      test.is(ev, instance.ev, 'correct event');
      return true;
    },
    activate: function Scratchpad_activate(aValue) {
      instance.activated = true;
      return true;
    },
    linkText: 'scratchpad.linkText'
  };
  instance = {
    requisition: new Requisition(),
    document: options.window.document,
    scratchpad: scratchpad
  };
  instance.display = new Display(instance);
};

exports.shutdown = function() {
  instance = undefined;
};


exports.testActivate = function() {
  instance.ev = {};
  instance.display.inputter.onKeyUp(instance.ev);
  test.ok(instance.activated, 'scratchpad is activated');
};

});
