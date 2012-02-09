/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');

var Argument = require('gcli/argument').Argument;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var JavascriptType = require('gcli/types/javascript').JavascriptType;

var Menu = require('gcli/ui/menu').Menu;
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
  this.arg = new Argument('', '{ ', ' }');

  this.element = util.dom.createElement(this.document, 'div');

  this.input = util.dom.createElement(this.document, 'input');
  this.input.type = 'text';
  this.input.addEventListener('keyup', this.onInputChange, false);
  this.input.classList.add('gcli-field');
  this.input.classList.add('gcli-field-javascript');
  this.element.appendChild(this.input);

  this.menu = new Menu({ document: this.document, field: true });
  this.element.appendChild(this.menu.element);

  this.setConversion(this.type.parse(new Argument('')));

  this.fieldChanged = util.createEvent('JavascriptField.fieldChanged');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick = this.onItemClick.bind(this);
}

JavascriptField.prototype = Object.create(Field.prototype);

JavascriptField.claim = function(type) {
  return type instanceof JavascriptType ? Field.TOOLTIP_MATCH : Field.NO_MATCH;
};

JavascriptField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.input.removeEventListener('keyup', this.onInputChange, false);
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
  if (this.type instanceof JavascriptType) {
    var typed = conversion.arg.text;
    var lastDot = typed.lastIndexOf('.');
    if (lastDot !== -1) {
      prefixLen = lastDot;
    }
  }

  var items = [];
  var predictions = conversion.getPredictions();
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
  this.setMessage(conversion.message);
};

JavascriptField.prototype.onItemClick = function(ev) {
  this.item = ev.currentTarget.item;
  this.arg = this.arg.beget(this.item.complete, { normalize: true });
  var conversion = this.type.parse(this.arg);
  this.fieldChanged({ conversion: conversion });
  this.setMessage(conversion.message);
};

JavascriptField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  var conversion = this.getConversion();
  this.fieldChanged({ conversion: conversion });
  this.setMessage(conversion.message);
};

JavascriptField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget(this.input.value, { normalize: true });
  return this.type.parse(this.arg);
};

JavascriptField.DEFAULT_VALUE = '__JavascriptField.DEFAULT_VALUE';


});
