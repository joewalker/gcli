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
var util = exports;


/**
 * This object represents a "safe console" object that forwards debugging
 * messages appropriately without creating a dependency on Firebug in Firefox.
 */
var console = {};

var noop = function() {};

// These are the functions that are available in Chrome 4/5, Safari 4
// and Firefox 3.6. Don't add to this list without checking browser support
var NAMES = [
    "assert", "count", "debug", "dir", "dirxml", "error", "group", "groupEnd",
    "info", "log", "profile", "profileEnd", "time", "timeEnd", "trace", "warn"
];

if (typeof(window) === 'undefined') {
    // We're in a web worker. Forward to the main thread so the messages
    // will show up.
    NAMES.forEach(function(name) {
        console[name] = function() {
            var args = Array.prototype.slice.call(arguments);
            var msg = { op: 'log', method: name, args: args };
            postMessage(JSON.stringify(msg));
        };
    });
} else {
    // For each of the console functions, copy them if they exist, stub if not
    NAMES.forEach(function(name) {
        if (window.console && window.console[name]) {
            console[name] = Function.prototype.bind.call(window.console[name], window.console);
        } else {
            console[name] = noop;
        }
    });
}

util.console = console;


/**
 * Create an event.
 * For use as follows:
 *   function Hat() {
 *     this.putOn = util.createEvent();
 *     ...
 *   }
 *   Hat.prototype.adorn = function(person) {
 *     this.putOn({ hat: hat, person: person });
 *     ...
 *   }
 *
 *   var hat = new Hat();
 *   hat.putOn.add(function(ev) {
 *     console.log('The hat ', ev.hat, ' has is worn by ', ev.person);
 *   }, scope);
 */
util.createEvent = function() {
    var handlers = [];

    /**
     * This is how the event is triggered.
     * @param {object} ev The event object to be passed to the event listeners
     */
    var event = function(ev) {
        handlers.forEach(function(handler) {
            handler.func.apply(handler.scope, [ ev ]);
        });
    };

    /**
     * Add a new handler function
     * @param {function} func The function to call when this event is triggered
     * @param {object} scope Optional 'this' object for the function call
     */
    event.add = function(func, scope) {
        handlers.push({ func: func, scope: scope });
    };

    /**
     * Remove a handler function added through add(). Both func and scope must
     * be strict equals (===) the values used in the call to add()
     * @param {function} func The function to call when this event is triggered
     * @param {object} scope Optional 'this' object for the function call
     */
    event.remove = function(func, scope) {
        handlers = handlers.filter(function(test) {
            return test.func !== func && test.scope !== scope;
        });
    };

    /**
     * Remove all handlers.
     * Reset the state of this event back to it's post create state
     */
    event.removeAll = function() {
        handlers = [];
    };

    return event;
};



});
