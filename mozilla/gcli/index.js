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

define(function(require, exports, module) {

'use strict';

require('gcli/settings').startup();

var api = require('gcli/api');
api.populateApi(exports);

exports.addItems(require('gcli/types/selection').items);
exports.addItems(require('gcli/types/delegate').items);

exports.addItems(require('gcli/types/array').items);
exports.addItems(require('gcli/types/boolean').items);
exports.addItems(require('gcli/types/command').items);
exports.addItems(require('gcli/types/date').items);
exports.addItems(require('gcli/types/file').items);
exports.addItems(require('gcli/types/javascript').items);
exports.addItems(require('gcli/types/node').items);
exports.addItems(require('gcli/types/number').items);
exports.addItems(require('gcli/types/resource').items);
exports.addItems(require('gcli/types/setting').items);
exports.addItems(require('gcli/types/string').items);

exports.addItems(require('gcli/converters').items);
exports.addItems(require('gcli/converters/basic').items);
// Don't export the 'html' type to avoid use of innerHTML
// exports.addItems(require('gcli/converters/html').items);
exports.addItems(require('gcli/converters/terminal').items);

exports.addItems(require('gcli/ui/intro').items);
exports.addItems(require('gcli/ui/focus').items);

exports.addItems(require('gcli/ui/fields/basic').items);
exports.addItems(require('gcli/ui/fields/javascript').items);
exports.addItems(require('gcli/ui/fields/selection').items);

// Don't export the '{' command
// exports.addItems(require('gcli/cli').items);

exports.addItems(require('gcli/commands/connect').items);
exports.addItems(require('gcli/commands/context').items);
exports.addItems(require('gcli/commands/help').items);
exports.addItems(require('gcli/commands/pref').items);

/**
 * This code is internal and subject to change without notice.
 * createDisplay() for Firefox requires an options object with the following
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

var prefSvc = Components.classes['@mozilla.org/preferences-service;1']
                        .getService(Components.interfaces.nsIPrefService);
var prefBranch = prefSvc.getBranch(null)
                        .QueryInterface(Components.interfaces.nsIPrefBranch2);

exports.hiddenByChromePref = function() {
  return !prefBranch.prefHasUserValue('devtools.chrome.enabled');
};


try {
  var Services = Components.utils.import('resource://gre/modules/Services.jsm', {}).Services;
  var stringBundle = Services.strings.createBundle(
          'chrome://global/locale/devtools/gclicommands.properties');

  /**
   * Lookup a string in the GCLI string bundle
   */
  exports.lookup = function(name) {
    try {
      return stringBundle.GetStringFromName(name);
    }
    catch (ex) {
      throw new Error('Failure in lookup(\'' + name + '\')');
    }
  };

  /**
   * Lookup a string in the GCLI string bundle
   */
  exports.lookupFormat = function(name, swaps) {
    try {
      return stringBundle.formatStringFromName(name, swaps, swaps.length);
    }
    catch (ex) {
      throw new Error('Failure in lookupFormat(\'' + name + '\')');
    }
  };
}
catch (ex) {
  console.error('Using string fallbacks', ex);

  exports.lookup = function(name) {
    return name;
  };
  exports.lookupFormat = function(name, swaps) {
    return name;
  };
}


});
