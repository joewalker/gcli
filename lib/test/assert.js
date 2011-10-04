/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var examiner = require('test/examiner');

exports.ok = function(value, message) {
  if (!value) {
    console.error('not ok ', message);
    console.trace();
    examiner.recordError('not ok' + (message ? ': ' + message : ''));
  }
};

exports.is = function(expected, actual, message) {
  if (expected !== actual) {
    console.error('expected !== actual', expected, actual, message);
    console.trace();
    examiner.recordError('expected=' + expected + ', ' +
                     'actual=' + actual + ': ' + message);
  }
};

});
