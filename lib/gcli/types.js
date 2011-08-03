/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var types = exports;


var console = require('gcli/util').console;

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;


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
  }
};
types.Status = Status;

/**
 * The type.parse() method converts an Argument into a value, Conversion is
 * a wrapper to that value.
 * Conversion is needed to collect a number of properties related to that
 * conversion in one place, i.e. to handle errors and provide traceability.
 * @param value The result of the conversion
 * @param arg The data from which the conversion was made
 * @param status See the Status values [VALID|INCOMPLETE|ERROR] defined above.
 * The value will be null unless status=VALID.
 * @param message If status=ERROR, there should be a message to describe the
 * error. A message is not needed unless for other statuses.
 * @param predictions If status=INCOMPLETE, there could be predictions as to
 * the options available to complete the input.
 */
function Conversion(value, arg, status, message, predictions) {
  // The result of the conversion process. Will be null if status != VALID
  this.value = value;

  // Allow us to trace where this Conversion came from
  this.arg = arg;
  if (arg == null) {
    throw new Error('missing arg');
  }

  // The status of the conversion.
  this._status = status || Status.VALID;

  // A message to go with the conversion. This could be present for any
  // status including VALID in the case where we want to note a warning for
  // example.
  // See BUG 664676: GCLI conversion error messages should be localized
  this.message = message;

  // A array of strings which are the systems best guess at better inputs
  // than the one presented, or a function that will return these predictions
  // when called with 0 arguments.
  // We generally expect there to be about 7 predictions (to match human list
  // comprehension ability) however it is valid to provide up to about 20,
  // or less. It is the job of the predictor to decide a smart cut-off.
  // For example if there are 4 very good matches and 4 very poor ones,
  // probably only the 4 very good matches should be presented.
  this.predictions = predictions;
}

types.Conversion = Conversion;

/**
 * Ensure that all arguments that are part of this conversion know what they
 * are assigned to.
 * @param assignment The Assignment (param/conversion link) to inform the
 * argument about.
 */
Conversion.prototype.assign = function(assignment) {
  this.arg.assign(assignment);
};

/**
 * Work out if there is information provided in the contained argument.
 */
Conversion.prototype.isDataProvided = function() {
  var argProvided = this.arg.text !== '';
  return this.value !== undefined || argProvided;
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
  return this.value === that.value;
};

/**
 * Check that the argument in this conversion is equal to the value in the
 * provided conversion as defined by the argument (i.e. arg.equals).
 * @param that The conversion to compare arguments with
 */
