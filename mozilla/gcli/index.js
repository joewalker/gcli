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
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/cli').startup();

  var Requisition = require('gcli/cli').Requisition;
  var cli = require('gcli/cli');
  var Inputter = require('gcli/ui/inputter').Inputter;
  var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
  var CommandMenu = require('gcli/ui/menu').CommandMenu;
  var FocusManager = require('gcli/ui/focus').FocusManager;

  var jstype = require('gcli/types/javascript');
  var nodetype = require('gcli/types/node');

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
      opts.autoHide = true;
      opts.requisition = new Requisition(opts.environment, opts.chromeDocument);
      opts.completionPrompt = '';

      jstype.setGlobalObject(opts.jsEnvironment.globalObject);
      nodetype.setDocument(opts.contentDocument);
      cli.setEvalFunction(opts.jsEnvironment.evalFunction);

      // Create a FocusManager for the various parts to register with
      if (!opts.focusManager) {
        opts.debug = true;
        opts.focusManager = new FocusManager({ document: opts.chromeDocument });
      }

      opts.inputter = new Inputter(opts);
      opts.inputter.update();
      if (opts.gcliTerm) {
        opts.focusManager.onFocus.add(opts.gcliTerm.show, opts.gcliTerm);
        opts.focusManager.onBlur.add(opts.gcliTerm.hide, opts.gcliTerm);
        opts.focusManager.addMonitoredElement(opts.gcliTerm.hintNode, 'gcliTerm');
      }

      if (opts.hintElement) {
        opts.menu = new CommandMenu(opts.chromeDocument, opts.requisition);
        opts.hintElement.appendChild(opts.menu.element);

        opts.argFetcher = new ArgFetcher(opts.chromeDocument, opts.requisition);
        opts.hintElement.appendChild(opts.argFetcher.element);
      }
    },

    /**
     * Undo the effects of createView() to prevent memory leaks
     */
    removeView: function(opts) {
      opts.hintElement.removeChild(opts.menu.element);
      opts.menu.destroy();
      opts.hintElement.removeChild(opts.argFetcher.element);
      opts.argFetcher.destroy();

      opts.inputter.destroy();
      opts.focusManager.removeMonitoredElement(opts.gcliTerm.hintNode, 'gcliTerm');
      opts.focusManager.onFocus.remove(opts.gcliTerm.show, opts.gcliTerm);
      opts.focusManager.onBlur.remove(opts.gcliTerm.hide, opts.gcliTerm);
      opts.focusManager.destroy();

      cli.unsetEvalFunction();
      nodetype.unsetDocument();
      jstype.unsetGlobalObject();

      opts.requisition.destroy();
    },

    commandOutputManager: require('gcli/canon').commandOutputManager
  };
});
