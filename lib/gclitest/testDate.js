/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var types = require('gcli/types');
var Argument = require('gcli/argument').Argument;
var Status = require('gcli/types').Status;

var test = require('test/assert');

exports.setup = function(options) {
};

exports.shutdown = function(options) {
};

exports.testParse = function(options) {
  var date = types.getType('date');
  var conversion = date.parse(new Argument('now'));
  // note: two 'new Date()' don't necessarily have the same representation
  // (eg. 13:17:59 vs. 13:18:00): this test could fail
  test.is(conversion.value.toString(), new Date().toString(), 'now parse');
  test.is(conversion._status, Status.VALID, 'now parse');
};

exports.testMaxMin = function(options) {
  var max = new Date();
  var min = new Date();
  var date = types.getType({ name: 'date', max: max, min: min });
  test.is(date.getMax(), max, 'max setup');

  var incremented = date.increment(min);
  test.is(incremented, max, 'incremented');
};

exports.testIncrement = function(options) {
  var date = types.getType('date');
  var conversion = date.parse(new Argument('now'));
  var plusOne = date.increment(conversion.value);
  var minusOne = date.decrement(plusOne);
  test.is(conversion.value.toString(), new Date().toString(), 'plus minus');
};

});
