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

  var examiner = require('gclitest/suite').examiner;
  var settings = require('gcli/settings');
  var Display = require('gcli/ui/display').Display;

  // A minimum fake dom to get us through the JS tests
  var fakeWindow = {
    isFake: true,
    document: { title: 'Fake DOM' }
  };
  fakeWindow.window = fakeWindow;
  examiner.defaultOptions = {
    window: fakeWindow,
    hideExec: true
  };

  /**
   * A simple proxy to examiner.run, for convenience - this is run from the
   * top level.
   * @param options Lookup of options that customize test running. Includes:
   * - window (default=undefined) A reference to the DOM window. If left
   *   undefined then a reduced set of tests will run.
   * - isNode (default=false) Are we running under NodeJS, specifically, are we
   *   using JSDom, which isn't a 100% complete DOM implementation.
   *   Some tests are skipped when using NodeJS.
   * - display (default=undefined) A reference to a Display implementation.
   *   A reduced set of tests will run if left undefined
   * - detailedResultLog (default=false) do we output a test summary to
   *   |console.log| on test completion.
   * - hideExec (default=false) Set the |hidden| property in calls to
   *   |requisition.exec()| which prevents the display from becoming messed up,
   *   however use of hideExec restricts the set of tests that are run
   */
  exports.run = function(options) {
    options = options || {};
    examiner.mergeDefaultOptions(options);

    examiner.reset();
    examiner.run(options);

    // A better set of default than those specified above, come from the set
    // that are passed to run().
    examiner.defaultOptions = {
      window: options.window,
      display: options.display,
      hideExec: options.hideExec
    };
  };

  /**
   * This is the equivalent of gcli/index.createDisplay() except it:
   * - Sets window.display: to actual Display object (not the thin proxy
   *   returned by gcli/index.createDisplay() and this function)
   * - Registers all the test commands, and provides a function to re-register
   *   them - window.testCommands() (running the test suite un-registers them)
   * - Runs the unit tests automatically on startup
   * - Registers a 'test' command to re-run the unit tests
   */
  exports.createDisplay = function(options) {
    options = options || {};
    if (options.settings != null) {
      settings.setDefaults(options.settings);
    }

    window.display = new Display(options);
    var requisition = window.display.requisition;

    // setTimeout keeps stack traces clear of RequireJS frames
    window.setTimeout(function() {
      var options = {
        window: window,
        display: window.display,
        hideExec: true
      };
      exports.run(options);

      window.createDebugCheck = function() {
        require([ 'gclitest/helpers' ], function(helpers) {
          helpers.setup(options);
          console.log(helpers.createDebugCheck());
          helpers.shutdown(options);
        });
      };

      window.summaryJson = function() {
        var args = [ 'Requisition: ' ];
        var summary = display.requisition._summaryJson;
        Object.keys(summary).forEach(function(name) {
          args.push(' ' + name + '=');
          args.push(summary[name]);
        });
        console.log.apply(console, args);

        console.log('Focus: ' +
                    'tooltip=', display.focusManager._shouldShowTooltip(),
                    'output=', display.focusManager._shouldShowOutput());
      };

      document.addEventListener('keyup', function(ev) {
        if (ev.keyCode === 113 /*F2*/) {
          window.createDebugCheck();
        }
        if (ev.keyCode === 115 /*F4*/) {
          window.summaryJson();
        }
      }, true);

      window.testCommands = function() {
        require([ 'gclitest/mockCommands' ], function(mockCommands) {
          mockCommands.setup();
        });
      };
      window.testCommands();
    }, 10);

    return {
      /**
       * The exact shape of the object returned by exec is likely to change in
       * the near future. If you do use it, please expect your code to break.
       */
      exec: requisition.exec.bind(requisition),
      update: requisition.update.bind(requisition),
      destroy: window.display.destroy.bind(window.display)
    };
  };

});
