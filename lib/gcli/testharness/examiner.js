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

'use strict';
var examiner = exports;

var util = require('../util/util');
var assert = require('./assert');
var stati = require('./status').stati;

/**
 * Test harness data
 */
examiner._suites = {};

/**
 * The gap between tests when running async
 */
var delay = 10;

/**
 * Add a test suite. Generally used like:
 * test.addSuite('foo', require('path/to/foo'));
 */
examiner.addSuite = function(name, suite) {
  examiner._suites[name] = new Suite(name, suite);
};

/**
 * Provide a clone of examiner._suites for external consumption
 */
Object.defineProperty(examiner, 'suites', {
  get: function() {
    var reply = {};
    Object.keys(examiner._suites).forEach(name => {
      reply[name] = examiner._suites[name];
    });
    return reply;
  },
  enumerable: true
});

/**
 * Run all the tests asynchronously
 */
examiner.run = function(options) {
  var suiteNames = Object.keys(examiner._suites);
  return util.promiseEach(suiteNames, suiteName => {
    return examiner._suites[suiteName].run(options);
  });
};

/**
 * Create a JSON object suitable for serialization
 */
examiner.toRemote = function() {
  return {
    suites: Object.keys(examiner._suites).map(suiteName => {
      return examiner._suites[suiteName].toRemote();
    }),
    summary: {
      checks: this.checks,
      status: this.status
    }
  };
};

/**
 * Reset all the tests to their original state
 */
examiner.reset = function() {
  Object.keys(examiner._suites).forEach(suiteName => {
    examiner._suites[suiteName].reset();
  });
};

/**
 * The number of checks in this set of test suites is the sum of the checks in
 * the test suites.
 */
Object.defineProperty(examiner, 'checks', {
  get: function() {
    return Object.keys(examiner._suites).reduce((current, suiteName) => {
      return current + examiner._suites[suiteName].checks;
    }, 0);
  },
  enumerable: true
});

/**
 * The status of this set of test suites is the worst of the statuses of the
 * contained test suites.
 */
Object.defineProperty(examiner, 'status', {
  get: function() {
    return Object.keys(examiner._suites).reduce((status, suiteName) => {
      var suiteStatus = examiner._suites[suiteName].status;
      return status.index > suiteStatus.index ? status : suiteStatus;
    }, stati.notrun);
  },
  enumerable: true
});

/**
 * Return a test summary
 */
examiner.detailedResultLog = function(name) {
  var reply = name + ' Summary: ' + this.status.name +
              ' (' + this.checks + ' checks)';

  if (this.status !== stati.pass) {
    reply += '\n';
    Object.keys(this.suites).forEach(suiteName => {
      var suite = examiner._suites[suiteName];
      if (suite.status !== stati.pass) {
        reply += '- ' + suite.name + ': ' + suite.status.name +
                 ' (funcs=' + Object.keys(suite.tests).length +
                 ', checks=' + suite.checks +
                 ', skipped=' + suite.skippedCount + ')\n';

        Object.keys(suite.tests).forEach(testName => {
          var test = suite.tests[testName];
          if (test.status !== stati.pass) {
            reply += '  - ' + test.name + ': ' + test.status.name + '\n';
            test.failures.forEach(failure => {
              reply += '    - ' + failure.message + '\n';
              if (failure.params) {
                reply += '      - (Actual)   P1: ' + failure.p1 + '\n';
                reply += '      - (Expected) P2: ' + failure.p2 + '\n';
              }
            }, this);
          }
        }, this);
      }
    }, this);
  }

  return reply;
};

/**
 * A suite is a group of tests
 */
function Suite(suiteName, suite) {
  this.name = suiteName;
  this.suite = suite;

  this.tests = {};

  Object.keys(suite).forEach(testName => {
    if (testName !== 'setup' && testName !== 'shutdown') {
      var test = new Test(this, testName, suite[testName]);
      this.tests[testName] = test;
    }
  }, this);
}

/**
 * Reset all the tests to their original state
 */
Suite.prototype.reset = function() {
  Object.keys(this.tests).forEach(testName => this.tests[testName].reset());
};

/**
 * Run all the tests in this suite asynchronously (includes doing a setup and
 * shutdown of the suite)
 */
Suite.prototype.run = function(options) {
  return Promise.resolve(this._setup(options)).then(() => {
    var testNames = Object.keys(this.tests);
    var runTest = testName => this.tests[testName].run(options);

    return util.promiseEach(testNames, runTest).then(() => this._shutdown(options));
  });
};

/**
 * Create a JSON object suitable for serialization
 */
