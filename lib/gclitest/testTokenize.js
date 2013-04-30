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

exports.testBlanks = function(options) {
  var args;

  args = cli.tokenize('');
  assert.is(1, args.length);
  assert.is('', args[0].text);
  assert.is('', args[0].prefix);
  assert.is('', args[0].suffix);

  args = cli.tokenize(' ');
  assert.is(1, args.length);
  assert.is('', args[0].text);
  assert.is(' ', args[0].prefix);
  assert.is('', args[0].suffix);
};

exports.testTokSimple = function(options) {
  var args;

  args = cli.tokenize('s');
  assert.is(1, args.length);
  assert.is('s', args[0].text);
  assert.is('', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('Argument', args[0].type);

  args = cli.tokenize('s s');
  assert.is(2, args.length);
  assert.is('s', args[0].text);
  assert.is('', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('Argument', args[0].type);
  assert.is('s', args[1].text);
  assert.is(' ', args[1].prefix);
  assert.is('', args[1].suffix);
  assert.is('Argument', args[1].type);
};

exports.testJavascript = function(options) {
  var args;

  args = cli.tokenize('{x}');
  assert.is(1, args.length);
  assert.is('x', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('{ x }');
  assert.is(1, args.length);
  assert.is('x', args[0].text);
  assert.is('{ ', args[0].prefix);
  assert.is(' }', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('{x} {y}');
  assert.is(2, args.length);
  assert.is('x', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);
  assert.is('y', args[1].text);
  assert.is(' {', args[1].prefix);
  assert.is('}', args[1].suffix);
  assert.is('ScriptArgument', args[1].type);

  args = cli.tokenize('{x}{y}');
  assert.is(2, args.length);
  assert.is('x', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);
  assert.is('y', args[1].text);
  assert.is('{', args[1].prefix);
  assert.is('}', args[1].suffix);
  assert.is('ScriptArgument', args[1].type);

  args = cli.tokenize('{');
  assert.is(1, args.length);
  assert.is('', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('{ ');
  assert.is(1, args.length);
  assert.is('', args[0].text);
  assert.is('{ ', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('{x');
  assert.is(1, args.length);
  assert.is('x', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);
};

exports.testRegularNesting = function(options) {
  var args;

  args = cli.tokenize('{"x"}');
  assert.is(1, args.length);
  assert.is('"x"', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('{\'x\'}');
  assert.is(1, args.length);
  assert.is('\'x\'', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('"{x}"');
  assert.is(1, args.length);
  assert.is('{x}', args[0].text);
  assert.is('"', args[0].prefix);
  assert.is('"', args[0].suffix);
  assert.is('Argument', args[0].type);

  args = cli.tokenize('\'{x}\'');
  assert.is(1, args.length);
  assert.is('{x}', args[0].text);
  assert.is('\'', args[0].prefix);
  assert.is('\'', args[0].suffix);
  assert.is('Argument', args[0].type);
};

exports.testDeepNesting = function(options) {
  var args;

  args = cli.tokenize('{{}}');
  assert.is(1, args.length);
  assert.is('{}', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('{{x} {y}}');
  assert.is(1, args.length);
  assert.is('{x} {y}', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  args = cli.tokenize('{{w} {{{x}}}} {y} {{{z}}}');

  assert.is(3, args.length);

  assert.is('{w} {{{x}}}', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  assert.is('y', args[1].text);
  assert.is(' {', args[1].prefix);
  assert.is('}', args[1].suffix);
  assert.is('ScriptArgument', args[1].type);

  assert.is('{{z}}', args[2].text);
  assert.is(' {', args[2].prefix);
  assert.is('}', args[2].suffix);
  assert.is('ScriptArgument', args[2].type);

  args = cli.tokenize('{{w} {{{x}}} {y} {{{z}}}');

  assert.is(1, args.length);

  assert.is('{w} {{{x}}} {y} {{{z}}}', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);
};

exports.testStrangeNesting = function(options) {
  var args;

  // Note: When we get real JS parsing this should break
  args = cli.tokenize('{"x}"}');

  assert.is(2, args.length);

  assert.is('"x', args[0].text);
  assert.is('{', args[0].prefix);
  assert.is('}', args[0].suffix);
  assert.is('ScriptArgument', args[0].type);

  assert.is('}', args[1].text);
  assert.is('"', args[1].prefix);
  assert.is('', args[1].suffix);
  assert.is('Argument', args[1].type);
};

exports.testComplex = function(options) {
  var args;

  args = cli.tokenize(' 1234  \'12 34\'');

  assert.is(2, args.length);

  assert.is('1234', args[0].text);
  assert.is(' ', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('Argument', args[0].type);

  assert.is('12 34', args[1].text);
  assert.is('  \'', args[1].prefix);
  assert.is('\'', args[1].suffix);
  assert.is('Argument', args[1].type);

  args = cli.tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \

  assert.is(3, args.length);

  assert.is('12\'34', args[0].text);
  assert.is('', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('Argument', args[0].type);

  assert.is('12 34', args[1].text);
  assert.is(' "', args[1].prefix);
  assert.is('"', args[1].suffix);
  assert.is('Argument', args[1].type);

  assert.is('\\', args[2].text);
  assert.is(' ', args[2].prefix);
  assert.is('', args[2].suffix);
  assert.is('Argument', args[2].type);
};

exports.testPathological = function(options) {
  var args;

  args = cli.tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd

  assert.is(4, args.length);

  assert.is('a b', args[0].text);
  assert.is('', args[0].prefix);
  assert.is('', args[0].suffix);
  assert.is('Argument', args[0].type);

  assert.is('\t\n\r', args[1].text);
  assert.is(' ', args[1].prefix);
  assert.is('', args[1].suffix);
  assert.is('Argument', args[1].type);

  assert.is('\'x"', args[2].text);
  assert.is(' ', args[2].prefix);
  assert.is('', args[2].suffix);
  assert.is('Argument', args[2].type);

  assert.is('d', args[3].text);
  assert.is(' \'', args[3].prefix);
  assert.is('', args[3].suffix);
  assert.is('Argument', args[3].type);
};


});
