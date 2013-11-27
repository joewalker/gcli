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

var util = require('../util/util');
var promise = require('../util/promise');
var Conversion = require('../types').Conversion;
var Status = require('../types').Status;
var Argument = require('../argument').Argument;

function conversionToJson(conversion) {
  return {
    arg: {
      prefix: conversion.arg.prefix,
      text: conversion.arg.text,
      suffix: conversion.arg.suffix
    },
    status: conversion.status.toString(),
    message: conversion.message,
    predictions: conversion.predictions
  };
}

function jsonToConversion(json) {
  var arg = new Argument(json.arg.text, json.arg.prefix, json.arg.suffix);
  var status = Status.fromString(json.status);
  return new Conversion({}, arg, status, json.message, json.predictions);
}

/**
 * The types we expose for registration
 */
exports.items = [
  // A type for "we don't know right now, but hope to soon"
  {
    item: 'type',
    name: 'delegate',

    constructor: function() {
      if (typeof this.delegateType !== 'function' &&
          typeof this.delegateType !== 'string') {
        throw new Error('Instances of DelegateType need typeSpec.delegateType' +
                        ' to be a function that returns a type');
      }
    },

    getSpec: function() {
      return {
        name: 'delegate',
        error: 'Remote delegate types are not supported'
      };
      /*
      Outstanding work to make delegate types remotable:
      - the 4 functions that we need to remote have potentially non-JSON-able
        parameters, we need functions that conversion to JSON
      - Conversion values are particularly tricky because it GCLI hasn't made
        any requirement that these types be JSONable (and shouldn't really)
        So when a remote system gets a value in a Conversion then we need a
        "value proxy" instead, which shouldn't be hard because we've already
        got functions for stringify/parse.
      */
      /*
      return {
        name: 'remote',
        stringifyHandle: util.getHandle(this.stringify, this),
        parseHandle: util.getHandle(this.parse, this),
        decrementHandle: util.getHandle(this.decrement, this),
        incrementHandle: util.getHandle(this.increment, this),
      };
      */
    },

    // Child types should implement this method to return an instance of the type
    // that should be used. If no type is available, or some sort of temporary
    // placeholder is required, BlankType can be used.
    delegateType: function(context) {
      throw new Error('Not implemented');
    },

    stringify: function(value, context) {
      return this.getType(context).then(function(delegated) {
        return delegated.stringify(value, context);
      }.bind(this));
    },

    parse: function(arg, context) {
      return this.getType(context).then(function(delegated) {
        return delegated.parse(arg, context);
      }.bind(this));
    },

    decrement: function(value, context) {
      return this.getType(context).then(function(delegated) {
        return delegated.decrement ?
               delegated.decrement(value, context) :
               undefined;
      }.bind(this));
    },

    increment: function(value, context) {
      return this.getType(context).then(function(delegated) {
        return delegated.increment ?
               delegated.increment(value, context) :
               undefined;
      }.bind(this));
    },

    getType: function(context) {
      var type = this.delegateType(context);
      if (typeof type.parse !== 'function') {
        type = this.types.createType(type);
      }
      return promise.resolve(type);
    },

    // DelegateType is designed to be inherited from, so DelegateField needs a way
    // to check if something works like a delegate without using 'name'
    isDelegate: true,

    // Technically we perhaps should proxy this, except that properties are
    // inherently synchronous, so we can't. It doesn't seem important enough to
    // change the function definition to accommodate this right now
    isImportant: false
  },
  /*
  {
    item: 'type',
    name: 'remote',

    stringify: function(value, context) {
      return util.callRemoteHandle(this.connection,
                                   this.stringifyHandle,
                                   [ context ]);
    },

    parse: function(arg, context) {
      return util.callRemoteHandle(this.connection,
                                   this.parseHandle,
                                   [ context ]);
    },

    decrement: function(value, context) {
      return util.callRemoteHandle(this.connection,
                                   this.decrementHandle,
                                   [ context ]);
    },

    increment: function(value, context) {
      return util.callRemoteHandle(this.connection,
                                   this.incrementHandle,
                                   [ context ]);
    }
  },
  */
  // 'blank' is a type for use with DelegateType when we don't know yet.
  // It should not be used anywhere else.
  {
    item: 'type',
    name: 'blank',

    stringify: function(value, context) {
      return '';
    },

    parse: function(arg, context) {
      return promise.resolve(new Conversion(undefined, arg));
    }
  }
];
