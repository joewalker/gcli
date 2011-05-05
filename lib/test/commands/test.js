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


//window.require.s.contexts._.defined['gcli/canon'].getCommandNames();

var console = require('pilot/console');

var canon = require('gcli/canon');

var SelectionType = require('gcli/types').SelectionType;
var DeferredType = require('gcli/types').DeferredType;
var types = require('gcli/types');


exports.option1 = { };
exports.option2 = { };

var optionType = new SelectionType({
    name: 'optionType',
    lookup: { 'option1': exports.option1, 'option2': exports.option2 },
    noMatch: function() {
        this.lastOption = null;
    },
    stringify: function(option) {
        this.lastOption = option;
        return SelectionType.prototype.stringify.call(this, option);
    },
    parse: function(arg) {
        var conversion = SelectionType.prototype.parse.call(this, arg);
        this.lastOption = conversion.value;
        return conversion;
    }
});

var optionValue = new DeferredType({
    name: 'optionValue',
    defer: function() {
        if (optionType.lastOption) {
            return optionType.lastOption.type;
        }
        else {
            return types.getType('blank');
        }
    }
});

var tsv = {
    name: 'tsv',
    params: [
        { name: 'optionType', type: 'optionType' },
        { name: 'optionValue', type: 'optionValue' }
    ],
    exec: function(env, args) { }
};

tsr.metadata = {
    name: 'tsr',
    params: [ { name: 'text', type: 'string' } ]
};
function tsr() { }

tsu.metadata = {
    name: 'tsu',
    params: [ { name: 'num', type: 'number' } ]
};
function tsu() { }

var tsn = {
    metadata: { },

    difMetadata: { params: [ { name: 'text', type: 'string' } ] },
    dif: function(text) { },

    extMetadata: { params: [ { name: 'text', type: 'string' } ] },
    ext: function(text) { },

    exteMetadata: { params: [ { name: 'text', type: 'string' } ] },
    exte: function(text) { },

    extenMetadata: { params: [ { name: 'text', type: 'string' } ] },
    exten: function(text) { },

    extendMetadata: { params: [ { name: 'text', type: 'string' } ] },
    extend: function(text) { }
};

var tsa = {
    name: 'tsa',
    params: [
        { name: 'num', type: { name: 'selection', data: [ '1', '2', '3' ] } },
        { name: 'arr', type: { name: 'array', subtype: 'string' } },
    ],
    exec: function(env, args) {}
};

var tsm = {
    name: 'tsm',
    hidden: true,
    description: 'a 3-param test selection|string|number',
    params: [
        { name: 'abc', type: { name: 'selection', data: [ 'a', 'b', 'c' ] } },
        { name: 'txt', type: 'string' },
        { name: 'num', type: { name: 'number', max: 42, min: 0 } },
    ],
    exec: function(env, args) {}
};


exports.startup = function() {
    exports.option1.type = types.getType('number');
    exports.option2.type = types.getType('boolean');

    types.registerType(optionType);
    types.registerType(optionValue);

    canon.addCommand(tsv);
    canon.addCommand(tsr);
    canon.addCommand(tsu);
    canon.addCommands(tsn, 'tsn');
    canon.addCommand(tsa);
    canon.addCommand(tsm);
};

exports.shutdown = function() {
    canon.removeCommand(tsv);
    canon.removeCommand(tsr);
    canon.removeCommand(tsu);
    canon.removeCommands(tsn, 'tsn');
    canon.removeCommand(tsa);
    canon.removeCommand(tsm);

    types.deregisterType(optionType);
    types.deregisterType(optionValue);
};


});
