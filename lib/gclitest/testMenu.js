/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var test = require('test/assert');
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

exports.testOptions = function(options) {
  helpers.setInput('tslong');
  helpers.check({
    input:  'tslong',
    markup: 'VVVVVV',
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ' <url>', ' [options]' ],
    args: {
      url: { value: undefined, status: 'INCOMPLETE' },
      indentSize: { value: undefined, status: 'VALID' },
      indentChar: { value: undefined, status: 'VALID' },
      preserveNewlines: { value: undefined, status: 'VALID' },
      preserveMaxNewlines: { value: undefined, status: 'VALID' },
      jslintHappy: { value: undefined, status: 'VALID' },
      braceStyle: { value: undefined, status: 'VALID' },
      noSpaceBeforeConditional: { value: undefined, status: 'VALID' },
      unescapeStrings: { value: undefined, status: 'VALID' }
    }
  });
};


});

