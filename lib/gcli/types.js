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

'use strict';

var util = require('./util/util');
var promise = require('./util/promise');
var Argument = require('./argument').Argument;
var BlankArgument = require('./argument').BlankArgument;


/**
 * Some types can detect validity, that is to say they can distinguish between
 * valid and invalid values.
 * We might want to change these constants to be numbers for better performance
 */
var Status = {
  /**
   * The conversion process worked without any problem, and the value is
   * valid. There are a number of failure states, so the best way to check
   * for failure is (x !== Status.VALID)
   */
  VALID: {
    toString: function() { return 'VALID'; },
    valueOf: function() { return 0; }
  },

  /**
   * A conversion process failed, however it was noted that the string
   * provided to 'parse()' could be VALID by the addition of more characters,
   * so the typing may not be actually incorrect yet, just unfinished.
   * @see Status.ERROR
   */
  INCOMPLETE: {
    toString: function() { return 'INCOMPLETE'; },
    valueOf: function() { return 1; }
  },

  /**
   * The conversion process did not work, the value should be null and a
   * reason for failure should have been provided. In addition some
   * completion values may be available.
   * @see Status.INCOMPLETE
   */
  ERROR: {
    toString: function() { return 'ERROR'; },
    valueOf: function() { return 2; }
  },

  /**
   * A combined status is the worser of the provided statuses. The statuses
   * can be provided either as a set of arguments or a single array
   */
  combine: function() {
    var combined = Status.VALID;
    for (var i = 0; i < arguments.length; i++) {
      var status = arguments[i];
      if (Array.isArray(status)) {
        status = Status.combine.apply(null, status);
      }
      if (status > combined) {
        combined = status;
      }
    }
    return combined;
  },

  fromString: function(str) {
    switch (str) {
      case Status.VALID.toString():
        return Status.VALID;
      case Status.INCOMPLETE.toString():
        return Status.INCOMPLETE;
      case Status.ERROR.toString():
        return Status.ERROR;
      default:
        throw new Error('\'' + str + '\' is not a status');
    }
  }
};

exports.Status = Status;


/**
 * The type.parse() method converts an Argument into a value, Conversion is
 * a wrapper to that value.
 * Conversion is needed to collect a number of properties related to that
 * conversion in one place, i.e. to handle errors and provide traceability.
 * @param value The result of the conversion
 * @param arg The data from which the conversion was made
 * @param status See the Status values [VALID|INCOMPLETE|ERROR] defined above.
 * The default status is Status.VALID.
 * @param message If status=ERROR, there should be a message to describe the
 * error. A message is not needed unless for other statuses, but could be
 * present for any status including VALID (in the case where we want to note a
 * warning, for example).
 * See BUG 664676: GCLI conversion error messages should be localized
 * @param predictions If status=INCOMPLETE, there could be predictions as to
 * the options available to complete the input.
 * We generally expect there to be about 7 predictions (to match human list
 * comprehension ability) however it is valid to provide up to about 20,
 * or less. It is the job of the predictor to decide a smart cut-off.
 * For example if there are 4 very good matches and 4 very poor ones,
 * probably only the 4 very good matches should be presented.
 * The predictions are presented either as an array of prediction objects or as
 * a function which returns this array when called with no parameters.
 * Each prediction object has the following shape:
 *     {
 *       name: '...',     // textual completion. i.e. what the cli uses
 *       value: { ... },  // value behind the textual completion
 *       incomplete: true // this completion is only partial (optional)
 *     }
 * The 'incomplete' property could be used to denote a valid completion which
 * could have sub-values (e.g. for tree navigation).
 */
function Conversion(value, arg, status, message, predictions) {
  // The result of the conversion process. Will be null if status != VALID
  this.value = value;

  // Allow us to trace where this Conversion came from
  this.arg = arg;
  if (arg == null) {
    throw new Error('Missing arg');
  }

  if (predictions != null) {
    var toCheck = typeof predictions === 'function' ? predictions() : predictions;
    if (typeof toCheck.then !== 'function') {
      throw new Error('predictions is not a promise');
    }
    toCheck.then(function(value) {
      if (!Array.isArray(value)) {
        throw new Error('prediction resolves to non array');
      }
    }, util.errorHandler);
  }

  this._status = status || Status.VALID;
  this.message = message;
  this.predictions = predictions;

  if (this._status === Status.ERROR && !this.message) {
    throw new Error('Conversion has status=ERROR but no message');
  }
}

/**
 * Ensure that all arguments that are part of this conversion know what they
 * are assigned to.
 * @param assignment The Assignment (param/conversion link) to inform the
 * argument about.
 */
Object.defineProperty(Conversion.prototype, 'assignment', {
  get: function() { return this.arg.assignment; },
  set: function(assignment) { this.arg.assignment = assignment; },
  enumerable: true
});

