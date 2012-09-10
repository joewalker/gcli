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


var util = require('gcli/util');
var KeyEvent = require('gcli/util').KeyEvent;

var BlankType = require('gcli/types/basic').BlankType;

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

// Note: We could/should probably change Fields from working with Conversions
// to working with Arguments (Tokens), which makes for less calls to parse()

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
    util.setContents(this.messageElement, message);
  }
};

/**
 * Method to be called by subclasses when their input changes, which allows us
 * to properly pass on the onFieldChange event.
 */
Field.prototype.onInputChange = function(ev) {
  var conversion = this.getConversion();
  this.onFieldChange({ conversion: conversion });
  this.setMessage(conversion.message);

  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    this.requisition.exec();
  }
};

/**
 * Some fields contain information that is more important to the user, for
 * example error messages and completion menus.
 */
Field.prototype.isImportant = false;

/**
 * 'static/abstract' method to allow implementations of Field to lay a claim
 * to a type. This allows claims of various strength to be weighted up.
 * See the Field.*MATCH values.
 */
Field.claim = function() {
  throw new Error('Field should not be used directly');
};

/**
 * About minimalism - If we're producing a dialog, we want a field for every
 * parameter. If we're providing a quick tooltip, we only want a field when
 * it's really going to help.
 * The getField() function takes an option of 'tooltip: true'. Fields are
 * expected to reply with a TOOLTIP_* constant if they should be shown in the
 * tooltip case.
 */
Field.TOOLTIP_MATCH = 5;   // A best match, that works for a tooltip
Field.TOOLTIP_DEFAULT = 4; // A default match that should show in a tooltip
Field.MATCH = 3;           // Match, but ignorable if we're being minimalist
Field.DEFAULT = 2;         // This is a default (non-minimalist) match
Field.BASIC = 1;           // OK in an emergency. i.e. assume Strings
Field.NO_MATCH = 0;        // This field can't help with the given type

exports.Field = Field;


/**
 * Internal array of known fields
 */
var fieldCtors = [];

/**
 * Add a field definition by field constructor
 * @param fieldCtor Constructor function of new Field
 */
exports.addField = function(fieldCtor) {
  if (typeof fieldCtor !== 'function') {
    console.error('addField erroring on ', fieldCtor);
    throw new Error('addField requires a Field constructor');
  }
  fieldCtors.push(fieldCtor);
};

/**
 * Remove a Field definition
 * @param field A previously registered field, specified either with a field
 * name or from the field name
 */
exports.removeField = function(field) {
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
};

/**
 * Find the best possible matching field from the specification of the type
 * of field required.
 * @param type An instance of Type that we will represent
 * @param options A set of properties that we should attempt to match, and use
 * in the construction of the new field object:
 * - document: The document to use in creating new elements
 * - name: The parameter name, (i.e. assignment.param.name)
 * - requisition: The requisition we're monitoring,
 * - required: Is this a required parameter (i.e. param.isDataRequired)
 * - named: Is this a named parameters (i.e. !param.isPositionalAllowed)
 * @return A newly constructed field that best matches the input options
 */
exports.getField = function(type, options) {
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

  if (options.tooltip && highestClaim < Field.TOOLTIP_DEFAULT) {
    return new BlankField(type, options);
  }

  return new ctor(type, options);
};


/**
 * For use with deferred types that do not yet have anything to resolve to.
 * BlankFields are not for general use.
 */
function BlankField(type, options) {
  Field.call(this, type, options);

  this.element = util.createElement(this.document, 'div');

  this.onFieldChange = util.createEvent('BlankField.onFieldChange');
}

BlankField.prototype = Object.create(Field.prototype);

BlankField.claim = function(type) {
  return type instanceof BlankType ? Field.MATCH : Field.NO_MATCH;
};

BlankField.prototype.setConversion = function(conversion) {
  this.setMessage(conversion.message);
};

BlankField.prototype.getConversion = function() {
  return this.type.parse(new Argument());
};

exports.addField(BlankField);


});
