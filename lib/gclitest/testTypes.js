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

function forEachType(options, callback) {
  types.getTypeNames().forEach(function(name) {
    options.name = name;

    // Provide some basic defaults to help selection/deferred/array work
    if (name === 'selection') {
      options.data = [ 'a', 'b' ];
    }
    else if (name === 'deferred') {
      options.defer = function() {
        return types.getType('string');
      };
    }
    else if (name === 'array') {
      options.subtype = 'string';
    }

    var type = types.getType(options);
    callback(type);
  });
}

exports.testDefault = function(options) {
  if (options.isNode) {
    test.log('Running under Node. ' +
             'Skipping tests due to issues with resource type.');
    return;
  }

  forEachType({}, function(type) {
    var blank = type.getBlank().value;

    // boolean and array types are exempt from needing undefined blank values
    if (type.name === 'boolean') {
      test.is(blank, false, 'blank boolean is false');
    }
    else if (type.name === 'array') {
      test.ok(Array.isArray(blank), 'blank array is array');
      test.is(blank.length, 0, 'blank array is empty');
    }
    else {
      test.is(blank, undefined, 'default defined for ' + type.name);
    }
  });
};

exports.testNullDefault = function(options) {
  forEachType({ defaultValue: null }, function(type) {
    test.is(type.stringify(null), '', 'stringify(null) for ' + type.name);
  });
};

});
