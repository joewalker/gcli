/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var t = require('test/assert');

var commands = require('gclitest/commands');
var Requisition = require('gcli/cli').Requisition;

exports.setup = function() {
  commands.setup();
};

exports.shutdown = function() {
  commands.shutdown();
};

exports.testSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  requ._split(args);
  t.verifyEqual(0, args.length);
  t.verifyEqual('s', requ.commandAssignment.getArg().text);
};

exports.testFlatCommand = function() {
  var args;
  var requ = new Requisition();

  // This test is slightly hacky because it's messing with the internals of
  // Requisition, and fragile to mutations of Requisition.update(), since
  // these test cases are probably covered by other tests we might remove
  // them in the future
  requ._args = [];
  args = requ._tokenize('tsv');
  requ._split(args);
  t.verifyEqual([], args);
  t.verifyEqual('tsv', requ.commandAssignment.getValue().name);

  args = requ._tokenize('tsv a b');
  requ._split(args);
  t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
  t.verifyEqual(2, args.length);
  t.verifyEqual('a', args[0].text);
  t.verifyEqual('b', args[1].text);
};

// BUG 663081 - add tests for sub commands

});
