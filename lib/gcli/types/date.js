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
  if (typeSpec) {
    this._step = typeSpec.step || 1;
  }
  else {
    this._step = 1;
  }
}

DateType.prototype = Object.create(Type.prototype);

DateType.prototype.stringify = function(value) {
  if (!this._isValidDate(value)) {
    return '';
  }
  return value.toString();
};

DateType.prototype.parse = function(arg) {
  if (arg.text.replace(/\s/g, '').length === 0) {
    return new Conversion(undefined, arg, Status.INCOMPLETE, '');
  }

  var value;

  if (arg.text === 'now') {
    value = new Date();
  } else if (arg.text === 'yesterday') {
    value = new Date();
    value.setDate(new Date().getDate() - 1);
  } else if (arg.text === 'tomorrow') {
    value = new Date();
    value.setDate(new Date().getDate() + 1);
  } else {
    value = new Date(arg.text);
  }
  if (isNaN(value)) {
    return new Conversion(undefined, arg, Status.ERROR,
        l10n.lookupFormat('typesDateNan', [ arg.text ]));
  }

  return new Conversion(value, arg);
};

DateType.prototype.decrement = function(value) {
  if (!this._isValidDate(value)) {
    return this._getDefault();
  }
  var newValue = new Date(value);
  newValue.setDate(value.getDate() - this._step);
  return newValue;
};

DateType.prototype.increment = function(value) {
  if (!this._isValidDate(value)) {
    return this._getDefault();
  }
  var newValue = new Date(value);
  newValue.setDate(value.getDate() + this._step);
  return newValue;
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
