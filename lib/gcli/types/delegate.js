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

'use strict';

var promise = require('../util/promise');
var Conversion = require('../types').Conversion;

/**
 * A type for "we don't know right now, but hope to soon"
 */
var delegate = {
  item: 'type',
  name: 'delegate',

  constructor: function() {
    if (typeof this.delegateType !== 'function') {
      throw new Error('Instances of DelegateType need typeSpec.delegateType' +
                      ' to be a function that returns a type');
    }
  },

  // Child types should implement this method to return an instance of the type
  // that should be used. If no type is available, or some sort of temporary
  // placeholder is required, BlankType can be used.
  delegateType: function(context) {
    throw new Error('Not implemented');
  },

  stringify: function(value, context) {
    return this.delegateType(context).stringify(value, context);
  },

  parse: function(arg, context) {
    return this.delegateType(context).parse(arg, context);
  },

  decrement: function(value, context) {
    var delegated = this.delegateType(context);
    return (delegated.decrement ? delegated.decrement(value, context) : undefined);
  },

  increment: function(value, context) {
    var delegated = this.delegateType(context);
    return (delegated.increment ? delegated.increment(value, context) : undefined);
  },

  getType: function(context) {
    return this.delegateType(context);
  },

  // DelegateType is designed to be inherited from, so DelegateField needs a way
  // to check if something works like a delegate without using 'name'
  isDelegate: true,
};

Object.defineProperty(delegate, 'isImportant', {
  get: function() {
    return this.delegateType().isImportant;
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


});
