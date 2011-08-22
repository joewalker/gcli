/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var assert = exports;

var test = require('test/index');


assert.success = function(message) {
  console.log(message);
};

assert.fail = function(message) {
    assert._recordThrow("fail", arguments);
};

assert.assertTrue = function(value) {
  if (!value) {
    assert._recordThrow("assertTrue", arguments);
  }
};

assert.verifyTrue = function(value) {
  if (!value) {
    assert._recordTrace("verifyTrue", arguments);
  }
};

assert.assertFalse = function(value) {
  if (value) {
    assert._recordThrow("assertFalse", arguments);
  }
};

assert.verifyFalse = function(value) {
  if (value) {
    assert._recordTrace("verifyFalse", arguments);
  }
};

assert.assertNull = function(value) {
  if (value !== null) {
    assert._recordThrow("assertNull", arguments);
  }
};

assert.verifyNull = function(value) {
  if (value !== null) {
    assert._recordTrace("verifyNull", arguments);
  }
};

assert.assertNotNull = function(value) {
  if (value === null) {
    assert._recordThrow("assertNotNull", arguments);
  }
};

assert.verifyNotNull = function(value) {
  if (value === null) {
    assert._recordTrace("verifyNotNull", arguments);
  }
};

assert.assertUndefined = function(value) {
  if (value !== undefined) {
    assert._recordThrow("assertUndefined", arguments);
  }
};

assert.verifyUndefined = function(value) {
  if (value !== undefined) {
    assert._recordTrace("verifyUndefined", arguments);
  }
};

assert.assertNotUndefined = function(value) {
  if (value === undefined) {
    assert._recordThrow("assertNotUndefined", arguments);
  }
};

assert.verifyNotUndefined = function(value) {
  if (value === undefined) {
    assert._recordTrace("verifyNotUndefined", arguments);
  }
};

assert.assertNaN = function(value) {
  if (!isNaN(value)) {
    assert._recordThrow("assertNaN", arguments);
  }
};

assert.verifyNaN = function(value) {
  if (!isNaN(value)) {
    assert._recordTrace("verifyNaN", arguments);
  }
};

assert.assertNotNaN = function(value) {
  if (isNaN(value)) {
    assert._recordThrow("assertNotNaN", arguments);
  }
};

assert.verifyNotNaN = function(value) {
  if (isNaN(value)) {
    assert._recordTrace("verifyNotNaN", arguments);
  }
};

assert.assertSame = function(expected, actual) {
  if (expected !== actual) {
    assert._recordThrow("assertSame", arguments);
  }
};

assert.verifySame = function(expected, actual) {
  if (expected !== actual) {
    assert._recordTrace("verifySame", arguments);
  }
};

assert.assertNotSame = function(expected, actual) {
  if (expected !== actual) {
    assert._recordThrow("assertNotSame", arguments);
  }
};

assert.verifyNotSame = function(expected, actual) {
  if (expected !== actual) {
    assert._recordTrace("verifyNotSame", arguments);
  }
};

assert.assertArraysEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, message);
    assert._recordThrow("assertEqual", args);
  }
};

assert.verifyArraysEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, message);
    assert._recordTrace("assertEqual", args);
  }
};

assert.assertArraysNotEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (!message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, 'Arrays same');
    assert._recordThrow("assertEqual", args);
  }
};

assert.verifyArraysNotEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (!message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, 'Arrays same');
    assert._recordTrace("assertEqual", args);
  }
};

function compareArrays(expected, actual) {
  var reply = { isEqual: true, messages: [] };
  if (expected === actual) {
    return null;
  }

  if (!Array.isArray(expected)) {
    return "expected is not an array";
  }

  if (!Array.isArray(actual)) {
    return "actual is not an array";
  }

  if (actual.length != expected.length) {
    return "expected array length = " + expected.length +
        ", actual array length = " + actual.length;
  }

  for (var i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      return "element " + i + " does not match";
    }
  }

  return null;
}


assert._recordTrace = function() {
  assert._record.apply(this, arguments);
  console.trace();
};

assert._recordThrow = function() {
  assert._record.apply(this, arguments);
  throw new Error();
};

assert._record = function() {
  console.error(arguments);
  var message = arguments[0] + "(";
  var data = arguments[1];
  if (typeof data == "string") {
    message += data;
  }
  else {
    for (var i = 0; i < data.length; i++) {
      if (i != 0) {
        message += ", ";
      }
      message += data[i];
    }
  }
  message += ")";

  test.recordError(message);
};


});
