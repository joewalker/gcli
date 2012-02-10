/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var html = require('text!gcli/ui/intro.html');
  var settings = require('gcli/settings');
  var l10n = require('gcli/l10n');
  var util = require('gcli/util');
  var domtemplate = require('gcli/ui/domtemplate');

  /**
   * Record if the user has clicked on 'Got It!'
   */
  var hideIntroSettingSpec = {
    name: 'gcli.hideIntro',
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
  exports.maybeShowIntro = function(document, commandOutputManager, requisition) {
    if (hideIntro.value) {
      return;
    }

    var output = util.toDom(document, html);
    var data = {
      onGotIt: function(ev) {
        requisition.exec({ typed: 'pref set ' + hideIntro.name + ' true' });
      }
    };
    domtemplate.template(output, data, { stack: 'intro.html' });

    commandOutputManager.sendCommandOutput({
      typed: '',
      canonical: '',
      completed: true,
      error: false,
      output: output
    });
  };

});
