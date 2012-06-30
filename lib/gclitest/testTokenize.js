/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var test = require('test/assert');
var Requisition = require('gcli/cli').Requisition;

exports.testBlanks = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);

  args = requ._tokenize(' ');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is(' ', args[0].prefix);
  test.is('', args[0].suffix);
};

exports.testTokSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  test.is(1, args.length);
  test.is('s', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  args = requ._tokenize('s s');
  test.is(2, args.length);
  test.is('s', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);
  test.is('s', args[1].text);
  test.is(' ', args[1].prefix);
  test.is('', args[1].suffix);
  test.is('Argument', args[1].type);
};

exports.testJavascript = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{x}');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{ x }');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{ ', args[0].prefix);
  test.is(' }', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{x} {y}');
  test.is(2, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
  test.is('y', args[1].text);
  test.is(' {', args[1].prefix);
  test.is('}', args[1].suffix);
  test.is('ScriptArgument', args[1].type);

  args = requ._tokenize('{x}{y}');
  test.is(2, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
  test.is('y', args[1].text);
  test.is('{', args[1].prefix);
  test.is('}', args[1].suffix);
  test.is('ScriptArgument', args[1].type);

  args = requ._tokenize('{');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{ ');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('{ ', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{x');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
};

exports.testRegularNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{"x"}');
  test.is(1, args.length);
  test.is('"x"', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{\'x\'}');
  test.is(1, args.length);
  test.is('\'x\'', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('"{x}"');
  test.is(1, args.length);
  test.is('{x}', args[0].text);
  test.is('"', args[0].prefix);
  test.is('"', args[0].suffix);
  test.is('Argument', args[0].type);

  args = requ._tokenize('\'{x}\'');
  test.is(1, args.length);
  test.is('{x}', args[0].text);
  test.is('\'', args[0].prefix);
  test.is('\'', args[0].suffix);
  test.is('Argument', args[0].type);
};

exports.testDeepNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{{}}');
  test.is(1, args.length);
  test.is('{}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{{x} {y}}');
  test.is(1, args.length);
  test.is('{x} {y}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  args = requ._tokenize('{{w} {{{x}}}} {y} {{{z}}}');

  test.is(3, args.length);

  test.is('{w} {{{x}}}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  test.is('y', args[1].text);
  test.is(' {', args[1].prefix);
  test.is('}', args[1].suffix);
  test.is('ScriptArgument', args[1].type);

  test.is('{{z}}', args[2].text);
  test.is(' {', args[2].prefix);
  test.is('}', args[2].suffix);
  test.is('ScriptArgument', args[2].type);

  args = requ._tokenize('{{w} {{{x}}} {y} {{{z}}}');

  test.is(1, args.length);

  test.is('{w} {{{x}}} {y} {{{z}}}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('ScriptArgument', args[0].type);
};

exports.testStrangeNesting = function() {
  var args;
  var requ = new Requisition();

  // Note: When we get real JS parsing this should break
  args = requ._tokenize('{"x}"}');

  test.is(2, args.length);

  test.is('"x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.is('ScriptArgument', args[0].type);

  test.is('}', args[1].text);
  test.is('"', args[1].prefix);
  test.is('', args[1].suffix);
  test.is('Argument', args[1].type);
};

exports.testComplex = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize(' 1234  \'12 34\'');

  test.is(2, args.length);

  test.is('1234', args[0].text);
  test.is(' ', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  test.is('12 34', args[1].text);
  test.is('  \'', args[1].prefix);
  test.is('\'', args[1].suffix);
  test.is('Argument', args[1].type);

  args = requ._tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \

  test.is(3, args.length);

  test.is('12\'34', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  test.is('12 34', args[1].text);
  test.is(' "', args[1].prefix);
  test.is('"', args[1].suffix);
  test.is('Argument', args[1].type);

  test.is('\\', args[2].text);
  test.is(' ', args[2].prefix);
  test.is('', args[2].suffix);
  test.is('Argument', args[2].type);
};

exports.testPathological = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd

  test.is(4, args.length);

  test.is('a b', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.is('Argument', args[0].type);

  test.is('\t\n\r', args[1].text);
  test.is(' ', args[1].prefix);
  test.is('', args[1].suffix);
  test.is('Argument', args[1].type);

  test.is('\'x"', args[2].text);
  test.is(' ', args[2].prefix);
  test.is('', args[2].suffix);
  test.is('Argument', args[2].type);

  test.is('d', args[3].text);
  test.is(' \'', args[3].prefix);
  test.is('', args[3].suffix);
  test.is('Argument', args[3].type);
};


});
