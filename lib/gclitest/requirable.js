/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  exports.thing1 = 'thing1';
  exports.thing2 = 2;

  var status = 'initial';
  exports.setStatus = function(aStatus) { status = aStatus; };
  exports.getStatus = function() { return status; };

});
