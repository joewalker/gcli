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

exports.is = function(p1, p2, message) {
  if (p1 !== p2) {
    console.error('Failure: ' + message);
    console.error('- P1: ', p1);
    console.error('- P2: ', p2);
    console.trace();

    examiner.recordFailure({ message: message, params: true, p1: p1, p2: p2 });
  }
  else {
    examiner.recordPass();
  }
};

exports.log = function(message) {
  examiner.log(message);
};

});
