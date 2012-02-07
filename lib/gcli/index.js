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
  require('gcli/types/resource').startup();
  require('gcli/cli').startup();

  var Requisition = require('gcli/cli').Requisition;
  var Display = require('gcli/ui/display').Display;

  /**
   * Create a basic UI for GCLI on the web
   */
  exports.createView = function(options) {
    options = options || {};
    options.requisition = options.requisition || new Requisition();
    options.display = new Display(options);
  };
});
