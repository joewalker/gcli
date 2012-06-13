/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var settings = require('gcli/settings');
var types = require('gcli/types');
var SelectionType = require('gcli/types/selection').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(SettingType);
  types.registerType(SettingValueType);
};

exports.shutdown = function() {
  types.unregisterType(SettingType);
  types.unregisterType(SettingValueType);
};

/**
 * This is a whole new level of nasty. 'setting' and 'settingValue' are a pair
 * for obvious reasons. settingValue is a deferred type - it defers to the type
 * of the setting, but how do we implement the defer function - how does it
 * work out its paired setting?
 * In another parallel universe we pass the requisition to all the parse
 * methods so we can extract the args in SettingValueType.parse, however that
 * seems like a lot of churn for a simple way to connect 2 things. So we're
 * hacking. SettingType tries to keep 'lastSetting' up to date.
 */
var lastSetting = null;

/**
 * A type for selecting a known setting
 */
function SettingType(typeSpec) {
  settings.onChange.add(function(ev) {
    this.clearCache();
  }, this);
}

SettingType.prototype = new SelectionType({ cacheable: true });

SettingType.prototype.lookup = function() {
  return settings.getAll().map(function(setting) {
    return { name: setting.name, value: setting };
  });
};

SettingType.prototype.noMatch = function() {
  lastSetting = null;
};

SettingType.prototype.stringify = function(option) {
  lastSetting = option;
  return SelectionType.prototype.stringify.call(this, option);
};

SettingType.prototype.parse = function(arg) {
  var conversion = SelectionType.prototype.parse.call(this, arg);
  lastSetting = conversion.value;
  return conversion;
};

SettingType.prototype.name = 'setting';


/**
 * A type for entering the value of a known setting
 */
function SettingValueType(typeSpec) {
}

SettingValueType.prototype = Object.create(DeferredType.prototype);

SettingValueType.prototype.defer = function() {
  if (lastSetting != null) {
    return lastSetting.type;
  }
  else {
    return types.getType('blank');
  }
};

SettingValueType.prototype.name = 'settingValue';


});
