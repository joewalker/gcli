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

  var settings = require('gcli/settings');
  var l10n = require('gcli/l10n');
  var util = require('gcli/util');
  var view = require('gcli/ui/view');
  var Output = require('gcli/cli').Output;

  /**
   * Record if the user has clicked on 'Got It!'
   */
  var hideIntroSettingSpec = {
    name: 'hideIntro',
    type: 'boolean',
    description: l10n.lookup('hideIntroDesc'),
    defaultValue: false
  };
  var hideIntro;

  /**
   * Register (and unregister) the hide-intro setting
   */
  exports.startup = function() {
    hideIntro = settings.addSetting(hideIntroSettingSpec);
  };

  exports.shutdown = function() {
    settings.removeSetting(hideIntroSettingSpec);
    hideIntro = undefined;
  };

  /**
   * Called when the UI is ready to add a welcome message to the output
   */
  exports.maybeShowIntro = function(commandOutputManager, context) {
    if (hideIntro.value) {
      return;
    }

    var output = new Output();
    commandOutputManager.onOutput({ output: output });

    var viewData = this.createView(context, output);

    output.complete(viewData);
  };

  /**
   * Called when the UI is ready to add a welcome message to the output
   */
  exports.createView = function(context, output) {
    return view.createView({
      html: require('text!gcli/ui/intro.html'),
      options: { stack: 'intro.html' },
      data: {
        l10n: l10n.propertyLookup,
        onclick: function(ev) {
          util.updateCommand(ev.currentTarget, context);
        },
        ondblclick: function(ev) {
          util.executeCommand(ev.currentTarget, context);
        },
        showHideButton: (output != null),
        onGotIt: function(ev) {
          hideIntro.value = true;
          output.onClose();
        }
      }
    });
  };
});
