/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var t = require('test/assert');
var Requisition = require('gcli/cli').Requisition;
var Argument = require('gcli/argument').Argument;
var ScriptArgument = require('gcli/argument').ScriptArgument;

exports.testBlanks = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('');
  t.verifySame(1, args.length);
  t.verifySame('', args[0].text);
  t.verifySame('', args[0].prefix);
  t.verifySame('', args[0].suffix);

  args = requ._tokenize(' ');
  t.verifySame(1, args.length);
  t.verifySame('', args[0].text);
  t.verifySame(' ', args[0].prefix);
  t.verifySame('', args[0].suffix);
};

exports.testSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  t.verifySame(1, args.length);
  t.verifySame('s', args[0].text);
  t.verifySame('', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof Argument);

  args = requ._tokenize('s s');
  t.verifySame(2, args.length);
  t.verifySame('s', args[0].text);
  t.verifySame('', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof Argument);
  t.verifySame('s', args[1].text);
  t.verifySame(' ', args[1].prefix);
  t.verifySame('', args[1].suffix);
  t.verifyTrue(args[1] instanceof Argument);
};

exports.testJavascript = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{x}');
  t.verifySame(1, args.length);
  t.verifySame('x', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{ x }');
  t.verifySame(1, args.length);
  t.verifySame('x', args[0].text);
  t.verifySame('{ ', args[0].prefix);
  t.verifySame(' }', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{x} {y}');
  t.verifySame(2, args.length);
  t.verifySame('x', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);
  t.verifySame('y', args[1].text);
  t.verifySame(' {', args[1].prefix);
  t.verifySame('}', args[1].suffix);
  t.verifyTrue(args[1] instanceof ScriptArgument);

  args = requ._tokenize('{x}{y}');
  t.verifySame(2, args.length);
  t.verifySame('x', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);
  t.verifySame('y', args[1].text);
  t.verifySame('{', args[1].prefix);
  t.verifySame('}', args[1].suffix);
  t.verifyTrue(args[1] instanceof ScriptArgument);

  args = requ._tokenize('{');
  t.verifySame(1, args.length);
  t.verifySame('', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{ ');
  t.verifySame(1, args.length);
  t.verifySame('', args[0].text);
  t.verifySame('{ ', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{x');
  t.verifySame(1, args.length);
  t.verifySame('x', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);
};

exports.testRegularNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{"x"}');
  t.verifySame(1, args.length);
  t.verifySame('"x"', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{\'x\'}');
  t.verifySame(1, args.length);
  t.verifySame('\'x\'', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('"{x}"');
  t.verifySame(1, args.length);
  t.verifySame('{x}', args[0].text);
  t.verifySame('"', args[0].prefix);
  t.verifySame('"', args[0].suffix);
  t.verifyTrue(args[0] instanceof Argument);

  args = requ._tokenize('\'{x}\'');
  t.verifySame(1, args.length);
  t.verifySame('{x}', args[0].text);
  t.verifySame('\'', args[0].prefix);
  t.verifySame('\'', args[0].suffix);
  t.verifyTrue(args[0] instanceof Argument);
};

exports.testDeepNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{{}}');
  t.verifySame(1, args.length);
  t.verifySame('{}', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{{x} {y}}');
  t.verifySame(1, args.length);
  t.verifySame('{x} {y}', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{{w} {{{x}}}} {y} {{{z}}}');

  t.verifySame(3, args.length);

  t.verifySame('{w} {{{x}}}', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  t.verifySame('y', args[1].text);
  t.verifySame(' {', args[1].prefix);
  t.verifySame('}', args[1].suffix);
  t.verifyTrue(args[1] instanceof ScriptArgument);

  t.verifySame('{{z}}', args[2].text);
  t.verifySame(' {', args[2].prefix);
  t.verifySame('}', args[2].suffix);
  t.verifyTrue(args[2] instanceof ScriptArgument);

  args = requ._tokenize('{{w} {{{x}}} {y} {{{z}}}');

  t.verifySame(1, args.length);

  t.verifySame('{w} {{{x}}} {y} {{{z}}}', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);
};

exports.testStrangeNesting = function() {
  var args;
  var requ = new Requisition();

  // Note: When we get real JS parsing this should break
  args = requ._tokenize('{"x}"}');

  t.verifySame(2, args.length);

  t.verifySame('"x', args[0].text);
  t.verifySame('{', args[0].prefix);
  t.verifySame('}', args[0].suffix);
  t.verifyTrue(args[0] instanceof ScriptArgument);

  t.verifySame('}', args[1].text);
  t.verifySame('"', args[1].prefix);
  t.verifySame('', args[1].suffix);
  t.verifyTrue(args[1] instanceof Argument);
};

exports.testComplex = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize(' 1234  \'12 34\'');

  t.verifySame(2, args.length);

  t.verifySame('1234', args[0].text);
  t.verifySame(' ', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof Argument);

  t.verifySame('12 34', args[1].text);
  t.verifySame('  \'', args[1].prefix);
  t.verifySame('\'', args[1].suffix);
  t.verifyTrue(args[1] instanceof Argument);

  args = requ._tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \

  t.verifySame(3, args.length);

  t.verifySame('12\'34', args[0].text);
  t.verifySame('', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof Argument);

  t.verifySame('12 34', args[1].text);
  t.verifySame(' "', args[1].prefix);
  t.verifySame('"', args[1].suffix);
  t.verifyTrue(args[1] instanceof Argument);

  t.verifySame('\\', args[2].text);
  t.verifySame(' ', args[2].prefix);
  t.verifySame('', args[2].suffix);
  t.verifyTrue(args[2] instanceof Argument);
};

exports.testPathological = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd

  t.verifySame(4, args.length);

  t.verifySame('a b', args[0].text);
  t.verifySame('', args[0].prefix);
  t.verifySame('', args[0].suffix);
  t.verifyTrue(args[0] instanceof Argument);

  t.verifySame('\t\n\r', args[1].text);
  t.verifySame(' ', args[1].prefix);
  t.verifySame('', args[1].suffix);
  t.verifyTrue(args[1] instanceof Argument);

  t.verifySame('\'x"', args[2].text);
  t.verifySame(' ', args[2].prefix);
  t.verifySame('', args[2].suffix);
  t.verifyTrue(args[2] instanceof Argument);

  t.verifySame('d', args[3].text);
  t.verifySame(' \'', args[3].prefix);
  t.verifySame('', args[3].suffix);
  t.verifyTrue(args[3] instanceof Argument);
};


});
