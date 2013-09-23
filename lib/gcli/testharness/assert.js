/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(function(require, exports, module) {

'use strict';

/**
 * Module dependency loop resolution
 * examiner/assert both want to depend on each other, and we'd rather not
 * depend on util.createEvent (which could make matters worse) so we just
 * have examiner record the current test here.
 */
exports.currentTest = null;

/**
 * To we log what's going on with the tests. Useful for when something is going
 * bizarrely wrong, and we want to know what.
 */
exports.testLogging = false;

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
    console.error('No currentTest for ' + message);
    return;
  }

  if (p1 !== p2) {
    console.error('Failure: ' + message + ' (in ' + exports.currentTest + ')');
    console.error('- (Actual)   P1: ', typeof p1 === 'string' ? '"' + p1 + '"' : p1);
    console.error('- (Expected) P2: ', typeof p2 === 'string' ? '"' + p2 + '"' : p2);

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
    console.error('No currentTest for ' + message);
    return;
  }

  exports.currentTest.skipped.push({ message: message });
};


});
