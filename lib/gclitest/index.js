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
    examiner.run(options || {});

    // A better set of default than those specified above, come from the set
    // that are passed to run().
    examiner.defaultOptions = {
      window: options.window,
      display: options.display,
      hideExec: options.hideExec
    };
  };

});
