/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


XPCOMUtils.defineLazyGetter(this, "stringBundle", function () {
  return Services.strings.createBundle('chrome://global/locale/gcli.properties');
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
  return stringBundle.GetStringFromName(key);
};

/** @see lookupFormat in lib/gcli/l10n.js */
exports.lookupFormat = function(key, swaps) {
  return stringBundle.formatStringFromName(key, swaps, swaps.length);
};


});
