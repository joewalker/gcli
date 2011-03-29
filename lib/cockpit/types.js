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


var Argument = require('cockpit/argument').Argument;
var oop = require('pilot/oop');

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
exports.Status = Status;

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

exports.Conversion = Conversion;

Conversion.prototype.assign = function(assignment) {
    this.arg.assign(assignment);
};

Conversion.prototype.isDataProvided = function() {
    var argProvided = this.arg.text !== '';
    return this.value !== undefined || argProvided;
};

Conversion.prototype.valueEquals = function(that) {
    // TODO: consider if this should be '=='
    return this.value === that.value;
};

Conversion.prototype.getStatus = function(arg) {
    return this._status;
};

Conversion.prototype.argEquals = function(that) {
    return this.arg.equals(that.arg);
};

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

exports.ArrayConversion = ArrayConversion;


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
exports.Type = Type;

/**
 * Private registry of types
 * Invariant: types[name] = type.name
 */
var types = {};

exports.getTypeNames = function() {
    return Object.keys(types);
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
exports.registerType = function(type) {
    if (typeof type === 'object') {
        if (type instanceof Type) {
            if (!type.name) {
                throw new Error('All registered types must have a name');
            }
            types[type.name] = type;
        }
        else {
            throw new Error('Can\'t registerType using: ' + type);
        }
    }
    else if (typeof type === 'function') {
        if (!type.prototype.name) {
            throw new Error('All registered types must have a name');
        }
        types[type.prototype.name] = type;
    }
    else {
        throw new Error('Unknown type: ' + type);
    }
};

exports.registerTypes = function registerTypes(types) {
    Object.keys(types).forEach(function (name) {
        var type = types[name];
        type.name = name;
        exports.registerType(type);
    });
};

/**
 * Remove a type from the list available to the system
 */
exports.deregisterType = function(type) {
    delete types[type.name];
};

/**
 * Find a type, previously registered using #registerType()
 */
exports.getType = function(typeSpec) {
    var type;
    if (typeof typeSpec === 'string') {
        type = types[typeSpec];
        if (typeof type === 'function') {
            type = new type();
        }
        return type;
    }

    if (typeof typeSpec === 'object') {
        if (!typeSpec.name) {
            throw new Error('Missing \'name\' member to typeSpec');
        }

        type = types[typeSpec.name];
        if (typeof type === 'function') {
            type = new type(typeSpec);
        }
        return type;
    }

    throw new Error('Can\'t extract type from ' + typeSpec);
};


});
