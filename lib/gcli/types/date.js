/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(DateType);
};

exports.shutdown = function() {
  types.unregisterType(DateType);
};


function DateType(typeSpec) {
  /* ECMA 5.1 §15.9.1.1
   * @see http://stackoverflow.com/questions/11526504/minimum-and-maximum-date
   */
  if (typeSpec) {
    this._step = typeSpec.step || 1;
    this._min = typeSpec.min || new Date(-8640000000000000);
    this._max = typeSpec.max || new Date(8640000000000000);
  }
  else {
    this._step = 1;
    this._min = new Date(-8640000000000000);
    this._max = new Date(8640000000000000);
  }
}

DateType.prototype = Object.create(Type.prototype);

DateType.prototype.stringify = function(value) {
  if (!this._isValidDate(value)) {
    return '';
  }
  return value.toString();
};

DateType.prototype.getMin = function() {
  if (typeof this._min === 'function') {
    return this._min();
  }
  if (Object.prototype.toString.call(this._min) === '[object Date]') {
    return this._min;
  }
  return undefined;
};

DateType.prototype.getMax = function() {
  if (typeof this._max === 'function') {
    return this._max();
  }
  if (Object.prototype.toString.call(this._max) === '[object Date]') {
    return this._max;
  }
  return undefined;
};

DateType.prototype.parse = function(arg) {
  var value;

  if (arg.text.replace(/\s/g, '').length === 0) {
    return new Conversion(undefined, arg, Status.INCOMPLETE, '');
  }

  // Lots of room for improvement here: 1h ago, in two days, etc.
  // Should "1h ago" dynamically update the step?
  if (arg.text === 'now') {
    value = new Date();
  } else if (arg.text === 'yesterday') {
    value = new Date().setDate(new Date().getDate() - 1);
  } else if (arg.text === 'tomorrow') {
    value = new Date().setDate(new Date().getDate() + 1);
  } else {
    value = Date.parse(arg.text);
    if (isNaN(value)) {
      return new Conversion(undefined, arg, Status.ERROR,
          l10n.lookupFormat('typesDateNan', [ arg.text ]));
    }
  }

  return new Conversion(value, arg);
};

DateType.prototype.decrement = function(value) {
  if (!this._isValidDate(value)) {
    return this._getDefault();
  }
  var newValue = new Date(value);
  newValue.setDate(value.getDate() - this._step);
  if (newValue >= this.getMin()) {
    return newValue;
  } else {
    return this.getMin();
  }
};

DateType.prototype.increment = function(value) {
  if (!this._isValidDate(value)) {
    return this._getDefault();
  }
  var newValue = new Date(value);
  newValue.setDate(value.getDate() + this._step);
  if (newValue <= this.getMax()) {
    return newValue;
  } else {
    return this.getMax();
  }
};

/**
 * Is |thing| a valid date?
 * @see http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
 */
DateType.prototype._isValidDate = function(thing) {
  return Object.prototype.toString.call(thing) === "[object Date]"
          && !isNaN(thing.getTime());
};

DateType.prototype._getDefault = function() {
  return new Date();
}

DateType.prototype.name = 'date';

exports.DateType = DateType;


});
