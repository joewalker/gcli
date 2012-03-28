/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var examiner = require('test/examiner');

exports.ok = function(value, message) {
  if (!value) {
    console.error('Failure: ' + message);
    console.trace();
    examiner.recordFailure({ message: message });
  }
  else {
    examiner.recordPass();
  }
};

exports.is = function(expected, actual, message) {
  if (expected !== actual) {
    console.error('Failure: ' + message);
    console.error('- Expected: ', expected);
    console.error('-   Actual: ', actual);
    console.trace();

    examiner.recordFailure({ message: message, expected: expected, actual: actual });
  }
  else {
    examiner.recordPass();
  }
};

exports.log = function(message) {
  examiner.log(message);
};

});
