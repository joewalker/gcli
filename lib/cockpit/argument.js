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
 *   Joe Walker (jwalker@mozilla.com)
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
var oop = require('pilot/oop');

/**
 * We record where in the input string an argument comes so we can report errors
 * against those string positions.
 * We publish a 'change' event when-ever the text changes.
 * @param text The string (trimmed) that contains the argument
 * @param start The position of the text in the original input string
 * @param end See start
 * @param prefix Knowledge of quotation marks and whitespace used prior to the
 * text in the input string allows us to re-generate the original input from
 * the arguments.
 * @param suffix Any quotation marks and whitespace used after the text.
 * Whitespace is normally placed in the prefix to the succeeding argument, but
 * can be used here when this is the last argument.
 * @constructor
 */
function Argument(text, start, end, prefix, suffix) {
    if (text === undefined) {
        this.text = '';
        this.start = Argument.AT_CURSOR;
        this.end = Argument.AT_CURSOR;
        this.prefix = '';
        this.suffix = '';
    }
    else {
        this.text = text;
        this.start = start;
        this.end = end;
        this.prefix = prefix;
        this.suffix = suffix;
    }
}
Argument.prototype = {
    /**
     * Return the result of merging these arguments.
     * TODO: What happens when we're merging arguments for the single string
     * case and some of the arguments are in quotation marks?
     */
    merge: function(following) {
        return new Argument(
            this.text + this.suffix + following.prefix + following.text,
            this.start, following.end,
            this.prefix,
            following.suffix);
    },

    /**
     * Returns a new Argument like this one but with the text set to
     * <tt>replText</tt> and the end adjusted to fit.
     * @param replText Text to replace the old text value
     */
    beget: function(replText, options) {
        var start = this.start;
        var prefix = this.prefix;
        var suffix = this.suffix;

        if (options) {
            prefix = (options.prefixSpace ? ' ' : '') +
                    (options.quote ? '\'' : '');
            start = start - this.prefix.length + prefix.length;
        }

        var end = this.end - this.text.length + replText.length;

        if (options) {
            suffix = options.quote ? '\'' : '';
            end = end - this.suffix.length + suffix.length;
        }

        return new Argument(replText, start, end, prefix, suffix);
    },

    /**
     * Returns a new Argument like this one but slid along by <tt>distance</tt>.
     * @param distance The amount to shift the prefix and suffix by (can be
     * negative)
     */
    begetShifted: function(distance) {
        return new Argument(
            this.text,
            this.start + distance,
            this.end + distance,
            this.prefix,
            this.suffix);
    },

    /**
     * Helper when we're putting arguments back together
     */
    toString: function() {
        // TODO: There is a bug here - we should re-escape escaped characters
        // But can we do that reliably?
        return this.prefix + this.text + this.suffix;
    }
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

/**
 * We define equals to mean either:
 * - both arg1 and arg2 are null or undefined or
 * - all arg properties are strict equals
 * <p>Is there a better way to define similarity in Javascript?
 */
Argument.equals = function(arg1, arg2) {
    if (arg1 === arg2) {
        return true;
    }
    if (arg1 == null && arg2 == null) {
        return true;
    }
    if (arg1 == null || arg2 == null) {
        return false;
    }

    if (!(arg1 instanceof Argument)) {
        throw new Error('arg1 is not an Argument, it\'s a ' + arg1);
    }

    if (!(arg2 instanceof Argument)) {
        throw new Error('arg2 is not an Argument');
    }

    return arg1.text === arg2.text &&
           arg1.start === arg2.start && arg1.end === arg2.end &&
           arg1.prefix === arg2.prefix && arg1.suffix === arg2.suffix;
};

/**
 * We sometimes need a way to say 'this error occurs where the cursor is',
 * which causes it to be sorted towards the top.
 */
Argument.AT_CURSOR = -1;
exports.Argument = Argument;


});
