/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var types = require('gcli/types');


/**
 * Where we store the settings that we've created
 */
var settings = {};

/**
 * Where the values for the settings are stored while in use.
 */
var settingValues = {};

/**
 * Where the values for the settings are persisted for next use.
 */
var settingStorage;

/**
 * Allow a system to setup a different set of defaults from what GCLI provides
 */
exports.setDefaults = function(newValues) {
  Object.keys(newValues).forEach(function(name) {
    if (settingValues[name] === undefined) {
      settingValues[name] = newValues[name];
    }
  });
};

/**
 * Initialize the settingValues store from localStorage
 */
exports.startup = function() {
  settingStorage = new LocalSettingStorage();
  settingStorage.load(settingValues);
};

exports.shutdown = function() {
};

/**
 * 'static' function to get an array containing all known Settings
 */
exports.getAll = function(filter) {
  var all = [];
  Object.keys(settings).forEach(function(name) {
    if (filter == null || name.indexOf(filter) !== -1) {
      all.push(settings[name]);
    }
  }.bind(this));
  all.sort(function(s1, s2) {
    return s1.name.localeCompare(s2.name);
  }.bind(this));
  return all;
};

/**
 * Add a new setting
 * @return The new Setting object
 */
exports.addSetting = function(prefSpec) {
  var type = types.getType(prefSpec.type);
  var setting = new Setting(prefSpec.name, type, prefSpec.description,
                            prefSpec.defaultValue);
  settings[setting.name] = setting;
  exports.onChange({ added: setting.name });
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
exports.getSetting = function(name) {
  return settings[name];
};

/**
 * Remove a setting
 */
exports.removeSetting = function(nameOrSpec) {
  var name = typeof nameOrPrefSpec === 'string' ? nameOrSpec : nameOrSpec.name;
  delete settings[name];
  exports.onChange({ removed: name });
};

/**
 * Event for use to detect when the list of settings changes
 */
exports.onChange = util.createEvent('Settings.onChange');

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
function Setting(name, type, description, defaultValue) {
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
    return settingValues[this.name];
  },

  set: function(value) {
    settingValues[this.name] = value;
    settingStorage.save(settingValues);
    this.onChange({ setting: this, value: value });
  },

  enumerable: true
});


});
