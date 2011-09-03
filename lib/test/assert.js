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
  assert._record('fail', arguments);
  throw new Error();
};

assert.assertTrue = function(value) {
  if (!value) {
    assert._record('not true', arguments);
    throw new Error();
  }
};

assert.verifyTrue = function(value) {
  if (!value) {
    assert._record('not true', arguments);
    console.trace();
  }
};

assert.assertFalse = function(value) {
  if (value) {
    assert._record('not false', arguments);
    throw new Error();
  }
};

assert.verifyFalse = function(value) {
  if (value) {
    assert._record('not false', arguments);
    console.trace();
  }
};

assert.assertNull = function(value) {
  if (value !== null) {
    assert._record('not null', arguments);
    throw new Error();
  }
};

assert.verifyNull = function(value) {
  if (value !== null) {
    assert._record('not null', arguments);
    console.trace();
  }
};

assert.assertNotNull = function(value) {
  if (value === null) {
    assert._record('is null', arguments);
    throw new Error();
  }
};

assert.verifyNotNull = function(value) {
  if (value === null) {
    assert._record('is null', arguments);
    console.trace();
  }
};

assert.assertUndefined = function(value) {
  if (value !== undefined) {
    assert._record('not undefined', arguments);
    throw new Error();
  }
};

assert.verifyUndefined = function(value) {
  if (value !== undefined) {
    assert._record('not undefined', arguments);
    console.trace();
  }
};

assert.assertNotUndefined = function(value) {
  if (value === undefined) {
    assert._record('is undefined', arguments);
    throw new Error();
  }
};

assert.verifyNotUndefined = function(value) {
  if (value === undefined) {
    assert._record('is undefined', arguments);
    console.trace();
  }
};

assert.assertNaN = function(value) {
  if (!isNaN(value)) {
    assert._record('not NaN', arguments);
    throw new Error();
  }
};

assert.verifyNaN = function(value) {
  if (!isNaN(value)) {
    assert._record('not NaN', arguments);
    console.trace();
  }
};

assert.assertNotNaN = function(value) {
  if (isNaN(value)) {
    assert._record('is NaN', arguments);
    throw new Error();
  }
};

assert.verifyNotNaN = function(value) {
  if (isNaN(value)) {
    assert._record('is NaN', arguments);
    console.trace();
  }
};

assert.assertSame = function(expected, actual) {
  if (expected !== actual) {
    assert._record('not same', arguments);
    throw new Error();
  }
};

assert.verifySame = function(expected, actual) {
  if (expected !== actual) {
    assert._record('not same', arguments);
    console.trace();
  }
};

assert.assertNotSame = function(expected, actual) {
  if (expected !== actual) {
    assert._record('is same', arguments);
    throw new Error();
  }
};

assert.verifyNotSame = function(expected, actual) {
  if (expected !== actual) {
    assert._record('is same', arguments);
    console.trace();
  }
};

assert.assertArraysEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, message);
    assert._record('array not equal', args);
    throw new Error();
  }
};

assert.verifyArraysEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, message);
    assert._record('array not equal', args);
    console.trace();
  }
};

assert.assertArraysNotEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (!message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, 'Arrays same');
    assert._record('array is equal', args);
    throw new Error();
  }
};

assert.verifyArraysNotEqual = function(expected, actual) {
  var message = compareArrays(expected, actual);
  if (!message) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.push.apply(args, 'Arrays same');
    assert._record('array is equal', args);
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
