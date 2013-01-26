/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');

exports.setup = function(options) {
  helpers.setup(options);
  mockCommands.setup();
};

exports.shutdown = function(options) {
  helpers.shutdown(options);
  mockCommands.shutdown();
};


exports.testBasic = function(options) {
  return helpers.audit([
    {
      skipRemainingIf: options.isJsdom,
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
      setup:    'tsn deep',
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
      setup:    'tsn deep<TAB><RETURN>',
      check: {
        input:  'tsn deep ',
        hints:           '',
        markup: 'IIIIIIIIV',
        cursor: 9,
        status: 'ERROR',
        outputState: 'false:default',
        tooltipState: 'true:isError'
      }
    }
  ]);
};


});
