/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var obj = {};
  Components.utils.import('resource:///modules/devtools/Templater.jsm', obj);
  exports.template = obj.template;

});
