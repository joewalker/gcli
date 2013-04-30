/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

'use strict';

var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');
var cli = require('gcli/cli');

var origLogErrors = undefined;

exports.setup = function(options) {
  mockCommands.setup();

  origLogErrors = cli.logErrors;
  cli.logErrors = false;
};

exports.shutdown = function(options) {
  mockCommands.shutdown();

  cli.logErrors = origLogErrors;
  origLogErrors = undefined;
};

exports.testBasic = function(options) {
  return helpers.audit(options, [
    {
      setup: 'tsfail reject',
      exec: {
        completed: false,
        output: 'rejected promise',
        type: 'error',
        error: true
      }
    },
    {
      setup: 'tsfail rejecttyped',
      exec: {
        completed: false,
        output: '54',
        type: 'number',
        error: true
      }
    },
    {
      setup: 'tsfail throwerror',
      exec: {
        completed: true,
        output: 'Error: thrown error',
        type: 'error',
        error: true
      }
    },
    {
      setup: 'tsfail throwstring',
      exec: {
        completed: true,
        output: 'thrown string',
        type: 'error',
        error: true
      }
    },
    {
      setup: 'tsfail noerror',
      exec: {
        completed: true,
        output: 'no error',
        type: 'string',
        error: false
      }
    }
  ]);
};


});
