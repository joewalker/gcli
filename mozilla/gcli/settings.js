/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

/**
 * No setup required because settings are pre-loaded with Mozilla,
 * but match API with main settings.js
 */
exports.startup = function() {
};

exports.shutdown = function() {
};

/**
 * A class to wrap up the properties of a preference.
 * @see toolkit/components/viewconfig/content/config.js
 */
function Setting(name) {
  this.name = name;
}

/**
 * What type is this property: boolean/integer/string?
 */
Object.defineProperty(Setting.prototype, 'type', {
  get: function() {
    switch (prefBranch.getPrefType(this.name)) {
      case prefBranch.PREF_BOOL:
        return "boolean";

      case prefBranch.PREF_INT:
        return "number";

      case prefBranch.PREF_STRING:
        return "string";

      default:
        return "invalid";
    }
  },
  enumerable: true
});

/**
 * What type is this property: boolean/integer/string?
 */
Object.defineProperty(Setting.prototype, 'value', {
  get: function() {
    try {
      switch (prefBranch.getPrefType(this.name)) {
        case prefBranch.PREF_BOOL:
          return prefBranch.getBoolPref(this.name).toString();

        case prefBranch.PREF_INT:
          return prefBranch.getIntPref(this.name).toString();

        case prefBranch.PREF_STRING:
          var value = prefBranch.getComplexValue(this.name,
                  Components.interfaces.nsISupportsString).data;
          // Try in case it's a localized string (will throw an exception if not)
          var isL10n = /^chrome:\/\/.+\/locale\/.+\.properties/.test(value);
          if (!this.changed && isL10n) {
            value = prefBranch.getComplexValue(this.name,
                    Components.interfaces.nsIPrefLocalizedString).data;
          }
          return value;

        default:
          return "invalid";
      }
    } catch (ex) {
      // Also catch obscure cases in which you can't tell in advance
      // that the pref exists but has no user or default value...
    }
  },
  enumerable: true
});


/**
 * 'static' function to get an array containing all known Settings
 */
exports.getAll = function(filter) {
  var all = [];
  prefBranch.getChildList("").forEach(function(name) {
    if (filter == null || name.indexOf(filter) !== -1) {
      all.push(new Setting(name));
    }
  }.bind(this));
  all.sort(function(s1, s2) {
    return s1.name.localeCompare(s2.name);
  }.bind(this));
  return all;
};

/**
 * Add a new setting. A no-op in this case
 */
exports.addSetting = function(prefSpec) {
};

/**
 * Remove a setting. A no-op in this case
 */
exports.removeSetting = function(nameOrSpec) {
};


});
