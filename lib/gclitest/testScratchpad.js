/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var test = require('test/assert');

var origScratchpad;

exports.setup = function(options) {
  if (options.display) {
    origScratchpad = options.display.inputter.scratchpad;
    options.display.inputter.scratchpad = stubScratchpad;
  }
};

exports.shutdown = function(options) {
  if (options.display) {
    options.display.inputter.scratchpad = origScratchpad;
  }
};

var stubScratchpad = {
  shouldActivate: function(ev) {
    return true;
  },
  activatedCount: 0,
  linkText: 'scratchpad.linkText'
};
stubScratchpad.activate = function(value) {
  stubScratchpad.activatedCount++;
  return true;
};


exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping scratchpad tests');
    return;
  }

  var ev = {};
  stubScratchpad.activatedCount = 0;
  options.display.inputter.onKeyUp(ev);
  test.is(1, stubScratchpad.activatedCount, 'scratchpad is activated');
};


});
