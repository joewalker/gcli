/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


/**
 * Helper to turn a node background it's complementary color for 1 second.
 * There is likely a better way to do this, but this will do for now.
 */
exports.flashNode = function(node, color) {
  // We avoid changing the DOM under firefox developer tools so this is a no-op
  // In future we will use the multi-highlighter implemented in bug 653545.
};


});
