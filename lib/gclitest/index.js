/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var examiner = require('gclitest/suite').examiner;

  /**
   * Run the tests defined in the test suite
   * @param options How the tests are run. Properties include:
   * - window: The browser window object to run the tests against
   * - useFakeWindow: Use a test subset and a fake DOM to avoid a real document
   * - detailedResultLog: console.log test passes and failures in more detail
   */
  exports.run = function(options) {
    options = options || {};

    if (options.useFakeWindow) {
      // A minimum fake dom to get us through the JS tests
      var doc = { title: 'Fake DOM' };
      var fakeWindow = {
        window: { document: doc },
        document: doc
      };

      options.window = fakeWindow;
    }

    examiner.run(options);

    if (options.detailedResultLog) {
      examiner.log();
    }
    else {
      console.log('Completed test suite');
    }
  };
});
