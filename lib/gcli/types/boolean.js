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

var Promise = require('util/promise');
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var SelectionType = require('gcli/types/selection').SelectionType;

var BlankArgument = require('gcli/argument').BlankArgument;

exports.items = [
  {
    // 'boolean' type
    item: 'type',
    name: 'boolean',
    parent: 'selection',

    lookup: [
      { name: 'false', value: false },
      { name: 'true', value: true }
    ],

    parse: function(arg, context) {
      if (arg.type === 'TrueNamedArgument') {
        return Promise.resolve(new Conversion(true, arg));
      }
      if (arg.type === 'FalseNamedArgument') {
        return Promise.resolve(new Conversion(false, arg));
      }
      return SelectionType.prototype.parse.call(this, arg, context);
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return '' + value;
    },

    getBlank: function(context) {
      return new Conversion(false, new BlankArgument(), Status.VALID, '',
                            Promise.resolve(this.lookup));
    }
  }
];


});