Conversion.prototype.argEquals = function(that) {
  return this.arg.equals(that.arg);
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
 */
Conversion.prototype.getPredictions = function() {
  if (typeof this.predictions === 'function') {
    return this.predictions();
  }
  return this.predictions || [];
};

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

ArrayConversion.prototype.assign = function(assignment) {
  this.conversions.forEach(function(conversion) {
    conversion.assign(assignment);
  }, this);
  this.assignment = assignment;
};

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

types.ArrayConversion = ArrayConversion;


/**
 * Most of our types are 'static' e.g. there is only one type of 'string',
 * however some types like 'selection' and 'deferred' are customizable.
 * The basic Type type isn't useful, but does provide documentation about what
 * types do.
 */
function Type() {
};

/**
 * Convert the given <tt>value</tt> to a string representation.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 */
Type.prototype.stringify = function(value) {
  throw new Error("not implemented");
};

/**
 * Convert the given <tt>arg</tt> to an instance of this type.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 * @param arg An instance of <tt>Argument</tt> to convert.
 * @return Conversion
 */
Type.prototype.parse = function(arg) {
  throw new Error("not implemented");
};

/**
 * A convenience method for times when you don't have an argument to parse
 * but instead have a string.
 * @see #parse(arg)
 */
Type.prototype.parseString = function(str) {
  return this.parse(new Argument(str));
},

/**
 * The plug-in system, and other things need to know what this type is
 * called. The name alone is not enough to fully specify a type. Types like
 * 'selection' and 'deferred' need extra data, however this function returns
 * only the name, not the extra data.
 */
Type.prototype.name = undefined;

/**
 * If there is some concept of a higher value, return it,
 * otherwise return undefined.
 */
Type.prototype.increment = function(value) {
  return undefined;
};

/**
 * If there is some concept of a lower value, return it,
 * otherwise return undefined.
 */
Type.prototype.decrement = function(value) {
  return undefined;
};

/**
 * There is interesting information (like predictions) in a conversion of
 * nothing, the output of this can sometimes be customized.
 * @return Conversion
 */
Type.prototype.getDefault = undefined;

types.Type = Type;

/**
 * Private registry of types
 * Invariant: types[name] = type.name
 */
var registeredTypes = {};

types.getTypeNames = function() {
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
types.registerType = function(type) {
  if (typeof type === 'object') {
    if (type instanceof Type) {
      if (!type.name) {
        throw new Error('All registered types must have a name');
      }
      registeredTypes[type.name] = type;
    }
    else {
      throw new Error('Can\'t registerType using: ' + type);
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

types.registerTypes = function registerTypes(newTypes) {
  Object.keys(newTypes).forEach(function(name) {
    var type = newTypes[name];
    type.name = name;
    newTypes.registerType(type);
  });
};

/**
 * Remove a type from the list available to the system
 */
types.deregisterType = function(type) {
  delete registeredTypes[type.name];
};

/**
 * Find a type, previously registered using #registerType()
 */
types.getType = function(typeSpec) {
  var type;
  if (typeof typeSpec === 'string') {
    type = registeredTypes[typeSpec];
    if (typeof type === 'function') {
      type = new type();
    }
    return type;
  }

  if (typeof typeSpec === 'object') {
    if (!typeSpec.name) {
      throw new Error('Missing \'name\' member to typeSpec');
    }

    type = registeredTypes[typeSpec.name];
    if (typeof type === 'function') {
      type = new type(typeSpec);
    }
    return type;
  }

  throw new Error('Can\'t extract type from ' + typeSpec);
};


/**
 * 'string' the most basic string type that doesn't need to convert
 */
function StringType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('StringType can not be customized');
  }
}

StringType.prototype = new Type();

StringType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.toString();
};

StringType.prototype.parse = function(arg) {
  if (arg.text == null || arg.text === '') {
    return new Conversion(null, arg, Status.INCOMPLETE, '');
  }
  return new Conversion(arg.text, arg);
};

StringType.prototype.name = 'string';

types.StringType = StringType;


/**
 * We don't currently plan to distinguish between integers and floats
 */
function NumberType(typeSpec) {
  if (typeSpec) {
    this.min = typeSpec.min || 0;
    this.max = typeSpec.max;
    this.step = typeSpec.step || 1;
  }
  else {
    this.step = 1;
  }
}

NumberType.prototype = new Type();

NumberType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

NumberType.prototype.parse = function(arg) {
  if (arg.text.replace(/\s/g, '').length === 0) {
    return new Conversion(null, arg, Status.INCOMPLETE, '');
  }

  var value = parseInt(arg.text, 10);
  if (isNaN(value)) {
    return new Conversion(this.min, arg, Status.ERROR,
      'Can\'t convert "' + arg.text + '" to a number.');
  }

  if (this.max != null && value > this.max) {
    return new Conversion(value, arg, Status.ERROR,
      '' + value + ' is greater that maximum allowed: ' + this.max + '.');
  }

  if (this.min != null && value < this.min) {
    return new Conversion(value, arg, Status.ERROR,
      '' + value + ' is smaller that minimum allowed: ' + this.min + '.');
  }

  return new Conversion(value, arg);
};

NumberType.prototype.decrement = function(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return this.max || 1;
  }
  var newValue = value - this.step;
  // Snap to the nearest incremental of the step
  newValue = Math.ceil(newValue / this.step) * this.step;
  if (this.min == null) {
    return newValue;
  }
  return this._boundsCheck(newValue);
};

NumberType.prototype.increment = function(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return this.min;
  }
  var newValue = value + this.step;
  // Snap to the nearest incremental of the step
  newValue = Math.floor(newValue / this.step) * this.step;
  if (this.max == null) {
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
  if (value < this.min) {
    return this.min;
  }
  if (value > this.max) {
    return this.max;
  }
  return value;
};

NumberType.prototype.name = 'number';

types.NumberType = NumberType;


/**
 * One of a known set of options
 */
function SelectionType(typeSpec) {
  if (typeSpec) {
    Object.keys(typeSpec).forEach(function(key) {
      this[key] = typeSpec[key];
    }, this);
  }
}

SelectionType.prototype = new Type();

SelectionType.prototype.stringify = function(value) {
  var name = null;
  var lookup = this._getLookup();
  var keys = Object.keys(lookup);
  keys.some(function(test) {
    if (value === lookup[test]) {
      name = test;
      return true;
    }
    return false;
  }, this);

  return name;
};

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 */
SelectionType.prototype._getLookup = function() {
  if (this.lookup) {
    if (typeof this.lookup === 'function') {
      return this.lookup();
    }
    return this.lookup;
  }

  if (Array.isArray(this.data)) {
    this.lookup = this._dataToLookup(this.data);
    return this.lookup;
  }

  if (typeof(this.data) === 'function') {
    return this._dataToLookup(this.data());
  }

  throw new Error('SelectionType has no data');
};

/**
 * Like _getLookup() except that rather than returning a map of name->value,
 * @return An new array of { name:..., value:... } pairs. It is safe to mutate
 * this array.
 */
SelectionType.prototype._getLookupArray = function() {
  var array = [];
  var lookup = this._getLookup();
  Object.keys(lookup).forEach(function(name) {
    array.push({ name: name, value: lookup[name] });
  });
  return array;
};

/**
 * Selection can be provided with either a lookup object (in the 'lookup'
 * property) or an array of strings (in the 'data' property). Internally we
 * always use lookup, so we need a way to convert a 'data' array to a lookup.
 */
SelectionType.prototype._dataToLookup = function(data) {
  var lookup = {};
  data.forEach(function(option) {
    var name = (typeof option === 'string') ? option : option.name;
    lookup[name] = option;
  }, this);
  return lookup;
};

/**
 * Return a list of possible completions for the given arg.
 * This code is very similar to CommandType._findPredictions(). If you are
 * making changes to this code, you should check there too.
 * @param arg The initial input to match
 * @return A trimmed lookup table of string:value pairs
 */
SelectionType.prototype._findPredictions = function(arg) {
  var predictions = [];

  var lookup = this._getLookup();
  var matchedValue = lookup[arg.text];
  if (matchedValue !== undefined) {
    predictions.push({ name: arg.text, value: matchedValue });
  }
  else {
    Object.keys(lookup).forEach(function(name) {
      if (name.indexOf(arg.text) === 0) {
        predictions.push({ name: name, value: lookup[name] });
      }
    }, this);
  }

  return predictions;
};

SelectionType.prototype.parse = function(arg) {
  var predictions = this._findPredictions(arg);
  var matches = Object.keys(predictions).length;

  if (matches === 1 && predictions[0].name === arg.text) {
    return new Conversion(predictions[0].value, arg);
  }

  // This is something of a hack it basically allows us to tell the
  // setting type to forget its last setting hack.
  if (this.noMatch) {
    this.noMatch();
  }

  if (matches > 0) {
    // Especially at startup, predictions live over the time that things
    // change so we provide a completion function rather than completion
    // values.
    // This was primarily designed for commands, which have since moved
    // into their own type, so technically we could remove this code,
    // except that it provides more up-to-date answers, and it's hard to
    // predict when it will be required.
    var predictFunc = function() {
      return this._findPredictions(arg);
    }.bind(this);
    return new Conversion(null, arg, Status.INCOMPLETE, '', predictFunc);
  }

  var msg = 'Can\'t use \'' + arg.text + '\'.';
  return new Conversion(null, arg, Status.ERROR, msg);
};

/**
 * For selections, up is down and black is white. It's like this, given a list
 * [ a, b, c, d ], it's natural to think that it starts at the top and that
 * going up the list, moves towards 'a'. However 'a' has the lowest index, so
 * for SelectionType, up is down and down is up.
 * Sorry.
 */
SelectionType.prototype.decrement = function(value) {
  var data = this._getLookupArray();
  var index = this._findValue(data, value);
  if (index === -1) {
    index = 0;
  }
  index++;
  if (index >= data.length) {
    index = 0;
  }
  return data[index].value;
};

/**
 * See note on SelectionType.decrement()
 */
SelectionType.prototype.increment = function(value) {
  var data = this._getLookupArray();
  var index = this._findValue(data, value);
  if (index === -1) {
    // For an increment operation when there is nothing to start from, we
    // want to start from the top, i.e. index 0, so the value before we
    // 'increment' (see note above) must be 1.
    index = 1;
  }
  index--;
  if (index < 0) {
    index = data.length - 1;
  }
  return data[index].value;
};

/**
 * Walk through an array of { name:.., value:... } objects looking for a
 * matching value (using strict equality), returning the matched index (or -1
 * if not found).
 * @param data Array of objects with name/value properties to search through
 * @param value The value to search for
 * @return The index at which the match was found, or -1 if no match was found
 */
SelectionType.prototype._findValue = function(data, value) {
  var index = -1;
  for (var i = 0; i < data.length; i++) {
    var pair = data[i];
    if (pair.value === value) {
      index = i;
      break;
    }
  }
  return index;
};

SelectionType.prototype.name = 'selection';

types.SelectionType = SelectionType;


/**
 * true/false values
 */
function BooleanType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('BooleanType can not be customized');
  }
}

