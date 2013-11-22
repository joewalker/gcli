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

/**
 * A type for "we don't know right now, but hope to soon"
 */
var delegate = {
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
      delegateType: util.getRemoteHandle(this.delegateType, this)
    };
  },

  // Child types should implement this method to return an instance of the type
  // that should be used. If no type is available, or some sort of temporary
  // placeholder is required, BlankType can be used.
  delegateType: function(context) {
    throw new Error('Not implemented');
  },

  stringify: function(value, context) {
    if (typeof this.delegateType === 'string') {
      throw new Error('remote stringify is not supported');
    }

    var type = this.delegateType(context);
    if (typeof type.parse !== 'function') {
      type = this.types.createType(type);
    }
    return type.stringify(value, context);
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
    if (typeof this.delegateType === 'string') {
      return util.callRemoteHandle(this.delegateType, context).then(function(type) {
        if (typeof type.parse !== 'function') {
          type = this.types.createType(type);
        }
        return type;
      }.bind(this));
    }
    else {
      var type = this.delegateType(context);
      if (typeof type.parse !== 'function') {
        type = this.types.createType(type);
      }
      return promise.resolve(type);
    }
  },

  // DelegateType is designed to be inherited from, so DelegateField needs a way
  // to check if something works like a delegate without using 'name'
  isDelegate: true
};

Object.defineProperty(delegate, 'isImportant', {
  get: function() {
    return false;
    // return this.getType().isImportant;
  },
  enumerable: true
});

/**
 * 'blank' is a type for use with DelegateType when we don't know yet.
 * It should not be used anywhere else.
 */
var blank = {
  item: 'type',
  name: 'blank',

  stringify: function(value, context) {
    return '';
  },

  parse: function(arg, context) {
    return promise.resolve(new Conversion(undefined, arg));
  }
};

/**
 * The types we expose for registration
 */
exports.items = [ delegate, blank ];
