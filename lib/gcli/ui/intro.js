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

var l10n = require('util/l10n');
var settings = require('gcli/settings');
var view = require('gcli/ui/view');
var Output = require('gcli/cli').Output;

/**
 * Record if the user has clicked on 'Got It!'
 */
exports.items = [
  {
    item: 'setting',
    name: 'hideIntro',
    type: 'boolean',
    description: l10n.lookup('hideIntroDesc'),
    defaultValue: false
  }
];

/**
 * Called when the UI is ready to add a welcome message to the output
 */
exports.maybeShowIntro = function(commandOutputManager, conversionContext) {
  var hideIntro = settings.getSetting('hideIntro');
  if (hideIntro.value) {
    return;
  }

  var output = new Output();
  output.type = 'view';
  commandOutputManager.onOutput({ output: output });

  var viewData = this.createView(null, conversionContext, output);

  output.complete({ isTypedData: true, type: 'view', data: viewData });
};

/**
 * Called when the UI is ready to add a welcome message to the output
 */
exports.createView = function(ignore, conversionContext, output) {
  return view.createView({
    html:
      '<div>\n' +
      '  <p>${l10n.introTextOpening2}</p>\n' +
      '\n' +
      '  <p>\n' +
      '    ${l10n.introTextCommands}\n' +
      '    <span class="gcli-out-shortcut" onclick="${onclick}"\n' +
      '        ondblclick="${ondblclick}"\n' +
      '        data-command="help">help</span>${l10n.introTextKeys2}\n' +
      '    <code>${l10n.introTextF1Escape}</code>.\n' +
      '  </p>\n' +
      '\n' +
      '  <button onclick="${onGotIt}"\n' +
      '      if="${showHideButton}">${l10n.introTextGo}</button>\n' +
      '</div>',
    options: { stack: 'intro.html' },
    data: {
      l10n: l10n.propertyLookup,
      onclick: conversionContext.update,
      ondblclick: conversionContext.updateExec,
      showHideButton: (output != null),
      onGotIt: function(ev) {
        var hideIntro = settings.getSetting('hideIntro');
        hideIntro.value = true;
        output.onClose();
      }
    }
  });
};

});