BooleanType.prototype = new SelectionType();

BooleanType.prototype.lookup = { 'true': true, 'false': false };

BooleanType.prototype.parse = function(arg) {
  if (arg instanceof TrueNamedArgument) {
    return new Conversion(true, arg);
  }
  if (arg instanceof FalseNamedArgument) {
    return new Conversion(false, arg);
  }
  return SelectionType.prototype.parse.call(this, arg);
};

BooleanType.prototype.stringify = function(value) {
  return '' + value;
};

BooleanType.prototype.getDefault = function() {
  return new Conversion(false, new Argument(''));
};

BooleanType.prototype.name = 'boolean';

types.BooleanType = BooleanType;


/**
 * A type for "we don't know right now, but hope to soon".
 */
function DeferredType(typeSpec) {
  if (typeof typeSpec.defer !== 'function') {
    throw new Error('Instances of DeferredType need typeSpec.defer to be a function that returns a type');
  }
  Object.keys(typeSpec).forEach(function(key) {
    this[key] = typeSpec[key];
  }, this);
}

DeferredType.prototype = new Type();

DeferredType.prototype.stringify = function(value) {
  return this.defer().stringify(value);
};

DeferredType.prototype.parse = function(arg) {
  return this.defer().parse(arg);
};

DeferredType.prototype.decrement = function(value) {
  var deferred = this.defer();
  return (deferred.decrement ? deferred.decrement(value) : undefined);
};

