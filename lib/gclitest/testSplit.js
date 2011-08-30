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
  t.verifySame(0, args.length);
  t.verifySame('s', requ.commandAssignment.getArg().text);
};

exports.testFlatCommand = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('tsv');
  requ._split(args);
  t.verifyArraysEqual([], args);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);

  args = requ._tokenize('tsv a b');
  requ._split(args);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame(2, args.length);
  t.verifySame('a', args[0].text);
  t.verifySame('b', args[1].text);
};

exports.testJavascript = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{');
  requ._split(args);
  t.verifySame(1, args.length);
  t.verifySame('', args[0].text);
  t.verifySame('', requ.commandAssignment.getArg().text);
  t.verifySame('{', requ.commandAssignment.getValue().name);
};

// BUG 663081 - add tests for sub commands

});
