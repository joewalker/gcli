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
  connection: undefined,

  stringify: function(value, context) {
    return this.connection.call('stringify', { name: this.name, value: value });
  },

  parse: function(arg, context) {
    return this.connection.call('parse', { name: this.name, arg: arg.text });
  },

  increment: function(value, context) {
    return this.connection.call('increment', { name: this.name, value: value });
  },

  decrement: function(value, context) {
    return this.connection.call('decrement', { name: this.name, value: value });
  }
};

/**
 * The types we expose for registration
 */
exports.items = [ remote ];

var proxiedTypes = {};

exports.getProxySpecFor = function(type) {
  proxiedTypes[type.name] = type;

  return {
    name: type.name,
    parent: 'remote'
  };
};

exports.releaseProxySpec = function(name) {
  delete proxiedTypes[name];
};

exports.parse = function(context, data) {
  var type = proxiedTypes[data.name];
  if (type == null) {
    return promise.reject('No proxy for type ' + data.name);
  }

  var arg = new Argument(data.text);
  return type.parse(arg, context);
};

exports.stringify = function(context, data) {
  var type = proxiedTypes[data.name];
  if (type == null) {
    return promise.reject('No proxy for type ' + data.name);
  }

  return type.stringify(data.value, context);
};

exports.increment = function(context, data) {
  var type = proxiedTypes[data.name];
  if (type == null) {
    return promise.reject('No proxy for type ' + data.name);
  }

  return type.increment(data.value, context);
};

exports.decrement = function(context, data) {
  var type = proxiedTypes[data.name];
  if (type == null) {
    return promise.reject('No proxy for type ' + data.name);
  }

  return type.decrement(data.value, context);
};
