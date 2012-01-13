/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;
var createEvent = require('gcli/util').createEvent;
var KeyEvent = require('gcli/util').event.KeyEvent;
var l10n = require('gcli/l10n');

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;

var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ArrayConversion = require('gcli/types').ArrayConversion;

var StringType = require('gcli/types/basic').StringType;
var NumberType = require('gcli/types/basic').NumberType;
var BooleanType = require('gcli/types/basic').BooleanType;
var BlankType = require('gcli/types/basic').BlankType;
var SelectionType = require('gcli/types/basic').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;
var ArrayType = require('gcli/types/basic').ArrayType;
var JavascriptType = require('gcli/types/javascript').JavascriptType;

var Menu = require('gcli/ui/menu').Menu;


/**
 * A Field is a way to get input for a single parameter.
 * This class is designed to be inherited from. It's important that all
 * subclasses have a similar constructor signature because they are created
 * via getField(...)
 * @param type The type to use in conversions
 * @param options A set of properties to help fields configure themselves:
 * - document: The document we use in calling createElement
 * - named: Is this parameter named? That is to say, are positional
 *         arguments disallowed, if true, then we need to provide updates to
 *         the command line that explicitly name the parameter in use
 *         (e.g. --verbose, or --name Fred rather than just true or Fred)
 * - name: If this parameter is named, what name should we use
 * - requisition: The requisition that we're attached to
 * - required: Boolean to indicate if this is a mandatory field
 */
function Field(type, options) {
  this.type = type;
  this.document = options.document;
  this.requisition = options.requisition;
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
  delete this.messageElement;
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
 * Set the element where messages and validation errors will be displayed
 * @see setMessage()
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
Field.prototype.onInputChange = function(ev) {
  var conversion = this.getConversion();
  this.fieldChanged({ conversion: conversion });
  this.setMessage(conversion.message);

  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    this.requisition.exec();
  }
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

function getField(type, options) {
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
    console.error('Unknown field type ', type, ' in ', fieldCtors);
    throw new Error('Can\'t find field for ' + type);
  }

  return new ctor(type, options);
}

exports.Field = Field;
exports.addField = addField;
exports.removeField = removeField;
exports.getField = getField;


/**
 * A field that allows editing of strings
 */
function StringField(type, options) {
  Field.call(this, type, options);
  this.arg = new Argument();

  this.element = dom.createElement(this.document, 'input');
  this.element.type = 'text';
  this.element.classList.add('gcli-field');

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.fieldChanged = createEvent('StringField.fieldChanged');
}

StringField.prototype = Object.create(Field.prototype);

StringField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
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
 * A field that allows editing of numbers using an [input type=number] field
 */
