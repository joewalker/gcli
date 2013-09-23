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

var promise = require('gcli/util/promise');
var util = require('gcli/util/util');
var l10n = require('gcli/util/l10n');

var Argument = require('gcli/argument').Argument;

var Menu = require('gcli/ui/fields/menu').Menu;
var Field = require('gcli/ui/fields').Field;

/**
 * A field that allows selection of one of a number of options
 */
function SelectionTooltipField(type, options) {
  Field.call(this, type, options);

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new Argument();

  this.menu = new Menu({ document: this.document, type: type });
  this.element = this.menu.element;

  this.onFieldChange = util.createEvent('SelectionTooltipField.onFieldChange');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick.add(this.itemClicked, this);
}

SelectionTooltipField.prototype = Object.create(Field.prototype);

SelectionTooltipField.claim = function(type, context) {
  return type.getType(context).isSelection ? Field.MATCH : Field.NO_MATCH;
};

SelectionTooltipField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.menu.onItemClick.remove(this.itemClicked, this);
  this.menu.destroy();
  this.element = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

SelectionTooltipField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.setMessage(conversion.message);

  conversion.getPredictions().then(function(predictions) {
    var items = predictions.map(function(prediction) {
      // If the prediction value is an 'item' (that is an object with a name and
      // description) then use that, otherwise use the prediction itself, because
      // at least that has a name.
      return prediction.value && prediction.value.description ?
          prediction.value :
          prediction;
    }, this);
    this.menu.show(items, conversion.arg.text);
  }.bind(this), util.errorHandler);
};

SelectionTooltipField.prototype.itemClicked = function(ev) {
  var parsed = this.type.parse(ev.arg, this.requisition.executionContext);
  promise.resolve(parsed).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

SelectionTooltipField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  promise.resolve(this.getConversion()).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

SelectionTooltipField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget({ text: this.input.value });
  return this.type.parse(this.arg, this.requisition.executionContext);
};

/**
 * Allow the menu to highlight the correct prediction choice
 */
SelectionTooltipField.prototype.setChoiceIndex = function(choice) {
  this.menu.setChoiceIndex(choice);
};

/**
 * Allow the terminal to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if an item was 'clicked', false otherwise
 */
SelectionTooltipField.prototype.selectChoice = function() {
  return this.menu.selectChoice();
};

Object.defineProperty(SelectionTooltipField.prototype, 'isImportant', {
  get: function() {
    return this.type.name !== 'command';
  },
  enumerable: true
});

SelectionTooltipField.DEFAULT_VALUE = '__SelectionTooltipField.DEFAULT_VALUE';

/**
 * Allow registration and de-registration.
 */
exports.items = [ SelectionTooltipField ];

});
