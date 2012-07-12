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


/**
 * We don't currently plan to distinguish between integers and floats
 */
function DateType(typeSpec) {
  if (typeSpec) {
    this._min = typeSpec.min;
    this._max = typeSpec.max;
    this._step = typeSpec.step || 1;
  }
  else {
    this._step = 1;
  }
}

DateType.prototype = Object.create(Type.prototype);

DateType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

DateType.prototype.getMin = function() {
  if (this._min) {
    if (typeof this._min === 'function') {
      return this._min();
    }
    if (this._isValidDate(this._min)) {
      return this._min;
    }
  }
  return undefined;
};

DateType.prototype.getMax = function() {
  if (this._max) {
    if (typeof this._max === 'function') {
      return this._max();
    }
    if (this._isValidDate(this._max)) {
      return this._max;
    }
  }
  return undefined;
};

DateType.prototype.parse = function(arg) {
  if (arg.text.replace(/\s/g, '').length === 0) {
    return new Conversion(undefined, arg, Status.INCOMPLETE, '');
  }

  // NOTE: Branch name changed to date-773271 because the cookie command
  // shipped without the date type

  // TODO: Convert arg.text to a Date. Probably stick to a fairly narrow set
  // of formats with some constants like 'now', 'yesterday', 'tomorrow'
  var value = parseInt(arg.text, 10);
  if (isNaN(value)) {
    return new Conversion(undefined, arg, Status.ERROR,
        l10n.lookupFormat('typesDateNan', [ arg.text ]));
  }

  var max = this.getMax();
  if (max != null && value > max) {
    return new Conversion(undefined, arg, Status.ERROR,
        l10n.lookupFormat('typesDateMax', [ value, max ]));
  }

  var min = this.getMin();
  if (min != null && value < min) {
    return new Conversion(undefined, arg, Status.ERROR,
        l10n.lookupFormat('typesDateMin', [ value, min ]));
  }

  return new Conversion(value, arg);
};

DateType.prototype.decrement = function(value) {
  if (this._isValidDate(value)) {
    return this.getMax() || 1;
  }
  var newValue = value - this._step;
  // Snap to the nearest incremental of the step
  newValue = Math.ceil(newValue / this._step) * this._step;
  return this._boundsCheck(newValue);
};

DateType.prototype.increment = function(value) {
  if (this._isValidDate(value)) {
    var min = this.getMin();
    return min != null ? min : 0;
  }
  var newValue = value + this._step;
  // Snap to the nearest incremental of the step
  newValue = Math.floor(newValue / this._step) * this._step;
  if (this.getMax() == null) {
    return newValue;
  }
  return this._boundsCheck(newValue);
};

/**
 * Return the input value so long as it is within the max/min bounds. If it is
 * lower than the minimum, return the minimum. If it is bigger than the maximum
 * then return the maximum.
 */
DateType.prototype._boundsCheck = function(value) {
  var min = this.getMin();
  if (min != null && value < min) {
    return min;
  }
  var max = this.getMax();
  if (max != null && value > max) {
    return max;
  }
  return value;
};

/**
 * Is |thing| a valid date?
 * @see http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
 */
DateType.prototype._isValidDate = function(thing) {
  return Object.prototype.toString.call(thing) === "[object Date]"
          && !isNaN(thing.getTime());
};

DateType.prototype.name = 'date';

exports.DateType = DateType;


});
