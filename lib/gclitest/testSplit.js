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

var test = require('test/assert');

var mockCommands = require('gclitest/mockCommands');
var Requisition = require('gcli/cli').Requisition;
var canon = require('gcli/canon');

exports.setup = function() {
  mockCommands.setup();
};

exports.shutdown = function() {
  mockCommands.shutdown();
};

exports.testSplitSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  requ._split(args);
  test.is(0, args.length);
  test.is('s', requ.commandAssignment.arg.text);
};

exports.testFlatCommand = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('tsv');
  requ._split(args);
  test.is(0, args.length);
  test.is('tsv', requ.commandAssignment.value.name);

  args = requ._tokenize('tsv a b');
  requ._split(args);
  test.is('tsv', requ.commandAssignment.value.name);
  test.is(2, args.length);
  test.is('a', args[0].text);
  test.is('b', args[1].text);
};

exports.testJavascript = function() {
  if (!canon.getCommand('{')) {
    test.log('Skipping testJavascript because { is not registered');
    return;
  }

  var args;
  var requ = new Requisition();

  args = requ._tokenize('{');
  requ._split(args);
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('', requ.commandAssignment.arg.text);
  test.is('{', requ.commandAssignment.value.name);
};

// BUG 663081 - add tests for sub commands

});
