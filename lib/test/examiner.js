/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
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
 * When run from an command, there are some options that we can't (and
 * shouldn't) specify, so we allow a set of default options, which are merged
 * with the specified options in |run()|.
 */
examiner.defaultOptions = {};

/**
 * Add properties to |options| from |examiner.defaultOptions| when |options|
 * does not have a value for a given name.
 */
function mergeDefaultOptions(options) {
  Object.keys(examiner.defaultOptions).forEach(function(name) {
    if (options[name] == null) {
      options[name] = examiner.defaultOptions[name];
    }
  });
}

/**
 * Run the tests defined in the test suite synchronously
 */
examiner.run = function(options) {
  mergeDefaultOptions(options);

  Object.keys(examiner.suites).forEach(function(suiteName) {
    var suite = examiner.suites[suiteName];
    suite.run(options);
  }.bind(this));

  if (options.detailedResultLog) {
    examiner.detailedResultLog();
  }
  else {
    console.log('Completed test suite');
  }

  return examiner.suites;
};

/**
 * Run all the tests asynchronously
 */
examiner.runAsync = function(options, callback) {
  mergeDefaultOptions(options);
  this._runAsyncInternal(0, options, callback);
};

/**
 * Run all the test suits asynchronously
 */
examiner._runAsyncInternal = function(i, options, callback) {
  if (i >= Object.keys(examiner.suites).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var suiteName = Object.keys(examiner.suites)[i];
  examiner.suites[suiteName].runAsync(options, function() {
    setTimeout(function() {
      examiner._runAsyncInternal(i + 1, options, callback);
    }.bind(this), delay);
  }.bind(this));
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
      if (test.status !== stati.pass || test.failures.length !== 0) {
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
 * Run all the tests in this suite synchronously
 */
Suite.prototype.run = function(options) {
  if (!this._setup(options)) {
    return;
  }

  Object.keys(this.tests).forEach(function(testName) {
    var test = this.tests[testName];
    test.run(options);
  }.bind(this));

  this._shutdown(options);
};

/**
 * Run all the tests in this suite asynchronously
 */
Suite.prototype.runAsync = function(options, callback) {
  if (!this._setup(options)) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  this._runAsyncInternal(0, options, function() {
    this._shutdown(options);

    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this));
};

/**
 * Function used by the async runners that can handle async recursion.
 */
Suite.prototype._runAsyncInternal = function(i, options, callback) {
  if (i >= Object.keys(this.tests).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var testName = Object.keys(this.tests)[i];
  this.tests[testName].runAsync(options, function() {
    setTimeout(function() {
      this._runAsyncInternal(i + 1, options, callback);
    }.bind(this), delay);
  }.bind(this));
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

/**
 * Run just a single test
 */
Test.prototype.run = function(options) {
  assert.currentTest = this;
  this.status = stati.executing;
  this.failures = [];
  this.checks = 0;

  try {
    this.func.apply(this.suite, [ options ]);
  }
  catch (ex) {
    assert.ok(false, '' + ex);
    console.error(ex);
    if ((options.isNode || options.isFirefox) && ex.stack) {
      console.error(ex.stack);
    }
  }

  if (this.status === stati.executing) {
    this.status = stati.pass;
  }

  assert.currentTest = null;
};

/**
 * Run all the tests in this suite asynchronously
 */
Test.prototype.runAsync = function(options, callback) {
  setTimeout(function() {
    this.run(options);
    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this), delay);
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
