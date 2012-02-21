/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var cli = require('gcli/cli');
  var basic = require('gcli/types/basic');
  var javascript = require('gcli/types/javascript');
  var node = require('gcli/types/node');

  var Requisition = require('gcli/cli').Requisition;
  var Display = require('gcli/ui/display').Display;

  /**
   * Called from gclichrome.xul
   */
  exports.startup = function(window) {
    var enabled;
    try {
      enabled = Services.prefs.getBoolPref("devtools.gclichrome.enable");
    }
    catch (ex) {
      dump('devtools.gclichrome.enable is not set: ' + ex + '\n');
    }

    if (!enabled) {
      console.log('devtools.gclichrome.enable is not set: ' + ex + '\n');
      return;
    }

    basic.startup();
    javascript.startup();
    node.startup();
    cli.startup();

    javascript.setGlobalObject(window);
    node.setDocument(window.document);
    cli.setEvalFunction(window.eval);

    var opts = {
      document: window.document,
      requisition: new Requisition(opts, window.document)
    };
    opts.display = new Display(opts);
  };
});
