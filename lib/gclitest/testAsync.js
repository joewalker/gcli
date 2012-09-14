/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


// var test = require('test/assert');
var helpers = require('gclitest/helpers');
var mockTypes = require('gclitest/mockTypes');


exports.setup = function(options) {
  mockTypes.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockTypes.shutdown();
  helpers.shutdown(options);
};

exports.testBasic = function(options) {
};

exports.testCompleted = function(options) {
  helpers.setInput('tsela');
  helpers.pressTab();
  helpers.check({
    args: {
      command: { name: 'tselarr', type: 'Argument' },
      num: { type: 'BlankArgument' },
      arr: { type: 'ArrayArgument' }
    }
  });

  helpers.setInput('tsn dif ');
  helpers.check({
    input:  'tsn dif ',
    hints:          '<text>',
    markup: 'VVVVVVVV',
    cursor: 8,
    status: 'ERROR',
    args: {
      command: { name: 'tsn dif', type: 'MergedArgument' },
      text: { type: 'BlankArgument', status: 'INCOMPLETE' }
    }
  });
};

});
