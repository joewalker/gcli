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
var commands = exports;


var canon = require('gcli/canon');

var SelectionType = require('gcli/types').SelectionType;
var DeferredType = require('gcli/types').DeferredType;
var types = require('gcli/types');


commands.option1 = { };
commands.option2 = { };

commands.optionType = new SelectionType({
    name: 'optionType',
    lookup: { 'option1': commands.option1, 'option2': commands.option2 },
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

commands.optionValue = new DeferredType({
    name: 'optionValue',
    defer: function() {
        if (commands.optionType.lastOption) {
            return commands.optionType.lastOption.type;
        }
        else {
            return types.getType('blank');
        }
    }
});

commands.tsv = {
    name: 'tsv',
    params: [
        { name: 'optionType', type: 'optionType' },
        { name: 'optionValue', type: 'optionValue' }
    ],
    exec: function(env, args) { }
};

commands.tsr = function() { };
commands.tsr.metadata = {
    name: 'tsr',
    params: [ { name: 'text', type: 'string' } ]
};

commands.tsu = function() { };
commands.tsu.metadata = {
    name: 'tsu',
    params: [ { name: 'num', type: 'number' } ]
};

commands.tsn = {
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

commands.tselarr = {
    name: 'tselarr',
    params: [
        { name: 'num', type: { name: 'selection', data: [ '1', '2', '3' ] } },
        { name: 'arr', type: { name: 'array', subtype: 'string' } },
    ],
    exec: function(env, args) {}
};

commands.tsm = {
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

commands.setup = function() {
    commands.option1.type = types.getType('number');
    commands.option2.type = types.getType('boolean');

    types.registerType(commands.optionType);
    types.registerType(commands.optionValue);

    canon.addCommand(commands.tsv);
    canon.addCommand(commands.tsr);
    canon.addCommand(commands.tsu);
    canon.addCommands(commands.tsn, 'tsn');
    canon.addCommand(commands.tselarr);
    canon.addCommand(commands.tsm);
};

commands.shutdown = function() {
    canon.removeCommand(commands.tsv);
    canon.removeCommand(commands.tsr);
    canon.removeCommand(commands.tsu);
    canon.removeCommands(commands.tsn, 'tsn');
    canon.removeCommand(commands.tselarr);
    canon.removeCommand(commands.tsm);

    types.deregisterType(commands.optionType);
    types.deregisterType(commands.optionValue);
};


});
