/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var mozl10n = {};

(function(aMozl10n) {
  var temp = {};
  Components.utils.import("resource://gre/modules/Services.jsm", temp);
  var stringBundle = temp.Services.strings.createBundle(
          "chrome://browser/locale/devtools/gclicommands.properties");

  /**
   * Lookup a string in the GCLI string bundle
   * @param name The name to lookup
   * @return The looked up name
   */
  aMozl10n.lookup = function(name) {
    try {
      return stringBundle.GetStringFromName(name);
    }
    catch (ex) {
      throw new Error("Failure in lookup('" + name + "')");
    }
  };

  /**
   * Lookup a string in the GCLI string bundle
   * @param name The name to lookup
   * @param swaps An array of swaps. See stringBundle.formatStringFromName
   * @return The looked up name
   */
  aMozl10n.lookupFormat = function(name, swaps) {
    try {
      return stringBundle.formatStringFromName(name, swaps, swaps.length);
    }
    catch (ex) {
      throw new Error("Failure in lookupFormat('" + name + "')");
    }
  };

})(mozl10n);

define(function(require, exports, module) {

  // The API for use by command authors
  exports.addCommand = require('gcli/canon').addCommand;
  exports.removeCommand = require('gcli/canon').removeCommand;
  exports.lookup = mozl10n.lookup;
  exports.lookupFormat = mozl10n.lookupFormat;

  // Internal startup process. Not exported
  require('gcli/types/basic').startup();
  require('gcli/types/command').startup();
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/types/resource').startup();
  require('gcli/types/setting').startup();
  require('gcli/types/selection').startup();

  require('gcli/settings').startup();
  require('gcli/cli').startup();
  require('gcli/ui/intro').startup();

  require('gcli/commands/help').startup();
  require('gcli/commands/pref').startup();

  var Requisition = require('gcli/cli').Requisition;
  var Console = require('gcli/ui/console').Console;

  var cli = require('gcli/cli');
  var jstype = require('gcli/types/javascript');
  var nodetype = require('gcli/types/node');
  var resource = require('gcli/types/resource');

  /**
   * API for use by HUDService only.
   * This code is internal and subject to change without notice.
   */
  exports._internal = {
    require: require,
    define: define,
    console: console,

    /**
     * createView() for Firefox requires an options object with the following
     * members:
     * - contentDocument: From the window of the attached tab
     * - chromeDocument: GCLITerm.document
     * - environment.hudId: GCLITerm.hudId
     * - jsEnvironment.globalObject: 'window'
     * - jsEnvironment.evalFunction: 'eval' in a sandbox
     * - inputElement: GCLITerm.inputNode
     * - completeElement: GCLITerm.completeNode
     * - gcliTerm: GCLITerm
     * - hintElement: GCLITerm.hintNode
     * - inputBackgroundElement: GCLITerm.inputStack
     */
    createView: function(opts) {
      jstype.setGlobalObject(opts.jsEnvironment.globalObject);
      nodetype.setDocument(opts.contentDocument);
      cli.setEvalFunction(opts.jsEnvironment.evalFunction);
      resource.setDocument(opts.contentDocument);

      if (opts.requisition == null) {
        opts.requisition = new Requisition(opts.environment, opts.chromeDocument);
      }

      opts.console = new Console(opts);
    },

    /**
     * Called when the page to which we're attached changes
     */
    reattachConsole: function(opts) {
      jstype.setGlobalObject(opts.jsEnvironment.globalObject);
      nodetype.setDocument(opts.contentDocument);
      cli.setEvalFunction(opts.jsEnvironment.evalFunction);

      opts.requisition.environment = opts.environment;
      opts.requisition.document = opts.chromeDocument;

      opts.console.reattachConsole(opts);
    },

    /**
     * Undo the effects of createView() to prevent memory leaks
     */
    removeView: function(opts) {
      opts.console.destroy();
      delete opts.console;

      opts.requisition.destroy();
      delete opts.requisition;

      cli.unsetEvalFunction();
      nodetype.unsetDocument();
      jstype.unsetGlobalObject();
      resource.unsetDocument();
    },

    commandOutputManager: require('gcli/canon').commandOutputManager
  };
});
