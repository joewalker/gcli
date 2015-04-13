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
var examiner = require('../testharness/examiner');
var KeyEvent = require('../util/util').KeyEvent;

var test = require('../commands/test');
var helpers = require('./helpers');
var mockCommands = require('./mockCommands');
var createTerminalAutomator = require('./automators/terminal').createTerminalAutomator;
require('./suite');

/**
 * Some tricks to make studying the command line state easier
 */
var addDebugAids = exports.addDebugAids = function(options) {
  window.createDebugCheck = function() {
    helpers._createDebugCheck(options).then(function() {
      // Don't inline this - chrome console suckage
      console.log.apply(console, arguments);
    }, util.errorHandler);
  };

  window.summaryJson = function() {
    var args = [ 'Requisition: ' ];
    var summary = options.terminal.language.requisition._summaryJson;
    Object.keys(summary).forEach(function(name) {
      args.push(' ' + name + '=');
      args.push(summary[name]);
    });
    console.log.apply(console, args);

    console.log('Focus: ' +
                'tooltip=', options.terminal.focusManager._shouldShowTooltip(),
                'output=', options.terminal.focusManager._shouldShowOutput());
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
exports.run = function(terminal, isRemote) {
  var options = {
    terminal: terminal,
    window: window,
    automator: createTerminalAutomator(terminal),
    requisition: terminal.language.requisition,
    isNode: false,
    isFirefox: false,
    isPhantomjs: (window.navigator.userAgent.indexOf('hantom') !== -1),
    isRemote: isRemote,
    hideExec: true
  };

  addDebugAids(options);

  // phantom-test.js does phantom.exit() on `document.complete = true`
  var closeIfPhantomJs = function() {
    if (options.isPhantomjs) {
      document.complete = true;
    }
  };

  // PhantomJS may tell us to tell the server to shutdown
  if (window.location.href.indexOf('shutdown=true') > 0) {
    shutdownServer(terminal.language.requisition).then(closeIfPhantomJs, closeIfPhantomJs);
    return;
  }

  test.optionsContainer.push(options);

  helpers.resetResponseTimes();
  examiner.reset();

  setMocks(options, true).then(function() {
    return examiner.run(options).then(function() {
      var name = options.isPhantomjs ? '\nPhantomJS' : 'Browser';

      console.log(examiner.detailedResultLog(name));
      console.log(helpers.timingSummary);
      document.testStatus = examiner.status.name;

      setMocks(options, false).then(closeIfPhantomJs).catch(function(ex) {
        console.error(ex);
        closeIfPhantomJs();
      });
    });
  }, util.errorHandler);
};

/**
 * Turn mock commands and settings on/off
 */
function setMocks(options, state) {
  var command = 'mocks ' + (state ? 'on' : 'off');
  return options.requisition.updateExec(command).then(function(data) {
    // We're calling "mocks on" on the server, but we still need to
    // register the mockCommand converters on the client
    var requiredConverters = mockCommands.items.filter(function(item) {
      return item.item === 'converter';
    });

    if (state) {
      options.requisition.system.addItems(requiredConverters);
    }
    else {
      options.requisition.system.removeItems(requiredConverters);

    }

    if (data.error) {
      throw new Error('Failed to toggle mocks');
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
