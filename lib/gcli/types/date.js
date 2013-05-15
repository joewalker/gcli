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
    value = Date.parse(arg.text);

    if (isNaN(value)) {
      var msg = l10n.lookupFormat('typesDateNan', [ arg.text ]);
      return Promise.resolve(new Conversion(undefined, arg, Status.ERROR, msg));
    }
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
