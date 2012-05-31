/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var types = require('gcli/types');
var Status = require('gcli/types').Status;

var test = require('test/assert');

exports.setup = function(options) {
};

exports.shutdown = function(options) {
};

exports.testParse = function(options) {
  var date = types.getType('date');
  var conversion = date.parse(new Argument('01 Jan 1970'));
  test.is(conversion.value, new Date(), '1/Jan parse');
  test.is(conversion.status, Status.VALID, '1/Jan parse');
};

exports.testMaxMin = function(options) {
  var max = new Date();
  var min = new Date();
  var date = types.getType({ name: 'date', max: max, min: min });
  test.is(date.getMax(), max, 'max setup');

  var incremented = date.increment(min);
  test.is(incremented, max, 'incremented');

  // We need to think about how step is implemented. day/hour/etc
};


});
