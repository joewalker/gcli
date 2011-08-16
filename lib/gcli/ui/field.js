/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;
var console = require('gcli/util').console;
var createEvent = require('gcli/util').createEvent;

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;

var Conversion = require('gcli/types').Conversion;
var ArrayConversion = require('gcli/types').ArrayConversion;

var StringType = require('gcli/types').StringType;
var NumberType = require('gcli/types').NumberType;
var BooleanType = require('gcli/types').BooleanType;
var BlankType = require('gcli/types').BlankType;
var SelectionType = require('gcli/types').SelectionType;
var DeferredType = require('gcli/types').DeferredType;
var ArrayType = require('gcli/types').ArrayType;
var JavascriptType = require('gcli/jstype').JavascriptType;


/**
 * A Field is a way to get input for a single parameter.
 * This class is designed to be inherited from. It's important that all
 * subclasses have a similar constructor signature because they are created
 * via getField(...)
 * @param doc The document we use in calling createElement
 * @param type The type to use in conversions
 * @param named Is this parameter named? That is to say, are positional
 * arguments disallowed, if true, then we need to provide updates to the
 * command line that explicitly name the parameter in use (e.g. --verbose, or
 * --name Fred rather than just true or Fred)
 * @param name If this parameter is named, what name should we use
 * @param requ The requisition that we're attached to
 */
function Field(doc, type, named, name, requ) {
}

/**
 * Subclasses should assign their element with the DOM node that gets added
 * to the 'form'. It doesn't have to be an input node, just something that
 * contains it.
 */
Field.prototype.element = undefined;

/**
 * Indicates that this field should drop any resources that it has created
 */
Field.prototype.destroy = function() {
};

/**
 * Update this field display with the value from this conversion.
 * Subclasses should provide an implementation of this function.
 */
Field.prototype.setConversion = function(conversion) {
  throw new Error('Field should not be used directly');
};

/**
 * Extract a conversion from the values in this field.
 * Subclasses should provide an implementation of this function.
 */
Field.prototype.getConversion = function() {
  throw new Error('Field should not be used directly');
};

/**
 * Validation errors should be reported somewhere. This is where.
 * See setMessage()
 */
Field.prototype.setMessageElement = function(element) {
  this.messageElement = element;
};

/**
 * Display a validation message in the UI
 */
Field.prototype.setMessage = function(message) {
  if (this.messageElement) {
    if (message == null) {
      message = '';
    }
    dom.setInnerHtml(this.messageElement, message);
  }
};

/**
 * Method to be called by subclasses when their input changes, which allows us
 * to properly pass on the fieldChanged event.
 */
Field.prototype.onInputChange = function() {
  var conversion = this.getConversion();
  this.fieldChanged({ conversion: conversion });
  this.setMessage(conversion.message);
};

/**
 * 'static/abstract' method to allow implementations of Field to lay a claim
 * to a type. This allows claims of various strength to be weighted up.
 * See the Field.*MATCH values.
 */
Field.claim = function() {
  throw new Error('Field should not be used directly');
};
Field.MATCH = 5;
Field.DEFAULT_MATCH = 4;
Field.IF_NOTHING_BETTER = 1;
Field.NO_MATCH = 0;


/**
 * Managing the current list of Fields
 */
var fieldCtors = [];
function addField(fieldCtor) {
  if (typeof fieldCtor !== 'function') {
    console.error('addField erroring on ', fieldCtor);
    throw new Error('addField requires a Field constructor');
  }
  fieldCtors.push(fieldCtor);
}

function removeField(field) {
  if (typeof field !== 'string') {
    fields = fields.filter(function(test) {
      return test !== field;
    });
    delete fields[field];
  }
  else if (field instanceof Field) {
    removeField(field.name);
  }
  else {
    console.error('removeField erroring on ', field);
    throw new Error('removeField requires an instance of Field');
  }
}

