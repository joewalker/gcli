/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var settings = require('gcli/settings');
var types = require('gcli/types');
var SelectionType = require('gcli/types/selection').SelectionType;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(SettingType);
};

exports.shutdown = function() {
  types.unregisterType(SettingType);
};

/**
 * A type for selecting a known setting
 */
function SettingType(typeSpec) {
  if (Object.keys(typeSpec).length > 0) {
    throw new Error('SettingType can not be customized');
  }
}

SettingType.prototype = Object.create(SelectionType.prototype);

SettingType.prototype.lookup = function() {
  return settings.getAll().map(function(setting) {
    return { name: setting.name, value: setting };
  });
};

SettingType.prototype.name = 'setting';


});
