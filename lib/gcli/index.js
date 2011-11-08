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
  require('gcli/nls/strings');
  require('gcli/l10n').registerStringsSource('gcli/nls/strings');

  require('gcli/types/basic').startup();
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/cli').startup();

  var Requisition = require('gcli/cli').Requisition;

  var Popup = require('gcli/ui/popup').Popup;
  var Inputter = require('gcli/ui/inputter').Inputter;
  var FocusManager = require('gcli/ui/focus').FocusManager;

  var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
  var Menu = require('gcli/ui/menu').Menu;
  var Templater = require('gcli/ui/domtemplate').Templater;


  /**
   * Create a basic UI for GCLI on the web
   */
  exports.createView = function(options) {
    options = options || {};

    if (!options.document) {
      options.document = document;
    }

    // The requisition depends on no UI components
    if (options.requisition == null) {
      options.requisition = new Requisition(options.environment, options.document);
    }

    // Create a FocusManager for the various parts to register with
    if (!options.focusManager && options.useFocusManager) {
      options.focusManager = new FocusManager(options);
    }

    // The inputter should depend only on the requisition
    if (options.inputter == null) {
      options.inputter = new Inputter(options);
    }

    // The Popup has most dependencies
    if (options.popup == null) {
      options.popup = new Popup(options);
    }

    options.inputter.update();
  };

});
