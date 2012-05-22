/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
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

    var viewData = view.createView({
      html: require('text!gcli/ui/intro.html'),
      options: { stack: 'intro.html' },
      data: {
        onclick: function(ev) {
          util.updateCommand(ev.currentTarget, context);
        },
        ondblclick: function(ev) {
          util.executeCommand(ev.currentTarget, context);
        },
        showHideButton: true,
        onGotIt: function(ev) {
          hideIntro.value = true;
          output.onClose();
        }
      }
    });

    output.complete(viewData);
  };
});
