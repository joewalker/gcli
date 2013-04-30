/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(function(require, exports, module) {

'use strict';

var assert = require('test/assert');
var cli = require('gcli/cli');
var Requisition = require('gcli/cli').Requisition;
var canon = require('gcli/canon');
var mockCommands = require('gclitest/mockCommands');

exports.setup = function(options) {
  mockCommands.setup();
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
};


exports.testSplitSimple = function(options) {
  var args;
  var requisition = new Requisition();

  args = cli.tokenize('s');
  requisition._split(args);
  assert.is(0, args.length);
  assert.is('s', requisition.commandAssignment.arg.text);
};

exports.testFlatCommand = function(options) {
  var args;
  var requisition = new Requisition();

  args = cli.tokenize('tsv');
  requisition._split(args);
  assert.is(0, args.length);
  assert.is('tsv', requisition.commandAssignment.value.name);

  args = cli.tokenize('tsv a b');
  requisition._split(args);
  assert.is('tsv', requisition.commandAssignment.value.name);
  assert.is(2, args.length);
  assert.is('a', args[0].text);
  assert.is('b', args[1].text);
};

exports.testJavascript = function(options) {
  if (!canon.getCommand('{')) {
    assert.log('Skipping testJavascript because { is not registered');
    return;
  }

  var args;
  var requisition = new Requisition();

  args = cli.tokenize('{');
  requisition._split(args);
  assert.is(1, args.length);
  assert.is('', args[0].text);
  assert.is('', requisition.commandAssignment.arg.text);
  assert.is('{', requisition.commandAssignment.value.name);
};

// BUG 663081 - add tests for sub commands

});