Suite.prototype.toRemote = function() {
  return {
    name: this.name,
    tests: Object.keys(this.tests).map(testName => this.tests[testName].toRemote())
  };
};

/**
 * The number of checks in this suite is the sum of the checks in the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'checks', {
  get: function() {
    return Object.keys(this.tests).reduce((prevChecks, testName) => prevChecks + this.tests[testName].checks, 0);
  },
  enumerable: true
});

/**
 * The status of a test suite is the worst of the statuses of the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'status', {
  get: function() {
    return Object.keys(this.tests).reduce((prevStatus, testName) => {
      var suiteStatus = this.tests[testName].status;
      return prevStatus.index > suiteStatus.index ? prevStatus : suiteStatus;
    }, stati.notrun);
  },
  enumerable: true
});

/**
 * The status of a test suite is the worst of the statuses of the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'skippedCount', {
  get: function() {
    return Object.keys(this.tests).reduce((count, testName) => count + this.tests[testName].skipped.length, 0);
  },
  enumerable: true
});

/**
 * Defensively setup the test suite
 */
Suite.prototype._setup = function(options) {
  if (typeof this.suite.setup !== 'function') {
    return true;
  }

  try {
    this.suite.setup(options);
    return true;
  }
  catch (ex) {
    this._logToAllTests('' + ex);
    console.error(ex);
    if (ex.stack) {
      console.error(ex.stack);
    }
    return false;
  }
};

/**
 * Defensively shutdown the test suite
 */
Suite.prototype._shutdown = function(options) {
  if (typeof this.suite.shutdown !== 'function') {
    return true;
  }

  try {
    this.suite.shutdown(options);
    return true;
  }
  catch (ex) {
    this._logToAllTests('' + ex);
    console.error(ex);
    if (ex.stack) {
      console.error(ex.stack);
    }
    return false;
  }
};

/**
 * Something has gone wrong that affects all tests in this Suite
 */
Suite.prototype._logToAllTests = function(message) {
  var priorCurrentTest = assert.currentTest;
  Object.keys(this.tests).forEach(testName => {
    assert.currentTest = this.tests[testName];
    assert.ok(false, message);
  });
  assert.currentTest = priorCurrentTest;
};

// -----------------------------------------------------------------------------

/**
 * A test represents data about a single test function
 */
function Test(suite, name, func) {
  this.suite = suite;
  this.name = name;
  this.func = func;
  this.title = name.replace(/^test/, '').replace(/([A-Z])/g, ' $1');

  this.failures = [];
  this.skipped = [];
  this.status = stati.notrun;
  this.checks = 0;
}

Test.prototype.toString = function() {
  return this.suite.name + '.' + this.name;
};

/**
 * Reset the test to its original state
 */
Test.prototype.reset = function() {
  this.failures = [];
  this.skipped = [];
  this.status = stati.notrun;
  this.checks = 0;
};

/**
 * Run all the tests in this suite asynchronously
 */
Test.prototype.run = function(options) {
  assert.currentTest = this;
  this.status = stati.executing;

  if (assert.testLogging) {
    console.log('START: ' + assert.currentTest);
  }

  var promise = new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        var reply = this.func.apply(this.suite, [ options ]);
        Promise.resolve(reply).then(() => {
          resolve();
        }, err => {
          assert.ok(false, 'Returned promise, rejected with: ' + toString(err));
          resolve();
        });
      }
      catch (ex) {
        assert.ok(false, 'Exception: ' + toString(ex));
        resolve();
      }
    }, delay);
  });

  return promise.then(() => {
    if (this.status === stati.executing) {
      this.status = this.failures.length === 0 ? stati.pass : stati.fail;
    }

    if (assert.testLogging) {
      console.log('END: ' + assert.currentTest);
    }

    assert.currentTest = null;
  });
};

/**
 * Object.toString could be a lot better
 */
function toString(err) {
  if (err === null) {
    return 'null';
  }

  if (err === undefined) {
    return 'undefined';
  }

  // Convert err to a string
  if (typeof err === 'string') {
    return err;
  }

  if (err instanceof Error) {
    return '' + err.stack;
  }

  // If an object has it's own toString, that's probably the best way
  if (err.toString !== Object.prototype.toString) {
    return err.toString();
  }

  // Next best is JSON, if the object is JSONable
  try {
    return JSON.stringify(err);
  }
  catch (ex) {
    // Resort to Object.toString otherwise
    err = '' + err;
  }
}

/**
 * Create a JSON object suitable for serialization
 */
Test.prototype.toRemote = function() {
  return {
    name: this.name,
    title: this.title,
    status: this.status,
    failures: this.failures,
    checks: this.checks
  };
};
