/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var test = require('test/assert');
var types = require('gcli/types');

exports.setup = function() {
};

exports.shutdown = function() {
};

exports.testDefault = function(options) {
  if (options.isNode) {
    return;
  }

  types.getTypeNames().forEach(function(name) {
    if (name === 'selection') {
      name = { name: 'selection', data: [ 'a', 'b' ] };
    }
    if (name === 'deferred') {
      name = {
        name: 'deferred',
        defer: function() { return types.getType('string'); }
      };
    }
    if (name === 'array') {
      name = { name: 'array', subtype: 'string' };
    }
    var type = types.getType(name);
    if (type.name !== 'boolean' && type.name !== 'array') {
      test.ok(type.getBlank().value === undefined,
              'default defined for ' + type.name);
    }
  });
};

});