function NumberField(type, options) {
  Field.call(this, type, options);
  this.arg = new Argument();

  this.element = dom.createElement(this.document, 'input');
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
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
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
function BooleanField(type, options) {
  Field.call(this, type, options);

  this.name = options.name;
  this.named = options.named;

  this.element = dom.createElement(this.document, 'input');
  this.element.type = 'checkbox';
  this.element.id = 'gcliForm' + this.name;

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.fieldChanged = createEvent('BooleanField.fieldChanged');
}

BooleanField.prototype = Object.create(Field.prototype);

BooleanField.claim = function(type) {
  return type instanceof BooleanType ? Field.MATCH : Field.NO_MATCH;
};

BooleanField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
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
function SelectionField(type, options) {
  Field.call(this, type, options);

  this.items = [];

  this.element = dom.createElement(this.document, 'select');
  this.element.classList.add('gcli-field');
  this._addOption({
    name: l10n.lookupFormat('fieldSelectionSelect', [ options.name ])
  });
  var lookup = this.type.getLookup();
  lookup.forEach(this._addOption, this);

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.fieldChanged = createEvent('SelectionField.fieldChanged');
}

SelectionField.prototype = Object.create(Field.prototype);

SelectionField.claim = function(type) {
  return type instanceof SelectionType ? Field.DEFAULT_MATCH : Field.NO_MATCH;
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

  var option = dom.createElement(this.document, 'option');
  option.innerHTML = item.name;
  option.value = item.index;
  this.element.appendChild(option);
};

exports.SelectionField = SelectionField;
addField(SelectionField);


/**
 * A field that allows editing of javascript
 */
function JavascriptField(type, options) {
  Field.call(this, type, options);

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new Argument('', '{ ', ' }');

  this.element = dom.createElement(this.document, 'div');

  this.input = dom.createElement(this.document, 'input');
  this.input.type = 'text';
  this.input.addEventListener('keyup', this.onInputChange, false);
  this.input.classList.add('gcli-field');
  this.input.classList.add('gcli-field-javascript');
  this.element.appendChild(this.input);

  this.menu = new Menu({ document: this.document, field: true });
  this.element.appendChild(this.menu.element);

  this.setConversion(this.type.parse(new Argument('')));

  this.fieldChanged = createEvent('JavascriptField.fieldChanged');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick = this.onItemClick.bind(this);
}

JavascriptField.prototype = Object.create(Field.prototype);

JavascriptField.claim = function(type) {
  return type instanceof JavascriptType ? Field.MATCH : Field.NO_MATCH;
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

exports.JavascriptField = JavascriptField;
addField(JavascriptField);


/**
 * A field that works with deferred types by delaying resolution until that
 * last possible time
 */
function DeferredField(type, options) {
  Field.call(this, type, options);
  this.options = options;
  this.requisition.assignmentChange.add(this.update, this);

  this.element = dom.createElement(this.document, 'div');
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
  this.field = getField(subtype, this.options);
  this.field.fieldChanged.add(this.fieldChanged, this);

  dom.clearElement(this.element);
  this.element.appendChild(this.field.element);
};

DeferredField.claim = function(type) {
  return type instanceof DeferredType ? Field.MATCH : Field.NO_MATCH;
};

DeferredField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.requisition.assignmentChange.remove(this.update, this);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
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
function BlankField(type, options) {
  Field.call(this, type, options);

  this.element = dom.createElement(this.document, 'div');

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
function ArrayField(type, options) {
  Field.call(this, type, options);
  this.options = options;

  this._onAdd = this._onAdd.bind(this);
  this.members = [];

  // <div class=gcliArrayParent save="${element}">
  this.element = dom.createElement(this.document, 'div');
  this.element.classList.add('gcli-array-parent');

  // <button class=gcliArrayMbrAdd onclick="${_onAdd}" save="${addButton}">Add
  this.addButton = dom.createElement(this.document, 'button');
  this.addButton.classList.add('gcli-array-member-add');
  this.addButton.addEventListener('click', this._onAdd, false);
  this.addButton.innerHTML = l10n.lookup('fieldArrayAdd');
  this.element.appendChild(this.addButton);

  // <div class=gcliArrayMbrs save="${mbrElement}">
  this.container = dom.createElement(this.document, 'div');
  this.container.classList.add('gcli-array-members');
  this.element.appendChild(this.container);

  this.onInputChange = this.onInputChange.bind(this);

  this.fieldChanged = createEvent('ArrayField.fieldChanged');
}

ArrayField.prototype = Object.create(Field.prototype);

ArrayField.claim = function(type) {
  return type instanceof ArrayType ? Field.MATCH : Field.NO_MATCH;
};

ArrayField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
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
  var element = dom.createElement(this.document, 'div');
  element.classList.add('gcli-array-member');
  this.container.appendChild(element);

  // ${field.element}
  var field = getField(this.type.subtype, this.options);
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
  var delButton = dom.createElement(this.document, 'button');
  delButton.classList.add('gcli-array-member-del');
  delButton.addEventListener('click', this._onDel, false);
  delButton.innerHTML = l10n.lookup('fieldArrayDel');
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
