/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var examiner = require('gclitest/suite').examiner;

  /**
   * A simple proxy to examiner.run, for convenience - this is run from the
   * top level.
   */
  exports.run = function(options) {
    examiner.run(options || {});
  };
});
