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

var util = require('./util/util');

/**
 * A manager for the registered Settings
 */
function Settings(types, settingValues) {
  this._types = types;

  // Where we store the settings that we've created
  this._settings = {};

  // Where the values for the settings are stored while in use.
  this._settingValues = settingValues || {};

  // Where the values for the settings are persisted for next use.
  this._settingStorage = new LocalSettingStorage();
  this._settingStorage.load(this._settingValues);

  // Event for use to detect when the list of settings changes
  this.onChange = util.createEvent('Settings.onChange');
}

/**
 * Allow a system to setup a different set of defaults from what GCLI provides
 */
Settings.prototype.setDefaults = function(newValues) {
  Object.keys(newValues).forEach(function(name) {
    if (this._settingValues[name] === undefined) {
      this._settingValues[name] = newValues[name];
    }
  }.bind(this));
};

/**
 * 'static' function to get an array containing all known Settings
 */
Settings.prototype.getAll = function(filter) {
  var all = [];
  Object.keys(this._settings).forEach(function(name) {
    if (filter == null || name.indexOf(filter) !== -1) {
      all.push(this._settings[name]);
    }
  }.bind(this));
  all.sort(function(s1, s2) {
    return s1.name.localeCompare(s2.name);
  }.bind(this));
  return all;
};

/**
 * Add a new setting
 */
Settings.prototype.add = function(prefSpec) {
  var type = this._types.createType(prefSpec.type);
  var setting = new Setting(this, prefSpec.name, type, prefSpec.description,
                            prefSpec.defaultValue);
  this._settings[setting.name] = setting;
  this.onChange({ added: setting.name });
  return setting;
};

/**
 * Getter for an existing setting. Generally use of this function should be
 * avoided. Systems that define a setting should export it if they wish it to
 * be available to the outside, or not otherwise. Use of this function breaks
 * that boundary and also hides dependencies. Acceptable uses include testing
 * and embedded uses of GCLI that pre-define all settings (e.g. Firefox)
 * @param name The name of the setting to fetch
 * @return The found Setting object, or undefined if the setting was not found
 */
Settings.prototype.get = function(name) {
  return this._settings[name];
};

/**
 * Remove a setting
 */
Settings.prototype.remove = function(nameOrSpec) {
  var name = typeof nameOrSpec === 'string' ? nameOrSpec : nameOrSpec.name;
  delete this._settings[name];
  this.onChange({ removed: name });
};

exports.Settings = Settings;

/**
 * Implement the load() and save() functions to write a JSON string blob to
 * localStorage
 */
function LocalSettingStorage() {
}

LocalSettingStorage.prototype.load = function(values) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  var gcliSettings = localStorage.getItem('gcli-settings');
  if (gcliSettings != null) {
    var parsed = JSON.parse(gcliSettings);
    Object.keys(parsed).forEach(function(name) {
      values[name] = parsed[name];
    });
  }
};

LocalSettingStorage.prototype.save = function(values) {
  if (typeof localStorage !== 'undefined') {
    var json = JSON.stringify(values);
    localStorage.setItem('gcli-settings', json);
  }
};

exports.LocalSettingStorage = LocalSettingStorage;


/**
 * A class to wrap up the properties of a Setting.
 * @see toolkit/components/viewconfig/content/config.js
 */
function Setting(settings, name, type, description, defaultValue) {
  this._settings = settings;
  this.name = name;
  this.type = type;
  this.description = description;
  this._defaultValue = defaultValue;

  this.onChange = util.createEvent('Setting.onChange');
  this.setDefault();
}

/**
 * Reset this setting to it's initial default value
 */
Setting.prototype.setDefault = function() {
  this.value = this._defaultValue;
};

/**
 * All settings 'value's are saved in the settingValues object
 */
Object.defineProperty(Setting.prototype, 'value', {
  get: function() {
    return this._settings._settingValues[this.name];
  },

  set: function(value) {
    this._settings._settingValues[this.name] = value;
    this._settings._settingStorage.save(this._settings._settingValues);
    this.onChange({ setting: this, value: value });
  },

  enumerable: true
});
