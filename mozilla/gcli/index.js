/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  // Internal startup process. Not exported
  require('gcli/types/basic').startup();
  require('gcli/types/command').startup();
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/types/resource').startup();
  require('gcli/types/setting').startup();
  require('gcli/types/selection').startup();

  require('gcli/settings').startup();
  require('gcli/ui/intro').startup();
  require('gcli/ui/focus').startup();
  require('gcli/ui/fields/basic').startup();
  require('gcli/ui/fields/javascript').startup();
  require('gcli/ui/fields/selection').startup();

  require('gcli/commands/help').startup();

  // Some commands require customizing for Firefox before we include them
  // require('gcli/cli').startup();
  // require('gcli/commands/pref').startup();


  // The API for use by command authors
  exports.addCommand = require('gcli/canon').addCommand;
  exports.removeCommand = require('gcli/canon').removeCommand;

  /**
   * This code is internal and subject to change without notice.
   * createView() for Firefox requires an options object with the following
   * members:
   * - contentDocument: From the window of the attached tab
   * - chromeDocument: GCLITerm.document
   * - environment.hudId: GCLITerm.hudId
   * - jsEnvironment.globalObject: 'window'
   * - jsEnvironment.evalFunction: 'eval' in a sandbox
   * - inputElement: GCLITerm.inputNode
   * - completeElement: GCLITerm.completeNode
   * - hintElement: GCLITerm.hintNode
   * - inputBackgroundElement: GCLITerm.inputStack
   */
  exports.createDisplay = function(opts) {
    var FFDisplay = require('gcli/ui/ffdisplay').FFDisplay;
    return new FFDisplay(opts);
  };

});
