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

'use strict';

var Cc = require('chrome').Cc;
var Ci = require('chrome').Ci;
var Cu = require('chrome').Cu;

require('./settings').startup();

var api = require('./api');
api.populateApi(exports);

exports.addItems(require('./types/selection').items);
exports.addItems(require('./types/delegate').items);

exports.addItems(require('./types/array').items);
exports.addItems(require('./types/boolean').items);
exports.addItems(require('./types/command').items);
exports.addItems(require('./types/date').items);
exports.addItems(require('./types/file').items);
exports.addItems(require('./types/javascript').items);
exports.addItems(require('./types/node').items);
exports.addItems(require('./types/number').items);
exports.addItems(require('./types/resource').items);
exports.addItems(require('./types/setting').items);
exports.addItems(require('./types/string').items);

exports.addItems(require('./converters/converters').items);
exports.addItems(require('./converters/basic').items);
// Don't export the 'html' type to avoid use of innerHTML
// exports.addItems(require('./converters/html').items);
exports.addItems(require('./converters/terminal').items);

exports.addItems(require('./languages/command').items);
exports.addItems(require('./languages/javascript').items);

exports.addItems(require('./ui/intro').items);
exports.addItems(require('./ui/focus').items);

exports.addItems(require('./fields/basic').items);
exports.addItems(require('./fields/selection').items);

// Don't export the '{' command
// exports.addItems(require('./cli').items);

exports.addItems(require('./commands/clear').items);
exports.addItems(require('./commands/connect').items);
exports.addItems(require('./commands/context').items);
exports.addItems(require('./commands/global').items);
exports.addItems(require('./commands/help').items);
exports.addItems(require('./commands/lang').items);
exports.addItems(require('./commands/pref').items);

var host = require('./util/host');

exports.useTarget = host.script.useTarget;

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
  var FFDisplay = require('./ui/ffdisplay').FFDisplay;
  return new FFDisplay(opts);
};

var prefSvc = Cc['@mozilla.org/preferences-service;1']
                        .getService(Ci.nsIPrefService);
var prefBranch = prefSvc.getBranch(null).QueryInterface(Ci.nsIPrefBranch2);

exports.hiddenByChromePref = function() {
  return !prefBranch.prefHasUserValue('devtools.chrome.enabled');
};


try {
  var Services = Cu.import('resource://gre/modules/Services.jsm', {}).Services;
  var stringBundle = Services.strings.createBundle(
          'chrome://browser/locale/devtools/gclicommands.properties');

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
