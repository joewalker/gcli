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
    else if (type.name === 'nodelist') {
      test.ok(typeof blank.item, 'function', 'blank.item is function');
      test.is(blank.length, 0, 'blank nodelist is empty');
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
