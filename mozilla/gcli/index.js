/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  // The API for use by command authors
  exports.addCommand = require('gcli/canon').addCommand;
  exports.removeCommand = require('gcli/canon').removeCommand;

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
     * - contentDocument: The window of the attached tab
     * - chromeDocument: GCLITerm.document
     * - environment.hudId: GCLITerm.hudId
     * - jsEnvironment.globalObject: 'window'
     * - jsEnvironment.evalFunction: 'eval' in a sandbox
     * - inputElement: GCLITerm.inputNode
     * - completeElement: GCLITerm.completeNode
     * - popup: GCLITerm.hintPopup
     * - hintElement: GCLITerm.hintNode
     * - inputBackgroundElement: GCLITerm.inputStack
     */
    createView: function(options) {
      options.preStyled = true;
      options.autoHide = true;
      options.requisition = new Requisition(options.environment, options.chromeDocument);
      options.completionPrompt = '';

      jstype.setGlobalObject(options.jsEnvironment.globalObject);
      nodetype.setDocument(options.contentDocument);
      cli.setEvalFunction(options.jsEnvironment.evalFunction);

      var inputter = new Inputter(options);
      inputter.update();
      if (options.popup) {
        inputter.sendFocusEventsToPopup(options.popup);
      }

      if (options.hintElement) {
        var menu = new CommandMenu(options.chromeDocument, options.requisition);
        options.hintElement.appendChild(menu.element);

        var argFetcher = new ArgFetcher(options.chromeDocument, options.requisition);
        options.hintElement.appendChild(argFetcher.element);

        menu.onCommandChange();
      }
    },

    commandOutputManager: require('gcli/canon').commandOutputManager
  };

});
