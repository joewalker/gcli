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

var settings = require('gcli/settings');
var types = require('gcli/types');

/**
 * A type for selecting a known setting
 */
var settingType = {
  constructor: function() {
    settings.onChange.add(function(ev) {
      this.clearCache();
    }, this);
  },
  name: 'setting',
  parent: 'selection',
  cacheable: true,
  lookup: function() {
    return settings.getAll().map(function(setting) {
      return { name: setting.name, value: setting };
    });
  }
};

/**
 * A type for entering the value of a known setting
 * Customizations:
 * - settingParamName The name of the setting parameter so we can customize the
 *   type that we are expecting to read
 */
var settingValueType = {
  name: 'settingValue',
  parent: 'delegate',
  settingParamName: 'setting',
  delegateType: function(context) {
    if (context != null) {
      var setting = context.getArgsObject()[this.settingParamName];
      if (setting != null) {
        return setting.type;
      }
    }

    return types.createType('blank');
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.addType(settingType);
  types.addType(settingValueType);
};

exports.shutdown = function() {
  types.removeType(settingType);
  types.removeType(settingValueType);
};


});
