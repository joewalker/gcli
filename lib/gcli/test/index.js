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

var util = require('../util/util');
var promise = require('../util/promise');
var examiner = require('../testharness/examiner');

var test = require('../commands/test');
var api = require('../api');
var helpers = require('./helpers');
var mockCommands = require('./mockCommands');
var createTerminalAutomator = require('./automators/terminal').createTerminalAutomator;
require('./suite');

var gcli = api.getApi();
gcli.addItems(test.items);
api.populateApi(exports);

/**
 * A simple proxy to examiner.run, for convenience - this is run from the
 * top level.
 * @param options Lookup of options that customize test running. Includes:
 * - window (default=undefined) A reference to the DOM window. If left
 *   undefined then a reduced set of tests will run.
 * - isJsdom (default=false) Are we running under JSDom, specifically, which
 *   isn't a 100% complete DOM implementation.
 *   Some tests are skipped when using NodeJS.
 * - display (default=undefined) A reference to a Display implementation.
 *   A reduced set of tests will run if left undefined
 * - hideExec (default=false) Set the |hidden| property in calls to
 *   |requisition.exec()| which prevents the display from becoming messed up,
 *   however use of hideExec restricts the set of tests that are run
 */
exports.runTests = function(options) {
  examiner.reset();
  return examiner.run(options);
};

var originalCreateTerminal = exports.createTerminal;

/**
 * This is the equivalent of gcli/index.createTerminal() except it:
 * - Sets window.display: to actual Display object (not the thin proxy
 *   returned by gcli/index.createTerminal() and this function)
 * - Registers all the test commands, and provides a function to re-register
 *   them - window.testCommands() (running the test suite un-registers them)
 * - Runs the unit tests automatically on startup
 * - Registers a 'test' command to re-run the unit tests
 */
exports.createTerminal = function(options) {
  return originalCreateTerminal(options).then(function(terminal) {
    var requisition = terminal.language.requisition;

    window.createDebugCheck = function() {
      helpers._createDebugCheck(options).then(function() {
        // Don't inline this - chrome console suckage
        console.log.apply(console, arguments);
      }, util.errorHandler);
    };

    window.summaryJson = function() {
      var args = [ 'Requisition: ' ];
      var summary = requisition._summaryJson;
      Object.keys(summary).forEach(function(name) {
        args.push(' ' + name + '=');
        args.push(summary[name]);
      });
      console.log.apply(console, args);

      console.log('Focus: ' +
                  'tooltip=', terminal.focusManager._shouldShowTooltip(),
                  'output=', terminal.focusManager._shouldShowOutput());
    };

    document.addEventListener('keyup', function(ev) {
      if (ev.keyCode === 113 /*F2*/) {
        window.createDebugCheck();
      }
      if (ev.keyCode === 115 /*F4*/) {
        window.summaryJson();
      }
    }, true);

    promise._reportErrors = true;

    var isPhantomjs = window.navigator.userAgent.indexOf('hantom') !== -1;
    var options = {
      window: window,
      automator: createTerminalAutomator(terminal),
      requisition: requisition,
      isNode: false,
      isFirefox: false,
      isPhantomjs: isPhantomjs,
      isHttp: window.location.protocol === 'http:',
      hideExec: true
    };

    // phantom-test.js does phantom.exit() on `document.complete = true`
    var closeIfPhantomJs = function() {
      if (isPhantomjs) {
        document.complete = true;
      }
    };

    // PhantomJS may tell us to tell the server to shutdown
    if (window.location.href.indexOf('shutdown=true') > 0) {
      shutdownServer(requisition).then(closeIfPhantomJs, closeIfPhantomJs);
      return;
    }

    test.options = options;

    helpers.resetResponseTimes();
    exports.runTests(options).then(function() {
      var name = 'Browser';
      if (options.isPhantomjs) {
        name = '\nPhantomJS/';
        name += (options.isHttp ? 'HTTP' : 'File');
      }

      console.log(examiner.detailedResultLog(name));
      console.log(helpers.timingSummary);

      closeIfPhantomJs();
      mockCommands.setup();
    });

    return terminal;
  });
};

/**
 * If the server is started with `--websocket --allowexec` then we can shut
 * it down remotely. Useful for automated testing.
 */
function shutdownServer(requisition) {
  return requisition.updateExec('connect remote').then(function(output) {
    console.log('exec: connect remote -> ' + output.data);
    return requisition.updateExec('remote server stop').then(function(output2) {
      console.log('exec: remote server stop -> ' + output2.data);
    });
  });
}
