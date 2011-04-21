/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Joe Walker (jwalker@mozilla.com) (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
var types = exports;


var oop = require('pilot/oop');
var console = require('pilot/console');

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;


/**
 * Some types can detect validity, that is to say they can distinguish between
 * valid and invalid values.
 * TODO: Change these constants to be numbers for more performance?
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
 * The type.parse() method returns a Conversion to inform the user about not
 * only the result of a Conversion but also about what went wrong.
 * We could use an exception, and throw if the conversion failed, but that
 * seems to violate the idea that exceptions should be exceptional. Typos are
 * not. Also in order to store both a status and a message we'd still need
 * some sort of exception type...
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
    // I18N: On the one hand this nasty and un-internationalized, however with
    // a command line it is hard to know where to start.
    this.message = message;

    // A array of strings which are the systems best guess at better inputs
    // than the one presented.
    // We generally expect there to be about 7 predictions (to match human list
    // comprehension ability) however it is valid to provide up to about 20,
    // or less. It is the job of the predictor to decide a smart cut-off.
    // For example if there are 4 very good matches and 4 very poor ones,
    // probably only the 4 very good matches should be presented.
    this.predictions = predictions || [];
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

oop.inherits(ArrayConversion, Conversion);

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
Type.prototype = {
    /**
     * Convert the given <tt>value</tt> to a string representation.
     * Where possible, there should be round-tripping between values and their
     * string representations.
     */
    stringify: function(value) { throw new Error("not implemented"); },

    /**
     * Convert the given <tt>arg</tt> to an instance of this type.
     * Where possible, there should be round-tripping between values and their
     * string representations.
     * @param arg An instance of <tt>Argument</tt> to convert.
     * @return Conversion
     */
    parse: function(arg) { throw new Error("not implemented"); },

    /**
     * A convenience method for times when you don't have an argument to parse
     * but instead have a string.
     * @see #parse(arg)
     */
    parseString: function(str) {
        return this.parse(new Argument(str));
    },

    /**
     * The plug-in system, and other things need to know what this type is
     * called. The name alone is not enough to fully specify a type. Types like
     * 'selection' and 'deferred' need extra data, however this function returns
     * only the name, not the extra data.
     * <p>In old bespin, equality was based on the name. This may turn out to be
     * important in Ace too.
     */
    name: undefined,

    /**
     * If there is some concept of a higher value, return it,
     * otherwise return undefined.
     */
    increment: function(value) {
        return undefined;
    },

    /**
     * If there is some concept of a lower value, return it,
     * otherwise return undefined.
     */
    decrement: function(value) {
        return undefined;
    },

    /**
     * There is interesting information (like predictions) in a conversion of
     * nothing, the output of this can sometimes be customized.
     * @return Conversion
     */
    getDefault: undefined
};
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
    return new Conversion(arg.text, arg);
};

StringType.prototype.name = 'string';

types.StringType = StringType;


/**
 * We don't currently plan to distinguish between integers and floats
 */
function NumberType(typeSpec) {
    if (typeSpec) {
        this.min = typeSpec.min;
        this.max = typeSpec.max;
        this.step = typeSpec.step;
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
        return new Conversion(value, arg, Status.ERROR,
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
    return (this.min != null && value - 1 >= this.min) ? value - 1 : value;
};

NumberType.prototype.increment = function(value) {
    return (this.max != null && value + 1 <= this.max) ? value + 1 : value;
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
};

SelectionType.prototype = new Type();

SelectionType.prototype.stringify = function(value) {
    return typeof value === 'string' ? value : value.name;
};

SelectionType.prototype.getLookup = function() {
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

SelectionType.prototype._dataToLookup = function(data) {
    var lookup = {};
    data.forEach(function(option) {
        var name = (typeof option === 'string') ? option : option.name;
        lookup[name] = option;
    }, this);
    return lookup;
};

SelectionType.prototype.parse = function(arg) {
    var lookup = this.getLookup();
    var matchedValue = lookup[arg.text];
    if (matchedValue !== undefined) {
        return new Conversion(matchedValue, arg);
    }

    var completions = [];
    Object.keys(lookup).forEach(function(name) {
        if (name.indexOf(arg.text) === 0) {
            completions.push(lookup[name]);
        }
    }, this);

    // This is something of a hack it basically allows us to tell the
    // setting type to forget its last setting hack.
    if (this.noMatch) {
        this.noMatch();
    }

    if (completions.length > 0) {
        return new Conversion(null, arg, Status.INCOMPLETE, '', completions);
    }
    else {
        var msg = 'Can\'t use \'' + arg.text + '\'.';
        return new Conversion(null, arg, Status.ERROR, msg, completions);
    }
};

SelectionType.prototype.fromString = function(str) {
    return str;
};

SelectionType.prototype.decrement = function(value) {
    var data = (typeof this.data === 'function') ? this.data() : this.data;
    var index;
    if (value == null) {
        index = data.length - 1;
    }
    else {
        var name = this.stringify(value);
        var index = data.indexOf(name);
        index = (index === 0 ? data.length - 1 : index - 1);
    }
    return this.fromString(data[index]);
};

SelectionType.prototype.increment = function(value) {
    var data = (typeof this.data === 'function') ? this.data() : this.data;
    var index;
    if (value == null) {
        index = 0;
    }
    else {
        var name = this.stringify(value);
        var index = data.indexOf(name);
        index = (index === data.length - 1 ? 0 : index + 1);
    }
    return this.fromString(data[index]);
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

BooleanType.prototype.fromString = function(str) {
    return str === 'true' ? true : false;
};

BooleanType.prototype.getDefault = function() {
    return new Conversion(false, new Argument(''));
};

BooleanType.prototype.name = 'boolean';

types.BooleanType = BooleanType;


/**
 * A we don't know right now, but hope to soon.
 */
function DeferredType(typeSpec) {
    if (typeof typeSpec.defer !== 'function') {
        throw new Error('Instances of DeferredType need typeSpec.defer to be a function that returns a type');
    }
    Object.keys(typeSpec).forEach(function(key) {
        this[key] = typeSpec[key];
    }, this);
};

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
};

ArrayType.prototype = new Type();

ArrayType.prototype.stringify = function(values) {
    // TODO: Check for strings with spaces and add quotes
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
