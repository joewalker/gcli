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
var testCli = exports;


//window.require.s.contexts._.defined['gcli/canon'].getCommandNames();

var console = require('pilot/console');

var Status = require('gcli/types').Status;
var canon = require('gcli/canon');

var SelectionType = require('gcli/types').SelectionType;
var DeferredType = require('gcli/types').DeferredType;
var types = require('gcli/types');
var Argument = require('gcli/argument').Argument;

var Requisition = require('gcli/cli').Requisition;
var tokenize = require('gcli/cli')._tokenize;
var split = require('gcli/cli')._split;

var test = require('gcli/test/assert').test;


var option1 = { };
var option2 = { };

var optionType = new SelectionType({
    name: 'optionType',
    lookup: { 'option1': option1, 'option2': option2 },
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
    description: 'a 3-param test selection|string|number',
    params: [
        { name: 'abc', type: { name: 'selection', data: [ 'a', 'b', 'c' ] } },
        { name: 'txt', type: 'string' },
        { name: 'num', type: { name: 'number', max: 42, min: 0 } },
    ],
    exec: function(env, args) {}
};

testCli.testAll = function() {
    option1.type = types.getType('number');
    option2.type = types.getType('boolean');

    types.registerType(optionType);
    types.registerType(optionValue);

    canon.addCommand(tsv);
    canon.addCommand(tsr);
    canon.addCommand(tsu);
    canon.addCommands(tsn, 'tsn');
    canon.addCommand(tsa);
    canon.addCommand(tsm);

    testCli.testTokenize();
    testCli.testSplit();
    testCli.testCli();

    //*
    canon.removeCommand(tsv);
    canon.removeCommand(tsr);
    canon.removeCommand(tsu);
    canon.removeCommands(tsn, 'tsn');
    canon.removeCommand(tsa);
    canon.removeCommand(tsm);

    types.deregisterType(optionType);
    types.deregisterType(optionValue);
    // */

    console.log('testCli.testAll Completed');
};

testCli.testTokenize = function() {
    var args;
    var requ = new Requisition();

    args = requ._tokenize('');
    test.verifyEqual(1, args.length);
    test.verifyEqual('', args[0].text);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);

    args = requ._tokenize('s');
    test.verifyEqual(1, args.length);
    test.verifyEqual('s', args[0].text);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);

    args = requ._tokenize(' ');
    test.verifyEqual(1, args.length);
    test.verifyEqual('', args[0].text);
    test.verifyEqual(' ', args[0].prefix);
    test.verifyEqual('', args[0].suffix);

    args = requ._tokenize('s s');
    test.verifyEqual(2, args.length);
    test.verifyEqual('s', args[0].text);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('s', args[1].text);
    test.verifyEqual(' ', args[1].prefix);
    test.verifyEqual('', args[1].suffix);

    args = requ._tokenize(' 1234  \'12 34\'');
    test.verifyEqual(2, args.length);
    test.verifyEqual('1234', args[0].text);
    test.verifyEqual(' ', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('12 34', args[1].text);
    test.verifyEqual('  \'', args[1].prefix);
    test.verifyEqual('\'', args[1].suffix);

    args = requ._tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \
    test.verifyEqual(3, args.length);
    test.verifyEqual('12\'34', args[0].text);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('12 34', args[1].text);
    test.verifyEqual(' "', args[1].prefix);
    test.verifyEqual('"', args[1].suffix);
    test.verifyEqual('\\', args[2].text);
    test.verifyEqual(' ', args[2].prefix);
    test.verifyEqual('', args[2].suffix);

    args = requ._tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd
    test.verifyEqual(4, args.length);
    test.verifyEqual('a b', args[0].text);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('\t\n\r', args[1].text);
    test.verifyEqual(' ', args[1].prefix);
    test.verifyEqual('', args[1].suffix);
    test.verifyEqual('\'x"', args[2].text);
    test.verifyEqual(' ', args[2].prefix);
    test.verifyEqual('', args[2].suffix);
    test.verifyEqual('d', args[3].text);
    test.verifyEqual(' \'', args[3].prefix);
    test.verifyEqual('', args[3].suffix);

    return "testTokenize Completed";
};

testCli.testSplit = function() {
    var args;
    var requ = new Requisition();

    args = requ._tokenize('s');
    requ._split(args);
    test.verifyEqual(0, args.length);
    test.verifyEqual('s', requ.commandAssignment.getArg().text);

    args = requ._tokenize('tsv');
    requ._split(args);
    test.verifyEqual([], args);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);

    args = requ._tokenize('tsv a b');
    requ._split(args);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual(2, args.length);
    test.verifyEqual('a', args[0].text);
    test.verifyEqual('b', args[1].text);

    // TODO: add tests for sub commands
    return "testSplit Completed";
};

