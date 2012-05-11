/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
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
