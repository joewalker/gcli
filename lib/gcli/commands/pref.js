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
var canon = require('gcli/canon');
var converters = require('gcli/converters');
var settings = require('gcli/settings');

/**
 * Record if the user has clicked on 'Got It!'
 */
var allowSetSettingSpec = {
  name: 'allowSet',
  type: 'boolean',
  description: l10n.lookup('allowSetDesc'),
  defaultValue: false
};
exports.allowSet = undefined;

/**
 * 'pref' command
 */
var prefCmdSpec = {
  name: 'pref',
  description: l10n.lookup('prefDesc'),
  manual: l10n.lookup('prefManual')
};

/**
 * 'pref show' command
 */
var prefShowCmdSpec = {
  name: 'pref show',
  description: l10n.lookup('prefShowDesc'),
  manual: l10n.lookup('prefShowManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefShowSettingDesc'),
      manual: l10n.lookup('prefShowSettingManual')
    }
  ],
  exec: function Command_prefShow(args, context) {
    return l10n.lookupFormat('prefShowSettingValue',
                             [ args.setting.name, args.setting.value ]);
  }
};

/**
 * 'pref set' command
 */
var prefSetCmdSpec = {
  name: 'pref set',
  description: l10n.lookup('prefSetDesc'),
  manual: l10n.lookup('prefSetManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefSetSettingDesc'),
      manual: l10n.lookup('prefSetSettingManual')
    },
    {
      name: 'value',
      type: 'settingValue',
      description: l10n.lookup('prefSetValueDesc'),
      manual: l10n.lookup('prefSetValueManual')
    }
  ],
  exec: function(args, context) {
    if (!exports.allowSet.value &&
        args.setting.name !== exports.allowSet.name) {
      return context.typedData('prefSetWarning', null);
    }

    args.setting.value = args.value;
  }
};

var prefSetWarningConverterSpec = {
  from: 'prefSetWarning',
  to: 'view',
  exec: function(data, context) {
    return context.createView({
      html: require('text!gcli/commands/pref_set_check.html'),
      options: { allowEval: true, stack: 'pref_set_check.html' },
      data: {
        l10n: l10n.propertyLookup,
        activate: function() {
          context.updateExec('pref set ' + exports.allowSet.name + ' true');
        }
      }
    });
  }
};

/**
 * 'pref reset' command
 */
var prefResetCmdSpec = {
  name: 'pref reset',
  description: l10n.lookup('prefResetDesc'),
  manual: l10n.lookup('prefResetManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefResetSettingDesc'),
      manual: l10n.lookup('prefResetSettingManual')
    }
  ],
  exec: function(args, context) {
    args.setting.setDefault();
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  exports.allowSet = settings.addSetting(allowSetSettingSpec);

  canon.addCommand(prefCmdSpec);
  canon.addCommand(prefShowCmdSpec);
  canon.addCommand(prefSetCmdSpec);
  canon.addCommand(prefResetCmdSpec);
  converters.addConverter(prefSetWarningConverterSpec);
};

exports.shutdown = function() {
  canon.removeCommand(prefCmdSpec);
  canon.removeCommand(prefShowCmdSpec);
  canon.removeCommand(prefSetCmdSpec);
  canon.removeCommand(prefResetCmdSpec);
  converters.removeConverter(prefSetWarningConverterSpec);

  settings.removeSetting(allowSetSettingSpec);
  exports.allowSet = undefined;
};


});
