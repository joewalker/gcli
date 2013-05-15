/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

'use strict';

var Promise = require('util/promise');
var l10n = require('util/l10n');

var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;


function DateType(typeSpec) {
  // ECMA 5.1 §15.9.1.1
  // @see http://stackoverflow.com/questions/11526504/minimum-and-maximum-date
  typeSpec = typeSpec || {};

  this._step = typeSpec.step || 1;
  this._min = new Date(-8640000000000000);
  this._max = new Date(8640000000000000);

  if (typeSpec.min != null) {
    if (typeof typeSpec.min === 'string') {
      this._min = toDate(typeSpec.min);
    }
    else if (isDate(typeSpec.min) || typeof typeSpec.min === 'function') {
      this._min = typeSpec.min;
    }
    else {
      throw new Error('date min value must be a string a date or a function');
    }
  }

  if (typeSpec.max != null) {
    if (typeof typeSpec.max === 'string') {
      this._max = toDate(typeSpec.max);
    }
    else if (isDate(typeSpec.max) || typeof typeSpec.max === 'function') {
      this._max = typeSpec.max;
    }
    else {
      throw new Error('date max value must be a string a date or a function');
    }
  }
}

DateType.prototype = Object.create(Type.prototype);

DateType.prototype.stringify = function(value) {
  if (!isDate(value)) {
    return '';
  }
  return value.toString();
};

DateType.prototype.getMin = function(context) {
  if (typeof this._min === 'function') {
    return this._min(context);
  }
  if (isDate(this._min)) {
    return this._min;
  }
  return undefined;
};

DateType.prototype.getMax = function(context) {
  if (typeof this._max === 'function') {
    return this._max(context);
  }
  if (isDate(this._max)) {
    return this._max;
  }
  return undefined;
};

DateType.prototype.parse = function(arg, context) {
  var value;

  if (arg.text.replace(/\s/g, '').length === 0) {
    return Promise.resolve(new Conversion(undefined, arg, Status.INCOMPLETE, ''));
  }

  // Lots of room for improvement here: 1h ago, in two days, etc.
  // Should "1h ago" dynamically update the step?
  if (arg.text === 'now') {
    value = new Date();
  }
  else if (arg.text === 'yesterday') {
    value = new Date().setDate(new Date().getDate() - 1);
  }
  else if (arg.text === 'tomorrow') {
    value = new Date().setDate(new Date().getDate() + 1);
  }
  else {
    var millis = Date.parse(arg.text);

    if (isNaN(millis)) {
      var msg = l10n.lookupFormat('typesDateNan', [ arg.text ]);
      return Promise.resolve(new Conversion(undefined, arg, Status.ERROR, msg));
    }

    value = new Date(millis);
  }

  return Promise.resolve(new Conversion(value, arg));
};

DateType.prototype.decrement = function(value, context) {
  if (!isDate(value)) {
    return new Date();
  }

  var newValue = new Date(value);
  newValue.setDate(value.getDate() - this._step);

  if (newValue >= this.getMin(context)) {
    return newValue;
  }
  else {
    return this.getMin(context);
  }
};

DateType.prototype.increment = function(value, context) {
  if (!isDate(value)) {
    return new Date();
  }

  var newValue = new Date(value);
  newValue.setDate(value.getDate() + this._step);

  if (newValue <= this.getMax(context)) {
    return newValue;
  }
  else {
    return this.getMax();
  }
};

DateType.prototype.name = 'date';


/**
 * Utility to convert a string to a date, throwing if the date can't be
 * parsed rather than having an invalid date
 */
function toDate(str) {
  var millis = Date.parse(str);
  if (isNaN(millis)) {
    throw new Error(l10n.lookupFormat('typesDateNan', [ str ]));
  }
  return new Date(millis);
}

/**
 * Is |thing| a valid date?
 * @see http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
 */
function isDate(thing) {
  return Object.prototype.toString.call(thing) === '[object Date]'
          && !isNaN(thing.getTime());
};


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.addType(DateType);
};

exports.shutdown = function() {
  types.removeType(DateType);
};



});
