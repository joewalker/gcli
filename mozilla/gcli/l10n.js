/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyGetter(this, 'stringBundle', function () {
  return Services.strings.createBundle('chrome://browser/locale/devtools/gcli.properties');
});

/*
 * Not supported when embedded - we're doing things the Mozilla way not the
 * require.js way.
 */
exports.registerStringsSource = function(modulePath) {
  throw new Error('registerStringsSource is not available in mozilla');
};

exports.unregisterStringsSource = function(modulePath) {
  throw new Error('unregisterStringsSource is not available in mozilla');
};

exports.lookupSwap = function(key, swaps) {
  throw new Error('lookupSwap is not available in mozilla');
};

exports.lookupPlural = function(key, ord, swaps) {
  throw new Error('lookupPlural is not available in mozilla');
};

exports.getPreferredLocales = function() {
  return [ 'root' ];
};

/** @see lookup() in lib/gcli/l10n.js */
exports.lookup = function(key) {
  try {
    // Our memory leak hunter walks reachable objects trying to work out what
    // type of thing they are using object.constructor.name. If that causes
    // problems then we can avoid the unknown-key-exception with the following:
    /*
    if (key === 'constructor') {
      return { name: 'l10n-mem-leak-defeat' };
    }
    */

    return stringBundle.GetStringFromName(key);
  }
  catch (ex) {
    console.error('Failed to lookup ', key, ex);
    return key;
  }
};

/** @see propertyLookup in lib/gcli/l10n.js */
exports.propertyLookup = Proxy.create({
  get: function(rcvr, name) {
    return exports.lookup(name);
  }
});

/** @see lookupFormat in lib/gcli/l10n.js */
exports.lookupFormat = function(key, swaps) {
  try {
    return stringBundle.formatStringFromName(key, swaps, swaps.length);
  }
  catch (ex) {
    console.error('Failed to format ', key, ex);
    return key;
  }
};


});
