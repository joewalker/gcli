/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var types = require('gcli/types');


/**
 * Where the values for the settings are stored
 */
var settingValues = {};

/**
 * Initialize the settingValues store from sessionStorage
 */
exports.startup = function() {
  var gcliSettings = localStorage.getItem('gcli-settings');
  if (gcliSettings != null) {
    settingValues = JSON.parse(gcliSettings);
  }
};

exports.shutdown = function() {
};


/**
 * A class to wrap up the properties of a Setting.
 * @see toolkit/components/viewconfig/content/config.js
 */
function Setting(name, type, description) {
  this.name = name;
  this.type = type;
  this.description = description;

  this.onChange = util.createEvent('Setting.onChange');
}

Object.defineProperty(Setting.prototype, 'value', {
  get: function() {
    return settingValues[this.name] || undefined;
  },

  set: function(value) {
    settingValues[this.name] = value;
    var json = JSON.stringify(settingValues);
    localStorage.setItem('gcli-settings', json);
  },

  enumerable: true
});


/**
 * Where we store the settings that we've created
 */
var settings = {};

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
 */
exports.addSetting = function(prefSpec) {
  var type = types.getType(prefSpec.type);
  var setting = new Setting(prefSpec.name, type, prefSpec.description);
  settings[setting.name] = setting;
  return setting;
};

/**
 * Remove a setting
 */
exports.removeSetting = function(nameOrSpec) {
  var name = typeof nameOrPrefSpec === 'string' ? nameOrSpec : nameOrSpec.name;
  delete settings[name];
};


});
