/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


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
  helpers.focusInput();
  helpers.exec(options, 'help');

  helpers.setInput('gcli');
  helpers.check({
    input:  'gcli',
    hints:      '',
    markup: 'IIII',
    cursor: 4,
    status: 'ERROR',
    outputState: 'false:default',
    tooltipState: 'false:default'
  });

  helpers.pressReturn();
  helpers.check({
    input:  'gcli',
    hints:      '',
    markup: 'IIII',
    cursor: 4,
    status: 'ERROR',
    outputState: 'false:default',
    tooltipState: 'true:isError'
  });
};


});