/**
 * Work out if there is information provided in the contained argument.
 */
Conversion.prototype.isDataProvided = function() {
  return this.arg.type !== 'BlankArgument';
};

/**
 * 2 conversions are equal if and only if their args are equal (argEquals) and
 * their values are equal (valueEquals).
 * @param that The conversion object to compare against.
 */
Conversion.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }
  return this.valueEquals(that) && this.argEquals(that);
};

/**
 * Check that the value in this conversion is strict equal to the value in the
 * provided conversion.
 * @param that The conversion to compare values with
 */
Conversion.prototype.valueEquals = function(that) {
  return that != null && this.value === that.value;
};

/**
 * Check that the argument in this conversion is equal to the value in the
 * provided conversion as defined by the argument (i.e. arg.equals).
 * @param that The conversion to compare arguments with
 */
Conversion.prototype.argEquals = function(that) {
  return that == null ? false : this.arg.equals(that.arg);
};

/**
 * Accessor for the status of this conversion
 */
Conversion.prototype.getStatus = function(arg) {
  return this._status;
};

/**
 * Defined by the toString() value provided by the argument
 */
Conversion.prototype.toString = function() {
  return this.arg.toString();
};

/**
 * If status === INCOMPLETE, then we may be able to provide predictions as to
 * how the argument can be completed.
 * @return An array of items, or a promise of an array of items, where each
 * item is an object with the following properties:
 * - name (mandatory): Displayed to the user, and typed in. No whitespace
 * - description (optional): Short string for display in a tool-tip
 * - manual (optional): Longer description which details usage
 * - incomplete (optional): Indicates that the prediction if used should not
 *   be considered necessarily sufficient, which typically will mean that the
 *   UI should not append a space to the completion
 * - value (optional): If a value property is present, this will be used as the
 *   value of the conversion, otherwise the item itself will be used.
 */
Conversion.prototype.getPredictions = function() {
  if (typeof this.predictions === 'function') {
    return this.predictions();
  }
  return promise.resolve(this.predictions || []);
};

/**
 * Constant to allow everyone to agree on the maximum number of predictions
 * that should be provided. We actually display 1 less than this number.
 */
Conversion.maxPredictions = 11;

exports.Conversion = Conversion;


/**
 * ArrayConversion is a special Conversion, needed because arrays are converted
 * member by member rather then as a whole, which means we can track the
 * conversion if individual array elements. So an ArrayConversion acts like a
 * normal Conversion (which is needed as Assignment requires a Conversion) but
 * it can also be devolved into a set of Conversions for each array member.
 */
function ArrayConversion(conversions, arg) {
  this.arg = arg;
  this.conversions = conversions;
  this.value = conversions.map(function(conversion) {
    return conversion.value;
  }, this);

  this._status = Status.combine(conversions.map(function(conversion) {
    return conversion.getStatus();
  }));

  // This message is just for reporting errors like "not enough values"
  // rather that for problems with individual values.
  this.message = '';

  // Predictions are generally provided by individual values
  this.predictions = [];
}

ArrayConversion.prototype = Object.create(Conversion.prototype);

Object.defineProperty(ArrayConversion.prototype, 'assignment', {
  get: function() { return this._assignment; },
  set: function(assignment) {
    this._assignment = assignment;

    this.conversions.forEach(function(conversion) {
      conversion.assignment = assignment;
    }, this);
  },
  enumerable: true
});

ArrayConversion.prototype.getStatus = function(arg) {
  if (arg && arg.conversion) {
    return arg.conversion.getStatus();
  }
  return this._status;
};

ArrayConversion.prototype.isDataProvided = function() {
  return this.conversions.length > 0;
};

ArrayConversion.prototype.valueEquals = function(that) {
  if (that == null) {
    return false;
  }

  if (!(that instanceof ArrayConversion)) {
    throw new Error('Can\'t compare values with non ArrayConversion');
  }

  if (this.value === that.value) {
    return true;
  }

  if (this.value.length !== that.value.length) {
    return false;
  }

  for (var i = 0; i < this.conversions.length; i++) {
    if (!this.conversions[i].valueEquals(that.conversions[i])) {
      return false;
    }
  }

  return true;
};

ArrayConversion.prototype.toString = function() {
  return '[ ' + this.conversions.map(function(conversion) {
    return conversion.toString();
  }, this).join(', ') + ' ]';
};

exports.ArrayConversion = ArrayConversion;


/**
 * Most of our types are 'static' e.g. there is only one type of 'string',
 * however some types like 'selection' and 'delegate' are customizable.
 * The basic Type type isn't useful, but does provide documentation about what
 * types do.
 */
function Type() {
}

