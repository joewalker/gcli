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
var examiner = exports;

var assert = require('test/assert');
var stati = require('test/status').stati;

/**
 * Test harness data
 */
examiner.suites = {};

/**
 * The gap between tests when running async
 */
var delay = 10;

/**
 * Add a test suite. Generally used like:
 * test.addSuite('foo', require('path/to/foo'));
 */
examiner.addSuite = function(name, suite) {
  examiner.suites[name] = new Suite(name, suite);
};

/**
 * Run all the tests asynchronously
 */
examiner.runAsync = function(options, callback) {
  this._callback = callback;
  this._runAsyncInternal(0, options);
};

/**
 * Run all the test suits asynchronously
 */
examiner._runAsyncInternal = function(i, options) {
  if (i >= Object.keys(examiner.suites).length) {
    if (typeof this._callback === 'function') {
      this._callback.call();
      this._callback = undefined;
    }
    return;
  }

  var suiteName = Object.keys(examiner.suites)[i];
  var onComplete = function() {
    examiner._runAsyncInternal(i + 1, options);
  }.bind(this);

  examiner.suites[suiteName].runAsync(options, onComplete);
};

/**
 * Create a JSON object suitable for serialization
 */
examiner.toRemote = function() {
  return {
    suites: Object.keys(examiner.suites).map(function(suiteName) {
      return examiner.suites[suiteName].toRemote();
    }.bind(this)),
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
  Object.keys(examiner.suites).forEach(function(suiteName) {
    examiner.suites[suiteName].reset();
  }, this);
};

/**
 * The number of checks in this set of test suites is the sum of the checks in
 * the test suites.
 */
Object.defineProperty(examiner, 'checks', {
  get: function() {
    return  Object.keys(examiner.suites).reduce(function(current, suiteName) {
      return current + examiner.suites[suiteName].checks;
    }.bind(this), 0);
  },
  enumerable: true
});

/**
 * The status of this set of test suites is the worst of the statuses of the
 * contained test suites.
 */
Object.defineProperty(examiner, 'status', {
  get: function() {
    return Object.keys(examiner.suites).reduce(function(status, suiteName) {
      var suiteStatus = examiner.suites[suiteName].status;
      return status.index > suiteStatus.index ? status : suiteStatus;
    }.bind(this), stati.notrun);
  },
  enumerable: true
});

/**
 * Output a test summary to console.log
 */
examiner.detailedResultLog = function() {
  Object.keys(this.suites).forEach(function(suiteName) {
    var suite = examiner.suites[suiteName];

    console.log(suite.name + ': ' + suite.status.name + ' (funcs=' +
            Object.keys(suite.tests).length +
            ', checks=' + suite.checks + ')');

    Object.keys(suite.tests).forEach(function(testName) {
      var test = suite.tests[testName];
      if (test.status !== stati.done || test.failures.length !== 0) {
        console.log('- ' + test.name + ': ' + test.status.name);
        test.failures.forEach(function(failure) {
          console.log('  - ' + failure.message);
          if (failure.params) {
            console.log('    - P1: ' + failure.p1);
            console.log('    - P2: ' + failure.p2);
          }
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));

  console.log();
  console.log('Summary: ' + this.status.name + ' (' + this.checks + ' checks)');
};

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
  }.bind(this));
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
 * Run all the tests in this suite asynchronously
 */
Suite.prototype.runAsync = function(options, callback) {
  this._callback = callback;
  this._setup(options);
  this._runAsyncInternal(0, options);
};

/**
 * Function used by the async runners that can handle async recursion.
 */
Suite.prototype._runAsyncInternal = function(i, options) {
  if (i >= Object.keys(this.tests).length) {
    this._shutdown(options);
    this._callback.call();
    this._callback = undefined;
    return;
  }

  var testName = Object.keys(this.tests)[i];
  var onComplete = function() {
    this._runAsyncInternal(i + 1, options);
  }.bind(this);

  this.tests[testName].runAsync(options, onComplete);
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
  this.status = stati.notrun;
  this.checks = 0;
};

/**
 * Run all the tests in this suite asynchronously
 */
Test.prototype.runAsync = function(options, callback) {
  assert.currentTest = this;
  this.status = stati.executing;

  this.outstanding = [];
  this.callback = callback;

  // console.log('START: ' + assert.currentTest);

  var tester = assert.checkCalled(function() {
    try {
      this.func.apply(this.suite, [ options ]);
    }
    catch (ex) {
      assert.ok(false, '' + ex);
      console.error(ex.stack);
      if ((options.isNode || options.isFirefox) && ex.stack) {
        console.error(ex.stack);
      }
    }

    assert.currentTest = null;
  }.bind(this));

  tester();
};

/**
 * Check to see if the currently executing test is completed (i.e. the list of
 * outstanding tasks has all been completed)
 */
Test.prototype.checkFinish = function() {
  if (this.outstanding == null) {
    throw new Error('Test.checkFinish double called');
  }

  if (this.outstanding.length === 0) {
    if (this.status === stati.executing) {
      this.status = stati.done;
    }

    // console.log('END: ' + assert.currentTest);

    // this.outstanding = undefined;
    setTimeout(function() {
      this.callback.call();
      this.callback = undefined;
    }.bind(this), delay);
  }
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
