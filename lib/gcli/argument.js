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
var argument = exports;


var console = require('pilot/console');
var oop = require('pilot/oop');

/**
 * We record where in the input string an argument comes so we can report
 * errors against those string positions.
 * @param text The string (trimmed) that contains the argument
 * @param prefix Knowledge of quotation marks and whitespace used prior to the
 * text in the input string allows us to re-generate the original input from
 * the arguments.
 * @param suffix Any quotation marks and whitespace used after the text.
 * Whitespace is normally placed in the prefix to the succeeding argument, but
 * can be used here when this is the last argument.
 * @constructor
 */
function Argument(text, prefix, suffix) {
    if (text === undefined) {
        this.text = '';
        this.prefix = '';
        this.suffix = '';
    }
    else {
        this.text = text;
        this.prefix = prefix !== undefined ? prefix : '';
        this.suffix = suffix !== undefined ? suffix : '';
    }
}

/**
 * Return the result of merging these arguments.
 * TODO: What happens when we're merging arguments for the single string
 * case and some of the arguments are in quotation marks?
 */
Argument.prototype.merge = function(following) {
    return new Argument(
        this.text + this.suffix + following.prefix + following.text,
        this.prefix, following.suffix);
};

/**
 * Returns a new Argument like this one but with the text set to
 * <tt>replText</tt> and the end adjusted to fit.
 * @param replText Text to replace the old text value
 */
Argument.prototype.beget = function(replText, options) {
    var prefix = this.prefix;
    var suffix = this.suffix;

    var quote = (replText.indexOf(' ') >= 0 || replText.length == 0) ?
            '\'' : '';

    if (options) {
        prefix = (options.prefixSpace ? ' ' : '') + quote;
        suffix = quote;
    }

    return new Argument(replText, prefix, suffix);
};

/**
 * Is there any visible content to this argument?
 */
Argument.prototype.isBlank = function() {
    return this.text === '' &&
            this.prefix.trim() === '' &&
            this.suffix.trim() === '';
};

/**
 * We need to keep track of which assignment we've been assigned to
 */
Argument.prototype.assign = function(assignment) {
    this.assignment = assignment;
};

/**
 * Sub-classes of Argument are collections of arguments, getArgs() gets access
 * to the members of the collection in order to do things like re-create input
 * command lines. For the simple Argument case it's just an array containing
 * only this.
 */
Argument.prototype.getArgs = function() {
    return [ this ];
};

/**
 * We define equals to mean all arg properties are strict equals
 */
