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

'use strict';

var Promise = require('util/promise');
var util = require('util/util');
var l10n = require('util/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ArrayConversion = require('gcli/types').ArrayConversion;
var SelectionType = require('gcli/types/selection').SelectionType;

var BlankArgument = require('gcli/argument').BlankArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.addType(StringType);
  types.addType(NumberType);
  types.addType(BooleanType);
  types.addType(BlankType);
  types.addType(DelegateType);
  types.addType(ArrayType);
};

exports.shutdown = function() {
  types.removeType(StringType);
  types.removeType(NumberType);
  types.removeType(BooleanType);
  types.removeType(BlankType);
  types.removeType(DelegateType);
  types.removeType(ArrayType);
};


/**
 * 'string' the most basic string type that doesn't need to convert
 */
function StringType(typeSpec) {
}

StringType.prototype = Object.create(Type.prototype);

StringType.prototype.stringify = function(value, context) {
  if (value == null) {
    return '';
  }
  return value.toString();
};

StringType.prototype.parse = function(arg, context) {
  if (arg.text == null || arg.text === '') {
    return Promise.resolve(new Conversion(undefined, arg, Status.INCOMPLETE, ''));
  }
  return Promise.resolve(new Conversion(arg.text, arg));
};

StringType.prototype.name = 'string';

exports.StringType = StringType;


/**
 * We distinguish between integers and floats with the _allowFloat flag.
 */
function NumberType(typeSpec) {
  // Default to integer values
  this._allowFloat = !!typeSpec.allowFloat;

  if (typeSpec) {
    this._min = typeSpec.min;
    this._max = typeSpec.max;
    this._step = typeSpec.step || 1;

    if (!this._allowFloat &&
        (this._isFloat(this._min) ||
         this._isFloat(this._max) ||
         this._isFloat(this._step))) {
      throw new Error('allowFloat is false, but non-integer values given in type spec');
    }
  }
  else {
    this._step = 1;
  }
}

NumberType.prototype = Object.create(Type.prototype);

NumberType.prototype.stringify = function(value, context) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

NumberType.prototype.getMin = function() {
  if (this._min) {
    if (typeof this._min === 'function') {
      return this._min();
    }
    if (typeof this._min === 'number') {
      return this._min;
    }
  }
  return undefined;
};

NumberType.prototype.getMax = function() {
  if (this._max) {
    if (typeof this._max === 'function') {
      return this._max();
    }
    if (typeof this._max === 'number') {
      return this._max;
    }
  }
  return undefined;
};

NumberType.prototype.parse = function(arg, context) {
  if (arg.text.replace(/^\s*-?/, '').length === 0) {
    return Promise.resolve(new Conversion(undefined, arg, Status.INCOMPLETE, ''));
  }

  if (!this._allowFloat && (arg.text.indexOf('.') !== -1)) {
    var message = l10n.lookupFormat('typesNumberNotInt2', [ arg.text ]);
    return Promise.resolve(new Conversion(undefined, arg, Status.ERROR, message));
  }

  var value;
  if (this._allowFloat) {
    value = parseFloat(arg.text);
  }
  else {
    value = parseInt(arg.text, 10);
  }

  if (isNaN(value)) {
    var message = l10n.lookupFormat('typesNumberNan', [ arg.text ]);
    return Promise.resolve(new Conversion(undefined, arg, Status.ERROR, message));
  }

  var max = this.getMax();
  if (max != null && value > max) {
    var message = l10n.lookupFormat('typesNumberMax', [ value, max ]);
    return Promise.resolve(new Conversion(undefined, arg, Status.ERROR, message));
  }

  var min = this.getMin();
  if (min != null && value < min) {
    var message = l10n.lookupFormat('typesNumberMin', [ value, min ]);
    return Promise.resolve(new Conversion(undefined, arg, Status.ERROR, message));
  }

  return Promise.resolve(new Conversion(value, arg));
};

NumberType.prototype.decrement = function(value, context) {
  if (typeof value !== 'number' || isNaN(value)) {
    return this.getMax() || 1;
  }
  var newValue = value - this._step;
  // Snap to the nearest incremental of the step
  newValue = Math.ceil(newValue / this._step) * this._step;
  return this._boundsCheck(newValue);
};

