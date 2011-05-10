/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Joe Walker (jwalker@mozilla.com) (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
var test = exports;


var dom = require('pilot/dom');
var gcli = require('gcli/index');

var testCss = require("text!test/ui/test.css");
var testHtml = require('text!test/ui/test.html');


/**
 * The 'test' command
 */
var testCommandSpec = {
    name: 'test',
    description: 'Runs the GCLI Unit Tests',
    params: [],
    exec: function() {
        displayTestTable();
        updateTestResults();

        var promise = gcli.createPromise();


        return promise;
    }
};

/**
 * This just registers a 'test' command'
 */
test.startup = function(options) {
    gcli.addCommand(testCommandSpec);

    doc = (options && options.document) ? options.document : document;
    dom.importCssString(testCss, doc);

    templates = dom.createElement('div', null, doc);
    dom.setInnerHtml(templates, testHtml);
};

test.shutdown = function() {
    gcli.removeCommand(testCommandSpec);
};


/**
 * Test harness data
 */
var suites = {};
var delay = 10;

var doc;
var templates;

var currentTest = null;

var stati = {
    notrun: { index: 0, background: '#EEE', color: '#000', name: 'Skipped' },
    executing: { index: 1, background: '#888', color: '#FFF', name: 'Executing' },
    asynchronous: { index: 2, background: '#FFA', color: '#000', name: 'Waiting' },
    pass: { index: 3, background: '#8F8', color: '#000', name: 'Pass' },
    fail: { index: 4, background: '#F00', color: '#FFF', name: 'Fail' }
};

/**
 * Add a test suite. Generally used like:
 * test.addSuite('foo', require('path/to/foo'));
 */
test.addSuite = function(name, suite) {
    suites[name] = new Suite(name, suite);
};

/**
 * Loop through all the suites pulling out the individual tests
 */
test.getAllTests = function() {
    var tests = [];
    Object.keys(suites).forEach(function(suiteName) {
        var suite = suites[suiteName];
        Object.keys(suite.tests).forEach(function(testName) {
            tests.push(suite.tests[testName]);
        }.bind(this));
    }.bind(this));
    return tests;
};

/**
 * Run all the tests synchronously
 */
test.run = function() {
    var tests = test.getAllTests();
    tests.forEach(function(test) {
        test.run();
    }.bind(this));
    return tests;
};

/**
 * Run all the tests asynchronously
 */
test.runAsync = function(callback) {
    runAsyncInternal(0, test.getAllTests(), callback);
};

/**
 *
 */
test.reportToText = function(report) {

};

/**
 * Function used by the async runners that can handle async recursion.
 */
function runAsyncInternal(i, tests, callback) {
    if (i >= tests.length) {
        if (typeof callback === 'function') {
            callback();
        }
        return;
    }

    tests[i].run();
    setTimeout(function() {
        runAsyncInternal(i + 1, tests, callback);
    }.bind(this), delay);
}

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
    this.tests.forEach(function(test) {
        test.run();
    }.bind(this));
};

/**
 * Run all the tests in this suite asynchronously
 */
Suite.prototype.runAsync = function(callback) {
    runAsyncInternal(0, this.tests, callback);
};


/**
 * A test represents data about a single test function
 */
function Test(suite, name, func) {
    this.suite = suite;
    this.name = name;
    this.func = func;

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

    this.status = stati.pass;
    currentTest = null;
};


});