function getField(doc, type, named, name, requ) {
  var ctor;
  var highestClaim = -1;
  fieldCtors.forEach(function(fieldCtor) {
    var claim = fieldCtor.claim(type);
    if (claim > highestClaim) {
      highestClaim = claim;
      ctor = fieldCtor;
    }
  });

  if (!ctor) {
    console.error('Can\'t find field for ', type, ' in ', fieldCtors);
  }

  return new ctor(doc, type, named, name, requ);
}

exports.Field = Field;
exports.addField = addField;
exports.removeField = removeField;
exports.getField = getField;


/**
 * A field that allows editing of strings
 */
function StringField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.arg = new Argument();

  this.element = dom.createElement('input', null, this.doc);
  this.element.type = 'text';

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.fieldChanged = createEvent('StringField.fieldChanged');
}

StringField.prototype = Object.create(Field.prototype);

StringField.prototype.destroy = function() {
  this.element.removeEventListener('keyup', this.onKeyup, false);
};

StringField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

StringField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget(this.element.value, { prefixSpace: true });
  return this.type.parse(this.arg);
};

StringField.claim = function(type) {
  return type instanceof StringType ? Field.MATCH : Field.IF_NOTHING_BETTER;
};

exports.StringField = StringField;
addField(StringField);


/**
 * A field that allows editing of javascript
 */
function JavascriptField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.arg = new Argument();

  this.element = dom.createElement('input', null, this.doc);
  this.element.type = 'text';

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.fieldChanged = createEvent('JavascriptField.fieldChanged');
}

JavascriptField.prototype = Object.create(Field.prototype);

JavascriptField.prototype.destroy = function() {
  this.element.removeEventListener('keyup', this.onKeyup, false);
};

JavascriptField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

JavascriptField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget(this.element.value, { prefixSpace: true });
  return this.type.parse(this.arg);
};

JavascriptField.claim = function(type) {
  return type instanceof JavascriptType ? Field.MATCH : Field.IF_NOTHING_BETTER;
};

exports.JavascriptField = JavascriptField;
addField(JavascriptField);


/**
 * A field that allows editing of numbers using an [input type=number] field
 */
function NumberField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.arg = new Argument();

  this.element = dom.createElement('input', null, this.doc);
  this.element.type = 'number';
  if (this.type.max) {
    this.element.max = this.type.max;
  }
  if (this.type.min) {
    this.element.min = this.type.min;
  }
  if (this.type.step) {
    this.element.step = this.type.step;
  }

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.fieldChanged = createEvent('NumberField.fieldChanged');
}

NumberField.prototype = Object.create(Field.prototype);

NumberField.claim = function(type) {
  return type instanceof NumberType ? Field.MATCH : Field.NO_MATCH;
};

NumberField.prototype.destroy = function() {
  this.element.removeEventListener('keyup', this.onKeyup, false);
};

NumberField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

NumberField.prototype.getConversion = function() {
  this.arg = this.arg.beget(this.element.value, { prefixSpace: true });
  return this.type.parse(this.arg);
};

exports.NumberField = NumberField;
addField(NumberField);


/**
 * A field that uses a checkbox to toggle a boolean field
 */
function BooleanField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.name = name;
  this.named = named;

  this.element = dom.createElement('input', null, this.doc);
  this.element.type = 'checkbox';
  this.element.id = 'gcliForm' + name;

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.fieldChanged = createEvent('BooleanField.fieldChanged');
}

BooleanField.prototype = Object.create(Field.prototype);

BooleanField.claim = function(type) {
  return type instanceof BooleanType ? Field.MATCH : Field.NO_MATCH;
};

BooleanField.prototype.destroy = function() {
  this.element.removeEventListener('change', this.onChange, false);
};

BooleanField.prototype.setConversion = function(conversion) {
  this.element.checked = conversion.value;
  this.setMessage(conversion.message);
};

