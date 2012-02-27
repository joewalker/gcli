/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var imports = {};

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm', imports);

imports.XPCOMUtils.defineLazyGetter(imports, 'prefBranch', function() {
  var prefService = Components.classes['@mozilla.org/preferences-service;1']
          .getService(Components.interfaces.nsIPrefService);
  return prefService.getBranch(null)
          .QueryInterface(Components.interfaces.nsIPrefBranch2);
});

var util = require('gcli/util');
var types = require('gcli/types');

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
function Setting(prefSpec) {
  this.name = prefSpec.name;

  if (prefSpec.ignoreTypeDifference !== true && prefSpec.type) {
    if (this.type.name !== prefSpec.type) {
      throw new Error('Locally declared type (' + prefSpec.type + ') != ' +
          'Mozilla declared type (' + this.type.name + ') for ' + this.name);
    }
  }

  this.description = prefSpec.description;

  this.onChange = util.createEvent('Setting.onChange');
}

/**
 * What type is this property: boolean/integer/string?
 */
Object.defineProperty(Setting.prototype, 'type', {
  get: function() {
    switch (imports.prefBranch.getPrefType(this.name)) {
      case imports.prefBranch.PREF_BOOL:
        return types.getType('boolean');

      case imports.prefBranch.PREF_INT:
        return types.getType('number');

      case imports.prefBranch.PREF_STRING:
        return types.getType('string');

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
    try {
      switch (imports.prefBranch.getPrefType(this.name)) {
        case imports.prefBranch.PREF_BOOL:
          return imports.prefBranch.getBoolPref(this.name).toString();

        case imports.prefBranch.PREF_INT:
          return imports.prefBranch.getIntPref(this.name).toString();

        case imports.prefBranch.PREF_STRING:
          var value = imports.prefBranch.getComplexValue(this.name,
                  Components.interfaces.nsISupportsString).data;
          // Try in case it's a localized string (will throw an exception if not)
          var isL10n = /^chrome:\/\/.+\/locale\/.+\.properties/.test(value);
          if (!this.changed && isL10n) {
            value = imports.prefBranch.getComplexValue(this.name,
                    Components.interfaces.nsIPrefLocalizedString).data;
          }
          return value;

        default:
          throw new Error('Invalid value for ' + this.name);
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
  imports.prefBranch.getChildList('').forEach(function(name) {
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
  return new Setting(prefSpec);
};

/**
 * Remove a setting. A no-op in this case
 */
exports.removeSetting = function(nameOrSpec) {
  conosle.error('Ignoring removeSetting', nameOrSpec);
};


});