Argument.prototype.equals = function(that) {
    if (this === that) {
        return true;
    }
    if (that == null || !(that instanceof Argument)) {
        return false;
    }

    return this.text === that.text &&
           this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * Helper when we're putting arguments back together
 */
Argument.prototype.toString = function() {
    // TODO: There is a bug here - we should re-escape escaped characters
    // But can we do that reliably?
    return this.prefix + this.text + this.suffix;
};

/**
 * Merge an array of arguments into a single argument.
 * All Arguments in the array are expected to have the same emitter
 */
Argument.merge = function(argArray, start, end) {
    start = (start === undefined) ? 0 : start;
    end = (end === undefined) ? argArray.length : end;

    var joined;
    for (var i = start; i < end; i++) {
        var arg = argArray[i];
        if (!joined) {
            joined = arg;
        }
        else {
            joined = joined.merge(arg);
        }
    }
    return joined;
};

argument.Argument = Argument;


/**
 * Commands like 'echo' with a single string argument, and used with the
 * special format like: 'echo a b c' effectively have a number of arguments
 * merged together.
 */
function MergedArgument(args, start, end) {
    if (!Array.isArray(args)) {
        throw new Error('args is not an array of Arguments');
    }

    if (start === undefined) {
        this.args = args;
    }
    else {
        this.args = args.slice(start, end);
    }

    var arg = Argument.merge(this.args);
    this.text = arg.text;
    this.prefix = arg.prefix;
    this.suffix = arg.suffix;
}

oop.inherits(MergedArgument, Argument);

/**
 * Keep track of which assignment we've been assigned to, and allow the
 * original args to do the same.
 */
MergedArgument.prototype.assign = function(assignment) {
    this.args.forEach(function(arg) {
        arg.assign(assignment);
    }, this);

    this.assignment = assignment;
};

MergedArgument.prototype.getArgs = function() {
    return this.args;
};

MergedArgument.prototype.equals = function(that) {
    if (this === that) {
        return true;
    }
    if (that == null || !(that instanceof MergedArgument)) {
        return false;
    }

    // TODO: do we need to check that args is the same?

    return this.text === that.text &&
           this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.MergedArgument = MergedArgument;


/**
 * TrueNamedArguments are for when we have an argument like --verbose which
 * has a boolean value, and thus the opposite of '--verbose' is ''.
 */
function TrueNamedArgument(name, arg) {
    this.arg = arg;
    this.text = arg ? arg.text : '--' + name;
    this.prefix = arg ? arg.prefix : ' ';
    this.suffix = arg ? arg.suffix : '';
}

oop.inherits(TrueNamedArgument, Argument);

TrueNamedArgument.prototype.assign = function(assignment) {
    if (this.arg) {
        this.arg.assign(assignment);
    }
    this.assignment = assignment;
};

TrueNamedArgument.prototype.getArgs = function() {
    // NASTY! getArgs has a fairly specific use: in removing used arguments
    // from a command line. Unlike other arguments which are EITHER used
    // in assignments directly OR grouped in things like MergedArguments,
    // TrueNamedArgument is used raw from the UI, or composed of another arg
    // from the CLI, so we return both here so they can both be removed.
    return this.arg ? [ this, this.arg ] : [ this ];
};

TrueNamedArgument.prototype.equals = function(that) {
    if (this === that) {
        return true;
    }
    if (that == null || !(that instanceof TrueNamedArgument)) {
        return false;
    }

    return this.text === that.text &&
           this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.TrueNamedArgument = TrueNamedArgument;


/**
 * FalseNamedArguments are for when we don't have an argument like --verbose
 * which has a boolean value, and thus the opposite of '' is '--verbose'.
 */
function FalseNamedArgument() {
    this.text = '';
    this.prefix = '';
    this.suffix = '';
}

oop.inherits(FalseNamedArgument, Argument);

FalseNamedArgument.prototype.getArgs = function() {
    return [ ];
};

FalseNamedArgument.prototype.equals = function(that) {
    if (this === that) {
        return true;
    }
    if (that == null || !(that instanceof FalseNamedArgument)) {
        return false;
    }

    return this.text === that.text &&
           this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.FalseNamedArgument = FalseNamedArgument;


/**
 * A named argument is for cases where we have input in one of the following
 * formats:
 * <ul>
 * <li>--param value
 * <li>-p value
 * <li>--pa value
 * <li>-p:value
 * <li>--param=value
 * <li>etc
 * </ul>
 * The general format is:
 * /--?{unique-param-name-prefix}[ :=]{value}/
 * We model this as a normal argument but with a long prefix.
 */
function NamedArgument(nameArg, valueArg) {
    this.nameArg = nameArg;
    this.valueArg = valueArg;

    this.text = valueArg.text;
    this.prefix = nameArg.toString() + valueArg.prefix;
    this.suffix = valueArg.suffix;
}

oop.inherits(NamedArgument, Argument);

NamedArgument.prototype.assign = function(assignment) {
    this.nameArg.assign(assignment);
    this.valueArg.assign(assignment);
    this.assignment = assignment;
};

NamedArgument.prototype.getArgs = function() {
    return [ this.nameArg, this.valueArg ];
};

NamedArgument.prototype.equals = function(that) {
    if (this === that) {
        return true;
    }
    if (that == null) {
        return false;
    }

    if (!(that instanceof NamedArgument)) {
        return false;
    }

    // TODO: do we need to check that nameArg and valueArg are the same?

    return this.text === that.text &&
           this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.NamedArgument = NamedArgument;


/**
 *
 */
function ArrayArgument() {
    this.args = [];
}

oop.inherits(ArrayArgument, Argument);

ArrayArgument.prototype.addArgument = function(arg) {
    this.args.push(arg);
};

ArrayArgument.prototype.addArguments = function(args) {
    Array.prototype.push.apply(this.args, args);
};

ArrayArgument.prototype.getArguments = function() {
    return this.args;
};

ArrayArgument.prototype.assign = function(assignment) {
    this.args.forEach(function(arg) {
        arg.assign(assignment);
    }, this);

    this.assignment = assignment;
};

ArrayArgument.prototype.getArgs = function() {
    return this.args;
};

ArrayArgument.prototype.equals = function(that) {
    if (this === that) {
        return true;
    }
    if (that == null) {
        return false;
    }

    if (!(that instanceof ArrayArgument)) {
        return false;
    }

    if (this.args.length !== that.args.length) {
        return false;
    }

    for (var i = 0; i < this.args.length; i++) {
        if (!this.args[i].equals(that.args[i])) {
            return false;
        }
    }

    return true;
};

/**
 * Helper when we're putting arguments back together
 */
ArrayArgument.prototype.toString = function() {
    return '{' + this.args.map(function(arg) {
        return arg.toString();
    }, this).join(',') + '}';
};

argument.ArrayArgument = ArrayArgument;


});
