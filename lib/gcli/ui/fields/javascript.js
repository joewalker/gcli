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

var util = require('util/util');
var Promise = require('util/promise');

var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ScriptArgument = require('gcli/argument').ScriptArgument;

var Menu = require('gcli/ui/fields/menu').Menu;
var Field = require('gcli/ui/fields').Field;
var fields = require('gcli/ui/fields');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  fields.addField(JavascriptField);
};

exports.shutdown = function() {
  fields.removeField(JavascriptField);
};


/**
 * A field that allows editing of javascript
 */
function JavascriptField(type, options) {
  Field.call(this, type, options);

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new ScriptArgument('', '{ ', ' }');

  this.element = util.createElement(this.document, 'div');

  this.input = util.createElement(this.document, 'input');
  this.input.type = 'text';
  this.input.addEventListener('keyup', this.onInputChange, false);
  this.input.classList.add('gcli-field');
  this.input.classList.add('gcli-field-javascript');
  this.element.appendChild(this.input);

  this.menu = new Menu({
    document: this.document,
    field: true,
    type: type
  });
  this.element.appendChild(this.menu.element);

  var initial = new Conversion(undefined, new ScriptArgument(''),
                               Status.INCOMPLETE, '');
  this.setConversion(initial);

  this.onFieldChange = util.createEvent('JavascriptField.onFieldChange');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick.add(this.itemClicked, this);
}

JavascriptField.prototype = Object.create(Field.prototype);

JavascriptField.claim = function(type, context) {
  return type.name === 'javascript' ? Field.TOOLTIP_MATCH : Field.NO_MATCH;
};

JavascriptField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.input.removeEventListener('keyup', this.onInputChange, false);
  this.menu.onItemClick.remove(this.itemClicked, this);
  this.menu.destroy();
  delete this.element;
  delete this.input;
  delete this.menu;
  delete this.document;
  delete this.onInputChange;
};

JavascriptField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.input.value = conversion.arg.text;

  var prefixLen = 0;
  if (this.type.name === 'javascript') {
    var typed = conversion.arg.text;
    var lastDot = typed.lastIndexOf('.');
    if (lastDot !== -1) {
      prefixLen = lastDot;
    }
  }

  this.setMessage(conversion.message);

  conversion.getPredictions().then(function(predictions) {
    var items = [];
    predictions.forEach(function(item) {
      // Commands can be hidden
      if (!item.hidden) {
        items.push({
          name: item.name.substring(prefixLen),
          complete: item.name,
          description: item.description || ''
        });
      }
    }, this);
    this.menu.show(items);
  }.bind(this), util.errorHandler);
};

JavascriptField.prototype.itemClicked = function(ev) {
  var parsed = this.type.parse(ev.arg, this.requisition.context);
  Promise.resolve(parsed).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

JavascriptField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  Promise.resolve(this.getConversion()).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

JavascriptField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = new ScriptArgument(this.input.value, '{ ', ' }');
  return this.type.parse(this.arg, this.requisition.context);
};

JavascriptField.DEFAULT_VALUE = '__JavascriptField.DEFAULT_VALUE';


});
