/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  /**
   * This should really be inside assert.js, however that is over-ridden by
   * a custom assert.js for mozilla, so we keep it separate to avoid
   * duplicating it in 2 places.
   */
  exports.stati = {
    notrun: { index: 0, name: 'Skipped' },
    executing: { index: 1, name: 'Executing' },
    asynchronous: { index: 2, name: 'Waiting' },
    pass: { index: 3, name: 'Pass' },
    fail: { index: 4, name: 'Fail' }
  };

});
