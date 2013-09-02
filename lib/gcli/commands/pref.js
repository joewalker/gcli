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

exports.items = [
  {
    // 'pref' command
    item: 'command',
    name: 'pref',
    description: l10n.lookup('prefDesc'),
    manual: l10n.lookup('prefManual')
  },
  {
    // 'pref show' command
    item: 'command',
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
    exec: function(args, context) {
      return l10n.lookupFormat('prefShowSettingValue',
                               [ args.setting.name, args.setting.value ]);
    }
  },
  {
    // 'pref set' command
    item: 'command',
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
      var allowSet = settings.getSetting('allowSet');
      if (!allowSet.value &&
          args.setting.name !== allowSet.name) {
        return context.typedData('prefSetWarning', null);
      }

      args.setting.value = args.value;
    }
  },
  {
    // 'pref reset' command
    item: 'command',
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
  },
  {
    // Record if the user has clicked on 'Got It!'
    item: 'setting',
    name: 'allowSet',
    type: 'boolean',
    description: l10n.lookup('allowSetDesc'),
    defaultValue: false
  },
  {
    // A view to hold an 'are you sure' warning
    item: 'converter',
    from: 'prefSetWarning',
    to: 'view',
    exec: function(data, context) {
      var allowSet = settings.getSetting('settings');
      return {
        html: require('text!gcli/commands/pref_set_check.html'),
        options: { allowEval: true, stack: 'pref_set_check.html' },
        data: {
          l10n: l10n.propertyLookup,
          activate: function() {
            context.updateExec('pref set ' + allowSet.name + ' true');
          }
        }
      };
    }
  }
];


});