DeferredType.prototype.increment = function(value) {
  var deferred = this.defer();
  return (deferred.increment ? deferred.increment(value) : undefined);
};

DeferredType.prototype.increment = function(value) {
  var deferred = this.defer();
  return (deferred.increment ? deferred.increment(value) : undefined);
};

DeferredType.prototype.name = 'deferred';

types.DeferredType = DeferredType;


/**
 * 'blank' is a type for use with DeferredType when we don't know yet.
 * It should not be used anywhere else.
 */
function BlankType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('BlankType can not be customized');
  }
}

BlankType.prototype = new Type();

BlankType.prototype.stringify = function(value) {
  return '';
};

BlankType.prototype.parse = function(arg) {
  return new Conversion(null, arg);
};

BlankType.prototype.name = 'blank';

types.BlankType = BlankType;


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
  this.subtype = types.getType(this.subtype);
}

ArrayType.prototype = new Type();

ArrayType.prototype.stringify = function(values) {
  // BUG 664204: Check for strings with spaces and add quotes
  return values.join(' ');
};

ArrayType.prototype.parse = function(arg) {
  if (arg instanceof ArrayArgument) {
    var conversions = arg.getArguments().map(function(subArg) {
      var conversion = this.subtype.parse(subArg);
      // Hack alert. ArrayConversion needs to be able to answer questions
      // about the status of individual conversions in addition to the
      // overall state. This allows us to do that easily.
      subArg.conversion = conversion;
      return conversion;
    }, this);
    return new ArrayConversion(conversions, arg);
  }
  else {
    console.error('non ArrayArgument to ArrayType.parse', arg);
    throw new Error('non ArrayArgument to ArrayType.parse');
  }
};

ArrayType.prototype.getDefault = function() {
  return new ArrayConversion([], new ArrayArgument());
};

ArrayType.prototype.name = 'array';

types.ArrayType = ArrayType;


/**
 * Registration and de-registration.
 */
types.startup = function() {
  types.registerType(StringType);
  types.registerType(NumberType);
  types.registerType(BooleanType);
  types.registerType(BlankType);
  types.registerType(SelectionType);
  types.registerType(DeferredType);
  types.registerType(ArrayType);
};

types.shutdown = function() {
  types.unregisterType(StringType);
  types.unregisterType(NumberType);
  types.unregisterType(BooleanType);
  types.unregisterType(BlankType);
  types.unregisterType(SelectionType);
  types.unregisterType(DeferredType);
  types.unregisterType(ArrayType);
};


});
