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

  /**
   * Record if the user has clicked on 'Got It!'
   */
  var hideIntroSettingSpec = {
    name: 'hideIntro',
    type: 'boolean',
    description: l10n.lookup('hideIntroDesc')
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
  exports.maybeShowIntro = function(commandOutputManager) {
    if (hideIntro.value) {
      return;
    }

    var output = view.createView({
      html: require('text!gcli/ui/intro.html'),
      data: {
        showHideButton: true,
        onGotIt: function(ev) {
          hideIntro.value = true;
          this.hider.style.display = 'none';
        }
      }
    });

    commandOutputManager.onOutput({ output: {
      typed: '',
      canonical: '',
      completed: true,
      error: false,
      output: output
    } });
  };

});
