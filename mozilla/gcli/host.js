/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


  /**
   * The chromeWindow as as required by Highlighter, so it knows where to
   * create temporary highlight nodes.
   */
  exports.chromeWindow = undefined;

  /**
   * Helper to turn a set of nodes background another color for 0.5 seconds.
   * There is likely a better way to do this, but this will do for now.
   */
  exports.flashNodes = function(nodes, match) {
    // Commented out until Bug 653545 is completed
    /*
    if (exports.chromeWindow == null) {
      console.log('flashNodes has no chromeWindow. Skipping flash');
      return;
    }

    var imports = {};
    Components.utils.import("resource:///modules/highlighter.jsm", imports);

    imports.Highlighter.flashNodes(nodes, exports.chromeWindow, match);
    */
  };


});
