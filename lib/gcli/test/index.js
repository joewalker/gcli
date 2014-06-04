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
var Promise = require('../util/promise').Promise;
var examiner = require('../testharness/examiner');
var KeyEvent = require('../util/util').KeyEvent;

var test = require('../commands/test');
var helpers = require('./helpers');
var createTerminalAutomator = require('./automators/terminal').createTerminalAutomator;
require('./suite');

/**
 * Some tricks to make studying the command line state easier
 */
var addDebugAids = exports.addDebugAids = function(options, terminal) {
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
    if (ev.keyCode === KeyEvent.DOM_VK_F2) {
      window.createDebugCheck();
    }
    if (ev.keyCode === KeyEvent.DOM_VK_F4) {
      window.summaryJson();
    }
  }, true);
};

/**
 * This is the equivalent of gcli/index.createTerminal() except it:
 * - Sets window.display: to actual Display object (not the thin proxy
 *   returned by gcli/index.createTerminal() and this function)
 * - Registers all the test commands, and provides a function to re-register
 *   them - window.testCommands() (running the test suite un-registers them)
 * - Runs the unit tests automatically on startup
 * - Registers a 'test' command to re-run the unit tests
 */
exports.run = function(options) {
  var requisition = options.terminal.language.requisition;

  options.window = window;
  options.automator = createTerminalAutomator(options.terminal);
  options.requisition = requisition;
  options.isNode = false;
  options.isFirefox = false;
  options.isPhantomjs = (window.navigator.userAgent.indexOf('hantom') !== -1);
  options.isRemote = (options.connection != null);
  options.hideExec = true;

  addDebugAids(options, options.terminal);

  // phantom-test.js does phantom.exit() on `document.complete = true`
  var closeIfPhantomJs = function() {
    if (options.isPhantomjs) {
      document.complete = true;
    }
  };

  // PhantomJS may tell us to tell the server to shutdown
  if (window.location.href.indexOf('shutdown=true') > 0) {
    shutdownServer(requisition).then(closeIfPhantomJs, closeIfPhantomJs);
    return;
  }

  test.optionsContainer.push(options);

  helpers.resetResponseTimes();
  examiner.reset();

  setMocks(options, true).then(function() {
    examiner.run(options).then(function() {
      var name = options.isPhantomjs ? '\nPhantomJS' : 'Browser';

      console.log(examiner.detailedResultLog(name));
      console.log(helpers.timingSummary);

      setMocks(options, false).then(closeIfPhantomJs).then(null, function(ex) {
        console.error(ex);
        closeIfPhantomJs();
      });
    });
  });

};

/**
 * Turn mock commands and settings on/off
 */
function setMocks(options, state) {
  var command = 'mocks ' + (state ? 'on' : 'off');
  return options.requisition.updateExec(command).then(function(data) {
    if (data.error) {
      throw new Error('Failed to turn mocks on');
    }
  });
}

/**
 * If the server is started with `--xhr` then we can shut it down remotely.
 * Useful for automated testing.
 */
function shutdownServer(requisition) {
  return requisition.updateExec('connect remote').then(function(output) {
    console.log('exec: connect remote -> ' + output.data);
    return requisition.updateExec('remote server stop').then(function(output2) {
      console.log('exec: remote server stop -> ' + output2.data);
    });
  });
}
