/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

'use strict';

var types = require('gcli/types');
var Argument = require('gcli/argument').Argument;
var Status = require('gcli/types').Status;

var assert = require('test/assert');

exports.testParse = function(options) {
  var date = types.createType('date');
  return date.parse(new Argument('now')).then(function(conversion) {
    // Date comparison - these 2 dates may not be the same, but how close is
    // close enough? If this test takes more than 30secs to run the it will
    // probably time out, so we'll assume that these 2 values must be within
    // 1 min of each other
    var gap = new Date().getTime() - conversion.value.getTime();
    assert.ok(gap < 60000, 'now is less than a minute away');

    assert.is(conversion.getStatus(), Status.VALID, 'now parse');
  });
};

exports.testMaxMin = function(options) {
  var max = new Date();
  var min = new Date();
  var date = types.createType({ name: 'date', max: max, min: min });
  assert.is(date.getMax(), max, 'max setup');

  var incremented = date.increment(min);
  assert.is(incremented, max, 'incremented');
};

exports.testIncrement = function(options) {
  var date = types.createType('date');
  return date.parse(new Argument('now')).then(function(conversion) {
    var plusOne = date.increment(conversion.value);
    var minusOne = date.decrement(plusOne);

    // See comments in testParse
    var gap = new Date().getTime() - minusOne.getTime();
    assert.ok(gap < 60000, 'now is less than a minute away');
  });
};

});
