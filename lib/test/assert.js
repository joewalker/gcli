/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var stati = require('test/status').stati;

/**
 * Module dependency loop resolution
 * examiner/assert both want to depend on each other, and we'd rather not
 * depend on gcli/util.createEvent (which could make matters worse) so we just
 * have examiner record the current test here.
 */
exports.currentTest = null;

/**
 * Record a test failure if |value| is not truthy
 * Failure is marked by a record being added to the failure list with a message
 * property containing the passed message.
 */
exports.ok = function(value, message) {
  if (!exports.currentTest) {
    console.error('No currentTest for ' + message);
    return;
  }

  if (!value) {
    console.error('Failure: ' + message);
    console.trace();

    exports.currentTest.status = stati.fail;
    exports.currentTest.failures.push({ message: message });
  }
  else {
    exports.currentTest.checks++;
  }
};

/**
 * Record a test failure if |p1 !== p2|
 * Failure is marked by a record being added to the failure list with the
 * following properties:
 * - message: The string passed in to the |is| function
 * - params: (true) To distinguish from an |ok| failure
 * - p1: The first parameter to compare
 * - p2: The second parameter to compare against
 */
exports.is = function(p1, p2, message) {
  if (!exports.currentTest) {
    console.error('No currentTest for ' + failure.message);
    return;
  }

  if (p1 !== p2) {
    console.error('Failure: ' + message);
    console.error('- P1: ', p1);
    console.error('- P2: ', p2);
    console.trace();

    exports.currentTest.status = stati.fail;
    exports.currentTest.failures.push({ message: message, params: true, p1: p1, p2: p2 });
  }
  else {
    exports.currentTest.checks++;
  }
};

/**
 * Add some extra information to the test logs
 */
exports.log = function(message) {
  if (!exports.currentTest) {
    console.error('No currentTest for ' + failure.message);
    return;
  }

  exports.currentTest.failures.push({ message: message });
};


});