NumberType.prototype.increment = function(value, context) {
  if (typeof value !== 'number' || isNaN(value)) {
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
NumberType.prototype._boundsCheck = function(value) {
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
 * Return true if the given value is a finite number and not an integer, else
 * return false.
 */
NumberType.prototype._isFloat = function(value) {
  return ((typeof value === 'number') && isFinite(value) && (value % 1 !== 0));
};

NumberType.prototype.name = 'number';

exports.NumberType = NumberType;


/**
 * true/false values
 */
function BooleanType(typeSpec) {
}

BooleanType.prototype = Object.create(SelectionType.prototype);

BooleanType.prototype.lookup = [
  { name: 'false', value: false },
  { name: 'true', value: true }
];

BooleanType.prototype.parse = function(arg, context) {
  if (arg.type === 'TrueNamedArgument') {
    return Promise.resolve(new Conversion(true, arg));
  }
  if (arg.type === 'FalseNamedArgument') {
    return Promise.resolve(new Conversion(false, arg));
  }
  return SelectionType.prototype.parse.call(this, arg, context);
};

BooleanType.prototype.stringify = function(value, context) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

BooleanType.prototype.getBlank = function() {
  return new Conversion(false, new BlankArgument(), Status.VALID, '',
                        Promise.resolve(this.lookup));
};

BooleanType.prototype.name = 'boolean';

exports.BooleanType = BooleanType;


/**
 * A type for "we don't know right now, but hope to soon".
 */
function DelegateType(typeSpec) {
  if (typeof typeSpec.delegateType !== 'function') {
    throw new Error('Instances of DelegateType need typeSpec.delegateType to be a function that returns a type');
  }
  Object.keys(typeSpec).forEach(function(key) {
    this[key] = typeSpec[key];
  }, this);
}

/**
 * Child types should implement this method to return an instance of the type
 * that should be used. If no type is available, or some sort of temporary
 * placeholder is required, BlankType can be used.
 * @param context An ExecutionContext to allow access to information about the
 * current state of the command line, or null if one is not available. A
 * context is available for stringify, parse*, [in|de]crement and getType
 * functions but not for isImportant
 */
DelegateType.prototype.delegateType = function(context) {
  throw new Error('Not implemented');
};

DelegateType.prototype = Object.create(Type.prototype);

DelegateType.prototype.stringify = function(value, context) {
  return this.delegateType(context).stringify(value, context);
};

DelegateType.prototype.parse = function(arg, context) {
  return this.delegateType(context).parse(arg, context);
};

DelegateType.prototype.decrement = function(value, context) {
  var delegated = this.delegateType(context);
  return (delegated.decrement ? delegated.decrement(value, context) : undefined);
};

DelegateType.prototype.increment = function(value, context) {
  var delegated = this.delegateType(context);
  return (delegated.increment ? delegated.increment(value, context) : undefined);
};

DelegateType.prototype.getType = function(context) {
  return this.delegateType(context);
};

Object.defineProperty(DelegateType.prototype, 'isImportant', {
  get: function() {
    return this.delegateType().isImportant;
  },
  enumerable: true
});

DelegateType.prototype.name = 'delegate';

exports.DelegateType = DelegateType;


/**
 * 'blank' is a type for use with DelegateType when we don't know yet.
 * It should not be used anywhere else.
 */
function BlankType(typeSpec) {
}

BlankType.prototype = Object.create(Type.prototype);

BlankType.prototype.stringify = function(value, context) {
  return '';
};

BlankType.prototype.parse = function(arg, context) {
  return Promise.resolve(new Conversion(undefined, arg));
};

BlankType.prototype.name = 'blank';

exports.BlankType = BlankType;


/**
 * A set of objects of the same type
 */
function ArrayType(typeSpec) {
  if (!typeSpec.subtype) {
    console.error('Array.typeSpec is missing subtype. Assuming string.' +
        JSON.stringify(typeSpec));
    typeSpec.subtype = 'string';
  }

  Object.keys(typeSpec).forEach(function(key) {
    this[key] = typeSpec[key];
  }, this);
  this.subtype = types.createType(this.subtype);
}

ArrayType.prototype = Object.create(Type.prototype);

ArrayType.prototype.stringify = function(values, context) {
  if (values == null) {
    return '';
  }
  // BUG 664204: Check for strings with spaces and add quotes
  return values.join(' ');
};

ArrayType.prototype.parse = function(arg, context) {
  if (arg.type !== 'ArrayArgument') {
    console.error('non ArrayArgument to ArrayType.parse', arg);
    throw new Error('non ArrayArgument to ArrayType.parse');
  }

  // Parse an argument to a conversion
  // Hack alert. ArrayConversion needs to be able to answer questions about
  // the status of individual conversions in addition to the overall state.
  // |subArg.conversion| allows us to do that easily.
  var subArgParse = function(subArg) {
    return this.subtype.parse(subArg, context).then(function(conversion) {
      subArg.conversion = conversion;
      return conversion;
    }.bind(this));
  }.bind(this);

  var conversionPromises = arg.getArguments().map(subArgParse);
  return util.all(conversionPromises).then(function(conversions) {
    return new ArrayConversion(conversions, arg);
  });
};

ArrayType.prototype.getBlank = function(values) {
  return new ArrayConversion([], new ArrayArgument());
};

ArrayType.prototype.name = 'array';

exports.ArrayType = ArrayType;


});
