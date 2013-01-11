/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var assert = require('test/assert');
var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');

exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testBasic = function(options) {
  if (options.isJsdom) {
    assert.log('jsdom does not pass on focus events properly, skipping');
    return;
  }

  helpers.audit([
    {
      name: 'exec setup',
      setup: function() {
        // Just check that we've got focus, and everything is clear
        helpers.focusInput();
        return helpers.setInput('help');
      },
      check: { },
      exec: { }
    },
    {
      setup: 'tsn deep',
      check: {
        input:  'tsn deep',
        hints:          '',
        markup: 'IIIVIIII',
        cursor: 8,
        status: 'ERROR',
        outputState: 'false:default',
        tooltipState: 'false:default'
      }
    },
    {
      name: 'tsn deep<TAB>',
      setup: function() {
        return helpers.pressReturn();
      },
      check: {
        input:  'tsn deep',
        hints:          '',
        markup: 'IIIVIIII',
        cursor: 8,
        status: 'ERROR',
        outputState: 'false:default',
        tooltipState: 'true:isError'
      }
    }
  ]);
};


});
