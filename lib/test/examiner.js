/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var examiner = exports;


/**
 * Test harness data
 */
examiner.suites = {};

/**
 * The gap between tests when running async
 */
var delay = 10;

var currentTest = null;

var stati = {
  notrun: { index: 0, name: 'Skipped' },
  executing: { index: 1, name: 'Executing' },
  asynchronous: { index: 2, name: 'Waiting' },
  pass: { index: 3, name: 'Pass' },
  fail: { index: 4, name: 'Fail' }
};

/**
 * Add a test suite. Generally used like:
 * test.addSuite('foo', require('path/to/foo'));
 */
examiner.addSuite = function(name, suite) {
  examiner.suites[name] = new Suite(name, suite);
};

/**
 * Run the tests defined in the test suite synchronously
 * @param options How the tests are run. Properties include:
 * - window: The browser window object to run the tests against
 * - useFakeWindow: Use a test subset and a fake DOM to avoid a real document
 * - detailedResultLog: console.log test passes and failures in more detail
 */
examiner.run = function(options) {
  examiner._checkOptions(options);

  Object.keys(examiner.suites).forEach(function(suiteName) {
    var suite = examiner.suites[suiteName];
    suite.run(options);
  }.bind(this));

  if (options.detailedResultLog) {
    examiner.log();
  }
  else {
    console.log('Completed test suite');
  }

  return examiner.suites;
};

/**
 * Check the options object. There should be either useFakeWindow or a window.
 * Setup the fake window if requested.
 */
examiner._checkOptions = function(options) {
  if (options.useFakeWindow) {
    // A minimum fake dom to get us through the JS tests
    var doc = { title: 'Fake DOM' };
    var fakeWindow = {
      window: { document: doc },
      document: doc
    };

    options.window = fakeWindow;
  }

  if (!options.window) {
    throw new Error('Tests need either window or useFakeWindow');
  }
};

/**
 * Run all the tests asynchronously
 */
examiner.runAsync = function(options, callback) {
  examiner._checkOptions(options);
  this.runAsyncInternal(0, options, callback);
};

/**
 * Run all the test suits asynchronously
 */
examiner.runAsyncInternal = function(i, options, callback) {
  if (i >= Object.keys(examiner.suites).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var suiteName = Object.keys(examiner.suites)[i];
  examiner.suites[suiteName].runAsync(options, function() {
    setTimeout(function() {
      examiner.runAsyncInternal(i + 1, options, callback);
    }.bind(this), delay);
  }.bind(this));
};

/**
 *
 */
examiner.reportToText = function() {
  return JSON.stringify(examiner.toRemote());
};

/**
 * Create a JSON object suitable for serialization
 */
examiner.toRemote = function() {
  return {
    suites: Object.keys(examiner.suites).map(function(suiteName) {
      return examiner.suites[suiteName].toRemote();
    }.bind(this))
  };
};

/**
 * Output a test summary to console.log
 */
examiner.log = function() {
  var remote = this.toRemote();
  remote.suites.forEach(function(suite) {
    console.log(suite.name);
    suite.tests.forEach(function(test) {
      console.log('- ' + test.name, test.status.name, test.message || '');
    });
  });
};

/**
 * Used by assert to record a failure against the current test
 */
examiner.recordError = function(message) {
  if (!currentTest) {
    console.error('No currentTest for ' + message);
    return;
  }

  currentTest.status = stati.fail;

  if (Array.isArray(message)) {
    currentTest.messages.push.apply(currentTest.messages, message);
  }
  else {
    currentTest.messages.push(message);
  }
};

/**
 * A suite is a group of tests
 */
function Suite(suiteName, suite) {
  this.name = suiteName;
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
  if (typeof this.suite.setup == "function") {
    this.suite.setup(options);
  }

  Object.keys(this.tests).forEach(function(testName) {
    var test = this.tests[testName];
    test.run(options);
  }.bind(this));

  if (typeof this.suite.shutdown == "function") {
    this.suite.shutdown(options);
  }
};

/**
 * Run all the tests in this suite asynchronously
 */
Suite.prototype.runAsync = function(options, callback) {
  if (typeof this.suite.setup == "function") {
    this.suite.setup(options);
  }

  this.runAsyncInternal(0, options, function() {
    if (typeof this.suite.shutdown == "function") {
      this.suite.shutdown(options);
    }

    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this));
};

/**
 * Function used by the async runners that can handle async recursion.
 */
Suite.prototype.runAsyncInternal = function(i, options, callback) {
  if (i >= Object.keys(this.tests).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var testName = Object.keys(this.tests)[i];
  this.tests[testName].runAsync(options, function() {
    setTimeout(function() {
      this.runAsyncInternal(i + 1, options, callback);
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
 * A test represents data about a single test function
 */
function Test(suite, name, func) {
  this.suite = suite;
  this.name = name;
  this.func = func;
  this.title = name.replace(/^test/, '').replace(/([A-Z])/g, ' $1');

  this.messages = [];
  this.status = stati.notrun;
}

/**
 * Run just a single test
 */
Test.prototype.run = function(options) {
  currentTest = this;
  this.status = stati.executing;
  this.messages = [];

  try {
    this.func.apply(this.suite, [ options ]);
  }
  catch (ex) {
    this.status = stati.fail;
    this.messages.push('' + ex);
    console.error(ex);
    if (ex.stack) {
      console.error(ex.stack);
    }
  }

  if (this.status === stati.executing) {
    this.status = stati.pass;
  }

  currentTest = null;
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
    messages: this.messages
  };
};


});