testCli.testCli = function() {
    var assign1;
    var assign2;
    var assignC;
    var requ = new Requisition();
    var debug = false;
    var status;
    var prev;
    var statuses;
    var predictions;

    function update(input) {
        requ.update(input);

        if (debug) {
            console.log('####### TEST: typed="' + input.typed +
                    '" cur=' + input.cursor.start +
                    ' cli=', requ);
        }

        status = requ.getStatus();
        assignC = requ.getAssignmentAt(input.cursor.start);
        statuses = requ.getInputStatusMarkup().map(function(status) {
            return status.toString()[0];
        }).join('');

        if (requ.commandAssignment.getValue()) {
            assign1 = requ.getAssignment(0);
            assign2 = requ.getAssignment(1);
        }
        else {
            assign1 = undefined;
            assign2 = undefined;
        }
    }

    function verifyPredictionsContains(name, predictions) {
        return predictions.every(function(prediction) {
            return name === prediction || name === prediction.name;
        }, this);
    }

    update({  typed: '', cursor: { start: 0, end: 0 } });
    test.verifyEqual('', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(-1, assignC.paramIndex);
    test.verifyEqual(null, requ.commandAssignment.getValue());

    update({  typed: ' ', cursor: { start: 1, end: 1 } });
    test.verifyEqual('V', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(-1, assignC.paramIndex);
    test.verifyEqual(null, requ.commandAssignment.getValue());

    update({  typed: ' ', cursor: { start: 0, end: 0 } });
    test.verifyEqual('V', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(-1, assignC.paramIndex);
    test.verifyEqual(null, requ.commandAssignment.getValue());

    update({  typed: 't', cursor: { start: 1, end: 1 } });
    test.verifyEqual('I', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(-1, assignC.paramIndex);
    test.verifyTrue(assignC.getPredictions().length > 0);
    test.verifyTrue(assignC.getPredictions().length < 20); // could break ...
    verifyPredictionsContains('tsv', assignC.getPredictions());
    verifyPredictionsContains('tsr', assignC.getPredictions());
    test.verifyNull(requ.commandAssignment.getValue());

    update({  typed: 'tsv', cursor: { start: 3, end: 3 } });
    test.verifyEqual('VVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(-1, assignC.paramIndex);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);

    update({  typed: 'tsv ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(0, assignC.paramIndex);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);

    update({  typed: 'tsv ', cursor: { start: 2, end: 2 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(-1, assignC.paramIndex);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);

    update({  typed: 'tsv o', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVI', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(0, assignC.paramIndex);
    test.verifyEqual(2, assignC.getPredictions().length);
    test.verifyTrue(option1, assignC.getPredictions()[0]);
    test.verifyTrue(option2, assignC.getPredictions()[1]);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('o', assign1.getArg().text);
    test.verifyEqual(undefined, assign1.getValue());

    update({  typed: 'tsv option', cursor: { start: 10, end: 10 } });
    test.verifyEqual('VVVVIIIIII', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(0, assignC.paramIndex);
    test.verifyEqual(2, assignC.getPredictions().length);
    test.verifyTrue(option1, assignC.getPredictions()[0]);
    test.verifyTrue(option2, assignC.getPredictions()[1]);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('option', assign1.getArg().text);
    test.verifyEqual(undefined, assign1.getValue());

    update({ typed:  'tsv option', cursor: { start: 1, end: 1 } });
    test.verifyEqual('VVVVEEEEEE', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(-1, assignC.paramIndex);
    test.verifyEqual(Status.ERROR, status);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('option', assign1.getArg().text);
    test.verifyEqual(undefined, assign1.getValue());

    update({ typed:  'tsv option ', cursor: { start: 11, end: 11 } });
    test.verifyEqual('VVVVEEEEEEV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(Status.ERROR, status); // !!!!!!!!!
    test.verifyEqual(1, assignC.paramIndex);
    test.verifyEqual(0, assignC.getPredictions().length);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('option', assign1.getArg().text);
    test.verifyEqual(undefined, assign1.getValue());

    update({ typed:  'tsv option1', cursor: { start: 11, end: 11 } });
    test.verifyEqual('VVVVVVVVVVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('option1', assign1.getArg().text);
    test.verifyEqual(option1, assign1.getValue());
    test.verifyEqual(0, assignC.paramIndex);

    update({ typed:  'tsv option1 ', cursor: { start: 12, end: 12 } });
    test.verifyEqual('VVVVVVVVVVVV', statuses);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('option1', assign1.getArg().text);
    test.verifyEqual(option1, assign1.getValue());
    test.verifyEqual(1, assignC.paramIndex);

    update({ typed:  'tsv option1 6', cursor: { start: 13, end: 13 } });
    test.verifyEqual('VVVVVVVVVVVVV', statuses);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('option1', assign1.getArg().text);
    test.verifyEqual(option1, assign1.getValue());
    test.verifyEqual('6', assign2.getArg().text);
    test.verifyEqual(6, assign2.getValue());
    test.verifyEqual('number', typeof assign2.getValue());
    test.verifyEqual(1, assignC.paramIndex);

    update({ typed:  'tsv option2 6', cursor: { start: 13, end: 13 } });
    test.verifyEqual('VVVVVVVVVVVVE', statuses);
    test.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    test.verifyEqual('option2', assign1.getArg().text);
    test.verifyEqual(option2, assign1.getValue());
    test.verifyEqual('6', assign2.getArg().text);
    test.verifyEqual(undefined, assign2.getValue());
    test.verifyEqual(1, assignC.paramIndex);

    update({ typed:  'fred', cursor: { start: 4, end: 4 } });
    test.verifyEqual('EEEE', statuses);
    test.verifyEqual('fred', requ.commandAssignment.getArg().text);
    test.verifyEqual('', requ._unassigned.getArg().text);
    test.verifyEqual(-1, assignC.paramIndex);

    update({ typed:  'fred ', cursor: { start: 5, end: 5 } });
    test.verifyEqual('EEEEV', statuses);
    test.verifyEqual('fred', requ.commandAssignment.getArg().text);
    test.verifyEqual('', requ._unassigned.getArg().text);
    test.verifyEqual(-1, assignC.paramIndex);

    update({ typed:  'fred one', cursor: { start: 8, end: 8 } });
    test.verifyEqual('EEEEVEEE', statuses);
    test.verifyEqual('fred', requ.commandAssignment.getArg().text);
    test.verifyEqual('one', requ._unassigned.getArg().text);

    update({ typed:  'tsr', cursor: { start: 3, end: 3 } });
    test.verifyEqual('VVV', statuses);
    test.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    //test.verifyEqual(undefined, assign1.getArg());
    //test.verifyEqual(undefined, assign1.getValue());
    test.verifyEqual(undefined, assign2);

    update({ typed:  'tsr ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    //test.verifyEqual(undefined, assign1.getArg());
    //test.verifyEqual(undefined, assign1.getValue());
    test.verifyEqual(undefined, assign2);

    update({ typed:  'tsr h', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVV', statuses);
    test.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    test.verifyEqual('h', assign1.getArg().text);
    test.verifyEqual('h', assign1.getValue());

    update({ typed:  'tsr "h h"', cursor: { start: 9, end: 9 } });
    test.verifyEqual('VVVVVVVVV', statuses);
    test.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    test.verifyEqual('h h', assign1.getArg().text);
    test.verifyEqual('h h', assign1.getValue());

    update({ typed:  'tsr h h h', cursor: { start: 9, end: 9 } });
    test.verifyEqual('VVVVVVVVV', statuses);
    test.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    test.verifyEqual('h h h', assign1.getArg().text);
    test.verifyEqual('h h h', assign1.getValue());

    // TODO: Add test to see that a command without mandatory param causes ERROR

    update({ typed:  'tsu', cursor: { start: 3, end: 3 } });
    test.verifyEqual('VVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    //test.verifyEqual(undefined, assign1.getArg());
    test.verifyEqual(undefined, assign1.getValue());

    update({ typed:  'tsu ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    //test.verifyEqual(undefined, assign1.getArg());
    test.verifyEqual(undefined, assign1.getValue());

    update({ typed:  'tsu 1', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    test.verifyEqual('1', assign1.getArg().text);
    test.verifyEqual(1, assign1.getValue());
    test.verifyEqual('number', typeof assign1.getValue());

    update({ typed:  'tsu x', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVE', statuses);
    test.verifyEqual(Status.ERROR, status);
    test.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    test.verifyEqual('x', assign1.getArg().text);
    test.verifyEqual(NaN, assign1.getValue());

    update({ typed:  'tsn', cursor: { start: 3, end: 3 } });
    test.verifyEqual('III', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn', requ.commandAssignment.getValue().name);
    test.verifyEqual(undefined, assign1);

    update({ typed:  'tsn ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('IIIV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn', requ.commandAssignment.getValue().name);
    test.verifyEqual(undefined, assign1);

    update({ typed:  'tsn x', cursor: { start: 5, end: 5 } });
    test.verifyEqual('EEEVE', statuses);
    test.verifyEqual(Status.ERROR, status);
    test.verifyEqual('tsn x', requ.commandAssignment.getArg().text);
    test.verifyEqual(undefined, assign1);

    update({ typed:  'tsn dif', cursor: { start: 7, end: 7 } });
    test.verifyEqual('VVVVVVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn dif', requ.commandAssignment.getValue().name);
    //test.verifyEqual(undefined, assign1.getArg());
    //test.verifyEqual(undefined, assign1.getValue());

    update({ typed:  'tsn dif ', cursor: { start: 8, end: 8 } });
    test.verifyEqual('VVVVVVVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn dif', requ.commandAssignment.getValue().name);
    //test.verifyEqual(undefined, assign1.getArg());
    //test.verifyEqual(undefined, assign1.getValue());

    update({ typed:  'tsn dif x', cursor: { start: 9, end: 9 } });
    test.verifyEqual('VVVVVVVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual('tsn dif', requ.commandAssignment.getValue().name);
    test.verifyEqual('x', assign1.getArg().text);
    test.verifyEqual('x', assign1.getValue());

    update({ typed:  'tsn ext', cursor: { start: 7, end: 7 } });
    test.verifyEqual('VVVVVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual('tsn ext', requ.commandAssignment.getValue().name);
    //test.verifyEqual(undefined, assign1.getArg());
    //test.verifyEqual(undefined, assign1.getValue());

    return "testCli Completed";
};


});
