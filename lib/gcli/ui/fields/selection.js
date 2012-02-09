/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var Argument = require('gcli/argument').Argument;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var BooleanType = require('gcli/types/basic').BooleanType;
var SelectionType = require('gcli/types/selection').SelectionType;

var Menu = require('gcli/ui/menu').Menu;
var Field = require('gcli/ui/field').Field;
var fields = require('gcli/ui/field');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  fields.addField(SelectionField);
};

exports.shutdown = function() {
  fields.removeField(SelectionField);
};


/**
 * Model an instanceof SelectionType as a select input box.
 * <p>There are 3 slightly overlapping concepts to be aware of:
 * <ul>
 * <li>value: This is the (probably non-string) value, known as a value by the
 *   assignment
 * <li>optValue: This is the text value as known by the DOM option element, as
 *   in &lt;option value=???%gt...
 * <li>optText: This is the contents of the DOM option element.
 * </ul>
 */
function SelectionField(type, options) {
  Field.call(this, type, options);

  this.items = [];

  this.element = util.dom.createElement(this.document, 'select');
  this.element.classList.add('gcli-field');
  this._addOption({
    name: l10n.lookupFormat('fieldSelectionSelect', [ options.name ])
  });
  var lookup = this.type.getLookup();
  lookup.forEach(this._addOption, this);

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.fieldChanged = util.createEvent('SelectionField.fieldChanged');
}

SelectionField.prototype = Object.create(Field.prototype);

SelectionField.claim = function(type) {
  if (type instanceof BooleanType) {
    return Field.BASIC;
  }
  return type instanceof SelectionType ? Field.TOOLTIP_DEFAULT : Field.NO_MATCH;
};

SelectionField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

SelectionField.prototype.setConversion = function(conversion) {
  var index;
  this.items.forEach(function(item) {
    if (item.value && item.value === conversion.value) {
      index = item.index;
    }
  }, this);
  this.element.value = index;
  this.setMessage(conversion.message);
};

SelectionField.prototype.getConversion = function() {
  var item = this.items[this.element.value];
  var arg = new Argument(item.name, ' ');
  var value = item.value ? item.value : item;
  return new Conversion(value, arg);
};

SelectionField.prototype._addOption = function(item) {
  item.index = this.items.length;
  this.items.push(item);

  var option = util.dom.createElement(this.document, 'option');
  option.innerHTML = item.name;
  option.value = item.index;
  this.element.appendChild(option);
};


});