/**
 * Convert the given <tt>value</tt> to a string representation.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 * @param value The object to convert into a string
 * @param context An ExecutionContext to allow basic Requisition access
 */
Type.prototype.stringify = function(value, context) {
  throw new Error('Not implemented');
};

/**
 * Convert the given <tt>arg</tt> to an instance of this type.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 * @param arg An instance of <tt>Argument</tt> to convert.
 * @param context An ExecutionContext to allow basic Requisition access
 * @return Conversion
 */
Type.prototype.parse = function(arg, context) {
  throw new Error('Not implemented');
};

/**
 * A convenience method for times when you don't have an argument to parse
 * but instead have a string.
 * @see #parse(arg)
 */
Type.prototype.parseString = function(str, context) {
  return this.parse(new Argument(str), context);
};

/**
 * The plug-in system, and other things need to know what this type is
 * called. The name alone is not enough to fully specify a type. Types like
 * 'selection' and 'delegate' need extra data, however this function returns
 * only the name, not the extra data.
 */
Type.prototype.name = undefined;

/**
 * If there is some concept of a higher value, return it,
 * otherwise return undefined.
 */
Type.prototype.increment = function(value, context) {
  return undefined;
};

/**
 * If there is some concept of a lower value, return it,
 * otherwise return undefined.
 */
Type.prototype.decrement = function(value, context) {
  return undefined;
};

/**
 * The 'blank value' of most types is 'undefined', but there are exceptions;
 * This allows types to specify a better conversion from empty string than
 * 'undefined'.
 * 2 known examples of this are boolean -> false and array -> []
 */
Type.prototype.getBlank = function(context) {
  return new Conversion(undefined, new BlankArgument(), Status.INCOMPLETE, '');
};

/**
 * This is something of a hack for the benefit of DelegateType which needs to
 * be able to lie about it's type for fields to accept it as one of their own.
 * Sub-types can ignore this unless they're DelegateType.
 * @param context An ExecutionContext to allow basic Requisition access
 */
Type.prototype.getType = function(context) {
  return this;
};

/**
 * addItems allows registrations of a number of things. This allows it to know
 * what type of item, and how it should be registered.
 */
Type.prototype.item = 'type';

exports.Type = Type;

/**
 * Private registry of types
 * Invariant: types[name] = type.name
 */
var registeredTypes = {};

exports.getTypeNames = function() {
  return Object.keys(registeredTypes);
};

/**
 * Add a new type to the list available to the system.
 * You can pass 2 things to this function - either an instance of Type, in
 * which case we return this instance when #getType() is called with a 'name'
 * that matches type.name.
 * Also you can pass in a constructor (i.e. function) in which case when
 * #getType() is called with a 'name' that matches Type.prototype.name we will
 * pass the typeSpec into this constructor.
 */
exports.addType = function(type) {
  if (typeof type === 'object') {
    if (!type.name) {
      throw new Error('All registered types must have a name');
    }

    if (type instanceof Type) {
      registeredTypes[type.name] = type;
    }
    else {
      var name = type.name;
      var parent = type.parent;
      type.name = parent;
      delete type.parent;

      registeredTypes[name] = exports.createType(type);

      type.name = name;
      type.parent = parent;
    }
  }
  else if (typeof type === 'function') {
    if (!type.prototype.name) {
      throw new Error('All registered types must have a name');
    }
    registeredTypes[type.prototype.name] = type;
  }
  else {
    throw new Error('Unknown type: ' + type);
  }
};

/**
 * Remove a type from the list available to the system
 */
exports.removeType = function(type) {
  delete registeredTypes[type.name];
};

/**
 * Find a type, previously registered using #addType()
 */
exports.createType = function(typeSpec) {
  if (typeof typeSpec === 'string') {
    typeSpec = { name: typeSpec };
  }

  if (typeof typeSpec !== 'object') {
    throw new Error('Can\'t extract type from ' + typeSpec);
  }

  var NewTypeCtor, newType;
  if (typeSpec.name == null || typeSpec.name == 'type') {
    NewTypeCtor = Type;
  }
  else {
    NewTypeCtor = registeredTypes[typeSpec.name];
  }

  if (!NewTypeCtor) {
    console.error('Known types: ' + Object.keys(registeredTypes).join(', '));
    throw new Error('Unknown type: \'' + typeSpec.name + '\'');
  }

  if (typeof NewTypeCtor === 'function') {
    newType = new NewTypeCtor(typeSpec);
  }
  else {
    // clone 'type'
    newType = {};
    util.copyProperties(NewTypeCtor, newType);
  }

  // Copy the properties of typeSpec onto the new type
  util.copyProperties(typeSpec, newType);

  if (typeof NewTypeCtor !== 'function') {
    if (typeof newType.constructor === 'function') {
      newType.constructor();
    }
  }

  return newType;
};
