/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var t = require('test/assert');
var Requisition = require('gcli/cli').Requisition;

exports.testBlanks = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('');
  t.verifyEqual(1, args.length);
  t.verifyEqual('', args[0].text);
  t.verifyEqual('', args[0].prefix);
  t.verifyEqual('', args[0].suffix);

  args = requ._tokenize(' ');
  t.verifyEqual(1, args.length);
  t.verifyEqual('', args[0].text);
  t.verifyEqual(' ', args[0].prefix);
  t.verifyEqual('', args[0].suffix);
};

exports.testSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  t.verifyEqual(1, args.length);
  t.verifyEqual('s', args[0].text);
  t.verifyEqual('', args[0].prefix);
  t.verifyEqual('', args[0].suffix);

  args = requ._tokenize('s s');
  t.verifyEqual(2, args.length);
  t.verifyEqual('s', args[0].text);
  t.verifyEqual('', args[0].prefix);
  t.verifyEqual('', args[0].suffix);
  t.verifyEqual('s', args[1].text);
  t.verifyEqual(' ', args[1].prefix);
  t.verifyEqual('', args[1].suffix);
};

exports.testComplex = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize(' 1234  \'12 34\'');
  t.verifyEqual(2, args.length);
  t.verifyEqual('1234', args[0].text);
  t.verifyEqual(' ', args[0].prefix);
  t.verifyEqual('', args[0].suffix);
  t.verifyEqual('12 34', args[1].text);
  t.verifyEqual('  \'', args[1].prefix);
  t.verifyEqual('\'', args[1].suffix);

  args = requ._tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \
  t.verifyEqual(3, args.length);
  t.verifyEqual('12\'34', args[0].text);
  t.verifyEqual('', args[0].prefix);
  t.verifyEqual('', args[0].suffix);
  t.verifyEqual('12 34', args[1].text);
  t.verifyEqual(' "', args[1].prefix);
  t.verifyEqual('"', args[1].suffix);
  t.verifyEqual('\\', args[2].text);
  t.verifyEqual(' ', args[2].prefix);
  t.verifyEqual('', args[2].suffix);
};

exports.testPathological = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd
  t.verifyEqual(4, args.length);
  t.verifyEqual('a b', args[0].text);
  t.verifyEqual('', args[0].prefix);
  t.verifyEqual('', args[0].suffix);
  t.verifyEqual('\t\n\r', args[1].text);
  t.verifyEqual(' ', args[1].prefix);
  t.verifyEqual('', args[1].suffix);
  t.verifyEqual('\'x"', args[2].text);
  t.verifyEqual(' ', args[2].prefix);
  t.verifyEqual('', args[2].suffix);
  t.verifyEqual('d', args[3].text);
  t.verifyEqual(' \'', args[3].prefix);
  t.verifyEqual('', args[3].suffix);
};



});
