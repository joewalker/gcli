/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var test = exports;


var dom = require('gcli/util').dom;

var gcli = require('gcli/index');
var Templater = require("gcli/ui/domtemplate").Templater;

var testCss = require("text!test/ui/test.css");
var testHtml = require('text!test/ui/test.html');


var template;

/**
 * The 'test' command
 */
var testCommandSpec = {
  name: 'test',
  description: 'Runs the GCLI Unit Tests',
  params: [],
  exec: function(env, context) {
    if (!template) {
      dom.importCss(testCss, context.document);
      template = dom.createElement(context.document, 'div');
      dom.setInnerHtml(template, testHtml);
    }

    var promise = context.createPromise();
    test.runAsync(function() {
      var newNode = template.cloneNode(true);
      new Templater().processNode(newNode, test.toRemote());
      promise.resolve(newNode);
    });
    return promise;
  }
};


/**
 * This just registers a 'test' command'
 */
gcli.addCommand(testCommandSpec);


/**
 * Test harness data
 */
test.suites = {};

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
test.addSuite = function(name, suite) {
  test.suites[name] = new Suite(name, suite);
};

/**
 * Run all the tests synchronously
 */
test.run = function() {
  Object.keys(test.suites).forEach(function(suiteName) {
    var suite = test.suites[suiteName];
    suite.run();
  }.bind(this));
  return test.suites;
};

/**
 * Run all the tests asynchronously
 */
test.runAsync = function(callback) {
  this.runAsyncInternal(0, callback);
};

/**
 * Run all the test suits asynchronously
 */
test.runAsyncInternal = function(i, callback) {
  if (i >= Object.keys(test.suites).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var suiteName = Object.keys(test.suites)[i];
  test.suites[suiteName].runAsync(function() {
    setTimeout(function() {
      test.runAsyncInternal(i + 1, callback);
    }.bind(this), delay);
  }.bind(this));
};

/**
 *
 */
test.reportToText = function() {
  return JSON.stringify(test.toRemote());
};

/**
 * Create a JSON object suitable for serialization
 */
test.toRemote = function() {
  return {
    suites: Object.keys(test.suites).map(function(suiteName) {
      return test.suites[suiteName].toRemote();
    }.bind(this))
  };
};

/**
 * Used by assert to record a failure against the current test
 */
test.recordError = function(message) {
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
Suite.prototype.run = function() {
  if (typeof this.suite.setup == "function") {
    this.suite.setup();
  }

  Object.keys(this.tests).forEach(function(testName) {
    var test = this.tests[testName];
    test.run();
  }.bind(this));

  if (typeof this.suite.shutdown == "function") {
    this.suite.shutdown();
  }
};

/**
 * Run all the tests in this suite asynchronously
 */
Suite.prototype.runAsync = function(callback) {
  if (typeof this.suite.setup == "function") {
    this.suite.setup();
  }

  this.runAsyncInternal(0, function() {
    if (typeof this.suite.shutdown == "function") {
      this.suite.shutdown();
    }

    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this));
};

/**
 * Function used by the async runners that can handle async recursion.
 */
Suite.prototype.runAsyncInternal = function(i, callback) {
  if (i >= Object.keys(this.tests).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var testName = Object.keys(this.tests)[i];
  this.tests[testName].runAsync(function() {
    setTimeout(function() {
      this.runAsyncInternal(i + 1, callback);
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
Test.prototype.run = function() {
  currentTest = this;
  this.status = stati.executing;
  this.messages = [];

  try {
    this.func.apply(this.suite);
  }
  catch (ex) {
    this.status = stati.fail;
    this.messages.push('' + ex);
    console.error(ex);
    console.trace();
  }

  if (this.status === stati.executing) {
    this.status = stati.pass;
  }

  currentTest = null;
};

/**
 * Run all the tests in this suite asynchronously
 */
Test.prototype.runAsync = function(callback) {
  setTimeout(function() {
    this.run();
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
