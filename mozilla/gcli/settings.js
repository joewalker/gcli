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

var imports = {};

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm', imports);

imports.XPCOMUtils.defineLazyGetter(imports, 'prefBranch', function() {
  var prefService = Components.classes['@mozilla.org/preferences-service;1']
          .getService(Components.interfaces.nsIPrefService);
  return prefService.getBranch(null)
          .QueryInterface(Components.interfaces.nsIPrefBranch2);
});

imports.XPCOMUtils.defineLazyGetter(imports, 'supportsString', function() {
  return Components.classes["@mozilla.org/supports-string;1"]
          .createInstance(Components.interfaces.nsISupportsString);
});


var util = require('util/util');
var types = require('gcli/types');

/**
 * All local settings have this prefix when used in Firefox
 */
var DEVTOOLS_PREFIX = 'devtools.gcli.';

/**
 * A class to wrap up the properties of a preference.
 * @see toolkit/components/viewconfig/content/config.js
 */
function Setting(prefSpec) {
  if (typeof prefSpec === 'string') {
    // We're coming from getAll() i.e. a full listing of prefs
    this.name = prefSpec;
    this.description = '';
  }
  else {
    // A specific addition by GCLI
    this.name = DEVTOOLS_PREFIX + prefSpec.name;

    if (prefSpec.ignoreTypeDifference !== true && prefSpec.type) {
      if (this.type.name !== prefSpec.type) {
        throw new Error('Locally declared type (' + prefSpec.type + ') != ' +
            'Mozilla declared type (' + this.type.name + ') for ' + this.name);
      }
    }

    this.description = prefSpec.description;
  }

  this.onChange = util.createEvent('Setting.onChange');
}

/**
 * What type is this property: boolean/integer/string?
 */
Object.defineProperty(Setting.prototype, 'type', {
  get: function() {
    switch (imports.prefBranch.getPrefType(this.name)) {
      case imports.prefBranch.PREF_BOOL:
        return types.createType('boolean');

      case imports.prefBranch.PREF_INT:
        return types.createType('number');

      case imports.prefBranch.PREF_STRING:
        return types.createType('string');

      default:
        throw new Error('Unknown type for ' + this.name);
    }
  },
  enumerable: true
});

/**
 * What type is this property: boolean/integer/string?
 */
Object.defineProperty(Setting.prototype, 'value', {
  get: function() {
    switch (imports.prefBranch.getPrefType(this.name)) {
      case imports.prefBranch.PREF_BOOL:
        return imports.prefBranch.getBoolPref(this.name);

      case imports.prefBranch.PREF_INT:
        return imports.prefBranch.getIntPref(this.name);

      case imports.prefBranch.PREF_STRING:
        var value = imports.prefBranch.getComplexValue(this.name,
                Components.interfaces.nsISupportsString).data;
        // In case of a localized string
        if (/^chrome:\/\/.+\/locale\/.+\.properties/.test(value)) {
          value = imports.prefBranch.getComplexValue(this.name,
                  Components.interfaces.nsIPrefLocalizedString).data;
        }
        return value;

      default:
        throw new Error('Invalid value for ' + this.name);
    }
  },

  set: function(value) {
    if (imports.prefBranch.prefIsLocked(this.name)) {
      throw new Error('Locked preference ' + this.name);
    }

    switch (imports.prefBranch.getPrefType(this.name)) {
      case imports.prefBranch.PREF_BOOL:
        imports.prefBranch.setBoolPref(this.name, value);
        break;

      case imports.prefBranch.PREF_INT:
        imports.prefBranch.setIntPref(this.name, value);
        break;

      case imports.prefBranch.PREF_STRING:
        imports.supportsString.data = value;
        imports.prefBranch.setComplexValue(this.name,
                Components.interfaces.nsISupportsString,
                imports.supportsString);
        break;

      default:
        throw new Error('Invalid value for ' + this.name);
    }

    Services.prefs.savePrefFile(null);
  },

  enumerable: true
});

/**
 * Reset this setting to it's initial default value
 */
Setting.prototype.setDefault = function() {
  imports.prefBranch.clearUserPref(this.name);
  Services.prefs.savePrefFile(null);
};


/**
 * Collection of preferences for sorted access
 */
var settingsAll = [];

/**
 * Collection of preferences for fast indexed access
 */
var settingsMap = new Map();

/**
 * Flag so we know if we've read the system preferences
 */
var hasReadSystem = false;

/**
 * Clear out all preferences and return to initial state
 */
function reset() {
  settingsMap = new Map();
  settingsAll = [];
  hasReadSystem = false;
}

/**
 * Reset everything on startup and shutdown because we're doing lazy loading
 */
exports.startup = function() {
  reset();
};

exports.shutdown = function() {
  reset();
};

/**
 * Load system prefs if they've not been loaded already
 * @return true
 */
function readSystem() {
  if (hasReadSystem) {
    return;
  }

  imports.prefBranch.getChildList('').forEach(function(name) {
    var setting = new Setting(name);
    settingsAll.push(setting);
    settingsMap.set(name, setting);
  });

  settingsAll.sort(function(s1, s2) {
    return s1.name.localeCompare(s2.name);
  });

  hasReadSystem = true;
}

/**
 * Get an array containing all known Settings filtered to match the given
 * filter (string) at any point in the name of the setting
 */
exports.getAll = function(filter) {
  readSystem();

  if (filter == null) {
    return settingsAll;
  }

  return settingsAll.filter(function(setting) {
    return setting.name.indexOf(filter) !== -1;
  });
};

/**
 * Add a new setting.
 */
exports.addSetting = function(prefSpec) {
  var setting = new Setting(prefSpec);

  if (settingsMap.has(setting.name)) {
    // Once exists already, we're going to need to replace it in the array
    for (var i = 0; i < settingsAll.length; i++) {
      if (settingsAll[i].name === setting.name) {
        settingsAll[i] = setting;
      }
    }
  }

  settingsMap.set(setting.name, setting);
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
  // We might be able to give the answer without needing to read all system
  // settings if this is an internal setting
  var found = settingsMap.get(name);
  if (found) {
    return found;
  }

  if (hasReadSystem) {
    return undefined;
  }
  else {
    readSystem();
    return settingsMap.get(name);
  }
};

/**
 * Event for use to detect when the list of settings changes
 */
exports.onChange = util.createEvent('Settings.onChange');

/**
 * Remove a setting. A no-op in this case
 */
exports.removeSetting = function() { };


});
