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
 * The Original Code is Mozilla Skywriter.
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


var console = require('pilot/console');
var types = require("cockpit/types");
var Type = types.Type;
var Conversion = types.Conversion;
var ArrayConversion = types.ArrayConversion;
var Status = types.Status;

var Argument = require('cockpit/argument').Argument;
var TrueNamedArgument = require('cockpit/argument').TrueNamedArgument;
var FalseNamedArgument = require('cockpit/argument').FalseNamedArgument;
var ArrayArgument = require('cockpit/argument').ArrayArgument;


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

exports.StringType = StringType;


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

exports.NumberType = NumberType;


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

exports.SelectionType = SelectionType;


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

exports.BooleanType = BooleanType;


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

exports.DeferredType = DeferredType;


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

exports.ArrayType = ArrayType;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
    types.registerType(StringType);
    types.registerType(NumberType);
    types.registerType(BooleanType);
    types.registerType(BlankType);
    types.registerType(SelectionType);
    types.registerType(DeferredType);
    types.registerType(ArrayType);
};

exports.shutdown = function() {
    types.unregisterType(StringType);
    types.unregisterType(NumberType);
    types.unregisterType(BooleanType);
    types.unregisterType(BlankType);
    types.unregisterType(SelectionType);
    types.unregisterType(DeferredType);
    types.unregisterType(ArrayType);
};


});
