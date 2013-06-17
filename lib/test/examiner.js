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
var examiner = exports;

var Promise = require('util/promise');
var util = require('util/util');
var assert = require('test/assert');
var stati = require('test/status').stati;

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
  value: function() {
    var reply = {};
    Object.keys(examiner._suites).forEach(function(name) {
      reply[name] = examiner._suites[name];
    });
    return reply;
  },
  enumerable: true
});

/**
 * Run all the tests asynchronously
 */
examiner.run = function(options, callback) {
  var onComplete = function() {
    if (typeof callback === 'function') {
      callback.call();
    }
  };

  var suiteNames = Object.keys(examiner._suites);
  return util.promiseEach(suiteNames, function(suiteName) {
    return examiner._suites[suiteName].run(options);
  }).then(onComplete);
};

/**
 * Create a JSON object suitable for serialization
 */
examiner.toRemote = function() {
  return {
    suites: Object.keys(examiner._suites).map(function(suiteName) {
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
  Object.keys(examiner._suites).forEach(function(suiteName) {
    examiner._suites[suiteName].reset();
  }, this);
};

/**
 * The number of checks in this set of test suites is the sum of the checks in
 * the test suites.
 */
Object.defineProperty(examiner, 'checks', {
  get: function() {
    return  Object.keys(examiner._suites).reduce(function(current, suiteName) {
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
    return Object.keys(examiner._suites).reduce(function(status, suiteName) {
      var suiteStatus = examiner._suites[suiteName].status;
      return status.index > suiteStatus.index ? status : suiteStatus;
    }, stati.notrun);
  },
  enumerable: true
});

/**
 * A suite is a group of tests
 */
function Suite(suiteName, suite) {
  this.name = suiteName.replace(/gclitest\//, '');
  this.suite = suite;

  this.tests = {};

  Object.keys(suite).forEach(function(testName) {
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
  Object.keys(this.tests).forEach(function(testName) {
    this.tests[testName].reset();
  }, this);
};

/**
 * Run all the tests in this suite asynchronously (includes doing a setup and
 * shutdown of the suite)
 */
Suite.prototype.run = function(options) {
  this._setup(options);

  var onComplete = function() {
    this._shutdown(options);
  }.bind(this);

  var testNames = Object.keys(this.tests);
  return util.promiseEach(testNames, function(testName) {
    return this.tests[testName].run(options);
  }.bind(this)).then(onComplete);
};

/**
 * Create a JSON object suitable for serialization
 */
Suite.prototype.toRemote = function() {
  return {
    name: this.name,
    tests: Object.keys(this.tests).map(function(testName) {
      return this.tests[testName].toRemote();
    }.bind(this))
  };
};

/**
 * The number of checks in this suite is the sum of the checks in the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'checks', {
  get: function() {
    return Object.keys(this.tests).reduce(function(prevChecks, testName) {
      return prevChecks + this.tests[testName].checks;
    }.bind(this), 0);
  },
  enumerable: true
});

/**
 * The status of a test suite is the worst of the statuses of the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'status', {
  get: function() {
    return Object.keys(this.tests).reduce(function(prevStatus, testName) {
      var suiteStatus = this.tests[testName].status;
      return prevStatus.index > suiteStatus.index ? prevStatus : suiteStatus;
    }.bind(this), stati.notrun);
  },
  enumerable: true
});

/**
 * The status of a test suite is the worst of the statuses of the contained
 * tests.
 */
Object.defineProperty(Suite.prototype, 'skippedCount', {
  get: function() {
    return Object.keys(this.tests).reduce(function(count, testName) {
      return count + this.tests[testName].skipped.length;
    }.bind(this), 0);
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
  Object.keys(this.tests).forEach(function(testName) {
    assert.currentTest = this.tests[testName];
    assert.ok(false, message);
  }.bind(this));
  assert.currentTest = priorCurrentTest;
};


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

  var deferred = Promise.defer();
  setTimeout(function() {
    try {
      var reply = this.func.apply(this.suite, [ options ]);
      deferred.resolve(reply);
    }
    catch (ex) {
      deferred.reject(ex);
    }
  }.bind(this), delay);

  var onDone = function() {
    if (this.status === stati.executing) {
      this.status = this.failures.length === 0 ? stati.pass : stati.fail;
    }

    if (assert.testLogging) {
      console.log('END: ' + assert.currentTest);
    }

    assert.currentTest = null;
  }.bind(this);

  var onError = function(ex) {
    assert.ok(false, assert.currentTest + ': ' + ex);
    util.errorHandler(ex);
    onDone();
  };

  return deferred.promise.then(onDone, onError);
};

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


});
