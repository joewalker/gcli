/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var mozl10n = {};

(function(aMozl10n) {

  'use strict';

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

  'use strict';

  // Internal startup process. Not exported
  // The first group are depended on by others so they must be registered first
  require('gcli/types/basic').startup();
  require('gcli/types/selection').startup();

  require('gcli/types/command').startup();
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/types/resource').startup();
  require('gcli/types/setting').startup();

  require('gcli/settings').startup();
  require('gcli/ui/intro').startup();
  require('gcli/ui/focus').startup();
  require('gcli/ui/fields/basic').startup();
  require('gcli/ui/fields/javascript').startup();
  require('gcli/ui/fields/selection').startup();

  require('gcli/commands/help').startup();
  require('gcli/commands/pref').startup();
  require('gcli/commands/context').startup();

  var Cc = Components.classes;
  var Ci = Components.interfaces;
  var prefSvc = "@mozilla.org/preferences-service;1";
  var prefService = Cc[prefSvc].getService(Ci.nsIPrefService);
  var prefBranch = prefService.getBranch(null).QueryInterface(Ci.nsIPrefBranch2);

  // The API for use by command authors
  exports.addCommand = require('gcli/canon').addCommand;
  exports.removeCommand = require('gcli/canon').removeCommand;
  exports.addConverter = require('gcli/converters').addConverter;
  exports.removeConverter = require('gcli/converters').removeConverter;
  exports.lookup = mozl10n.lookup;
  exports.lookupFormat = mozl10n.lookupFormat;

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

  exports.hiddenByChromePref = function() {
    return !prefBranch.prefHasUserValue("devtools.chrome.enabled");
  };

});