BooleanField.prototype.getConversion = function() {
  var value = this.element.checked;
  var arg = this.named ?
    value ? new TrueNamedArgument(this.name) : new FalseNamedArgument() :
    new Argument(' ' + value);
  return new Conversion(value, arg);
};

exports.BooleanField = BooleanField;
addField(BooleanField);


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
function SelectionField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.opts = {};
  this.defaultText = 'Select a ' + this.type.name + ' ...';

  this.element = dom.createElement('select', null, this.doc);
  this._addOption(null, this.defaultText, SelectionField.DEFAULT_VALUE);
  var lookup = this.type.getLookup();
  Object.keys(lookup).forEach(function(name) {
    this._addOption(lookup[name], name);
  }, this);

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.fieldChanged = createEvent('SelectionField.fieldChanged');
}

SelectionField.prototype = Object.create(Field.prototype);

SelectionField.claim = function(type) {
  return type instanceof SelectionType ? Field.DEFAULT_MATCH : Field.NO_MATCH;
};

SelectionField.prototype.destroy = function() {
  this.element.removeEventListener('change', this.onChange, false);
};

SelectionField.prototype.setConversion = function(conversion) {
  var optValue = SelectionField.DEFAULT_VALUE;
  Object.keys(this.opts).some(function(key) {
    var opt = this.opts[key];
    if (opt.value === conversion.value) {
      optValue = opt.optValue;
      return true;
    }
    return false;
  }, this);
  this.element.value = optValue;
  this.setMessage(conversion.message);
};

SelectionField.prototype.getConversion = function() {
  var value = this.element.value === SelectionField.DEFAULT_VALUE ?
      null :
      this.opts[this.element.value].value;
  var arg = new Argument(this.type.stringify(value), ' ');
  return new Conversion(value, arg);
};

SelectionField.prototype._addOption = function(value, optText, optValue) {
  optValue = optValue || optText;
  this.opts[optValue] = {
    value: value,
    optText: optText,
    optValue: optValue
  };
  var option = dom.createElement('option', null, this.doc);
  option.innerHTML = optText;
  option.value = optValue;
  this.element.appendChild(option);
};

SelectionField.DEFAULT_VALUE = '__SelectionField.DEFAULT_VALUE';

exports.SelectionField = SelectionField;
addField(SelectionField);


/**
 * A field that works with deferred types by delaying resoluion until that last
 * possible time
 */
function DeferredField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.named = named;
  this.name = name;
  this.requ = requ;
  this.requ.assignmentChange.add(this.update, this);

  this.element = dom.createElement('div', null, this.doc);
  this.update();

  this.fieldChanged = createEvent('DeferredField.fieldChanged');
}

DeferredField.prototype = Object.create(Field.prototype);

DeferredField.prototype.update = function() {
  var subtype = this.type.defer();
  if (subtype === this.subtype) {
    return;
  }

  if (this.field) {
    this.field.destroy();
  }

  this.subtype = subtype;
  this.field = getField(this.doc, subtype, this.named, this.name, this.requ);
  this.field.fieldChanged.add(this.fieldChanged, this);

  dom.clearElement(this.element);
  this.element.appendChild(this.field.element);
};

DeferredField.claim = function(type) {
  return type instanceof DeferredType ? Field.MATCH : Field.NO_MATCH;
};

DeferredField.prototype.destroy = function() {
  this.requ.assignmentChange.remove(this.update, this);
};

DeferredField.prototype.setConversion = function(conversion) {
  this.field.setConversion(conversion);
};

DeferredField.prototype.getConversion = function() {
  return this.field.getConversion();
};

exports.DeferredField = DeferredField;
addField(DeferredField);


/**
 * For use with deferred types that do not yet have anything to resolve to.
 * BlankFields are not for general use.
 */
function BlankField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.element = dom.createElement('div', null, this.doc);

  this.fieldChanged = createEvent('BlankField.fieldChanged');
}

BlankField.prototype = Object.create(Field.prototype);

