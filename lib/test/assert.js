/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var assert = exports;

var test = require('test/index');

exports.ok = function(value, message) {
  if (!value) {
    console.error('not ok ', message);
    console.trace();
    test.recordError('not ok' + (message ? ': ' + message : ''));
  }
};

assert.verifyUndefined = function(value) {
  if (value !== undefined) {
    assert._record('not undefined', arguments);
    console.trace();
  }
};

exports.is = function(expected, actual, message) {
  if (expected !== actual) {
assert.verifyArraysEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, message);
    assert._record('array not equal', args);
    console.trace();
  }
};

function compareArrays(expected, actual) {
  var reply = { isEqual: true, messages: [] };
  if (expected === actual) {
    return null;
  }

  if (!Array.isArray(expected)) {
    return 'expected is not an array';
  }

  if (!Array.isArray(actual)) {
    return 'actual is not an array';
  }

  if (actual.length != expected.length) {
    return 'expected array length = ' + expected.length +
        ', actual array length = ' + actual.length;
  }

  for (var i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      return 'element ' + i + ' does not match';
    }
  }

  return null;
}

assert._record = function(name, args) {
  console.error(name, args);

  var message = name + ' ';
  for (var i = 0; i < args.length; i++) {
    message += (i != 0) ? ', ' + args[i] : args[i];
  }
  test.recordError(message);
};


});
