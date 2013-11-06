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

'use strict';

var promise = require('../util/promise');
var Conversion = require('../types').Conversion;
var Argument = require('../argument').Argument;

/**
 * A type for "we don't know right now, but hope to soon"
 */
var remote = {
  item: 'type',
  name: 'remote',

  // To be provided by users of this type
  id: undefined,
  connection: undefined,

  stringify: function(value, context) {
    return this.connection.call('stringify', { id: this.id, value: value });
  },

  parse: function(arg, context) {
    return this.connection.call('stringify', { id: this.id, arg: arg.text });
  },

  increment: function(value, context) {
    return this.connection.call('increment', { id: this.id, value: value });
  },

  decrement: function(value, context) {
    return this.connection.call('decrement', { id: this.id, value: value });
  }
};

/**
 * The types we expose for registration
 */
exports.items = [ remote ];

var nextTypeId = 0;
var proxiedTypes = {};

exports.getProxySpecFor = function(type) {
  var id = nextTypeId++;
  proxiedTypes[id] = type;

  return {
    id: id,
    name: 'remote'
  };
};

exports.releaseProxySpec = function(id) {
  delete proxiedTypes[id];
};

exports.parse = function(context, data) {
  var type = proxiedTypes[data.id];
  if (type == null) {
    return promise.reject('No proxied type with id=' + data.id);
  }

  var arg = new Argument(data.text);
  return type.parse(arg, context);
};

exports.stringify = function(context, data) {
  var type = proxiedTypes[data.id];
  if (type == null) {
    return promise.reject('No proxied type with id=' + data.id);
  }

  return type.stringify(data.value, context);
};

exports.increment = function(context, data) {
  var type = proxiedTypes[data.id];
  if (type == null) {
    return promise.reject('No proxied type with id=' + data.id);
  }

  return type.increment(data.value, context);
};

exports.decrement = function(context, data) {
  var type = proxiedTypes[data.id];
  if (type == null) {
    return promise.reject('No proxied type with id=' + data.id);
  }

  return type.decrement(data.value, context);
};