BlankField.claim = function(type) {
  return type instanceof BlankType ? Field.MATCH : Field.NO_MATCH;
};

BlankField.prototype.setConversion = function() { };

BlankField.prototype.getConversion = function() {
  return new Conversion(null);
};

exports.BlankField = BlankField;
addField(BlankField);


/**
 * Adds add/delete buttons to a normal field allowing there to be many values
 * given for a parameter.
 */
function ArrayField(doc, type, named, name, requ) {
  this.doc = doc;
  this.type = type;
  this.named = named;
  this.name = name;
  this.requ = requ;

  this._onAdd = this._onAdd.bind(this);
  this.members = [];

  // <div class=gcliArrayParent save="${element}">
  this.element = dom.createElement('div', null, this.doc);
  this.element.className = 'gcliArrayParent';

  // <div class=gcliArrayMbrAdd onclick="${_onAdd}" save="${addButton}">
  this.addButton = dom.createElement('button', null, this.doc);
  this.addButton.className = 'gcliArrayMbrAdd';
  this.addButton.addEventListener('click', this._onAdd, false);
  this.addButton.innerHTML = 'Add';
  this.element.appendChild(this.addButton);

  // <div class=gcliArrayMbrs save="${mbrElement}">
  this.container = dom.createElement('div', null, this.doc);
  this.container.className = 'gcliArrayMbrs';
  this.element.appendChild(this.container);

  this.onInputChange = this.onInputChange.bind(this);

  this.fieldChanged = createEvent('ArrayField.fieldChanged');
}

ArrayField.prototype = Object.create(Field.prototype);

ArrayField.claim = function(type) {
  return type instanceof ArrayType ? Field.MATCH : Field.NO_MATCH;
};

ArrayField.prototype.destroy = function() {
  this.addButton.removeEventListener('click', this._onAdd, false);
};

ArrayField.prototype.setConversion = function(conversion) {
  // BUG 653568: this is too brutal - it removes focus from any the current field
  dom.clearElement(this.container);
  this.members = [];

  conversion.conversions.forEach(function(subConversion) {
    this._onAdd(null, subConversion);
  }, this);
};

ArrayField.prototype.getConversion = function() {
  var conversions = [];
  var arrayArg = new ArrayArgument();
  for (var i = 0; i < this.members.length; i++) {
    var conversion = this.members[i].field.getConversion();
    conversions.push(conversion);
    arrayArg.addArgument(conversion.arg);
  }
  return new ArrayConversion(conversions, arrayArg);
};

ArrayField.prototype._onAdd = function(ev, subConversion) {

  // <div class=gcliArrayMbr save="${element}">
  var element = dom.createElement('div', null, this.doc);
  element.className = 'gcliArrayMbr';
  this.container.appendChild(element);

  // ${field.element}
  var field = getField(this.doc, this.type.subtype, this.named,
      this.name, this.requ);
  field.fieldChanged.add(function() {
    var conversion = this.getConversion();
    this.fieldChanged({ conversion: conversion });
    this.setMessage(conversion.message);
  }, this);

  if (subConversion) {
    field.setConversion(subConversion);
  }
  element.appendChild(field.element);

  // <div class=gcliArrayMbrDel onclick="${_onDel}">
  var delButton = dom.createElement('button', null, this.doc);
  delButton.className = 'gcliArrayMbrDel';
  delButton.addEventListener('click', this._onDel, false);
  delButton.innerHTML = 'Del';
  element.appendChild(delButton);

  var member = {
    element: element,
    field: field,
    parent: this
  };
  member.onDelete = function() {
    this.parent.container.removeChild(this.element);
    this.parent.members = this.parent.members.filter(function(test) {
      return test !== this;
    });
    this.parent.onInputChange();
  }.bind(member);
  delButton.addEventListener('click', member.onDelete, false);

  this.members.push(member);
};

exports.ArrayField = ArrayField;
addField(ArrayField);


});
