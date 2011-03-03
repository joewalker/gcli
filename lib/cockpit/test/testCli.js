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

//window.require.s.contexts._.defined['pilot/canon'].getCommandNames();

var test = require('cockpit/test/assert').test;
var Status = require('pilot/types').Status;
var settings = require('pilot/settings').settings;
var tokenize = require('cockpit/cli')._tokenize;
var split = require('cockpit/cli')._split;
var CliRequisition = require('cockpit/cli').CliRequisition;
var canon = require('pilot/canon');

var tsv = {
    name: 'tsv',
    params: [
        { name: 'setting', type: 'setting', defaultValue: null },
        { name: 'value', type: 'settingValue', defaultValue: null }
    ],
    exec: function (env, args, request) { }
};

tsr.metadata = {
    name: 'tsr',
    params: [ { name: 'text', type: 'text' } ]
};
function tsr() { }

tsu.metadata = {
    name: 'tsu',
    params: [ { name: 'num', type: 'number' } ]
};
function tsu() { }

var tsn = {
    metadata: { },

    difMetadata: { params: [ { name: 'text', type: 'text' } ] },
    dif: function(text) { },

    extMetadata: { params: [ { name: 'text', type: 'text' } ] },
    ext: function(text) { },

    exteMetadata: { params: [ { name: 'text', type: 'text' } ] },
    exte: function(text) { },

    extenMetadata: { params: [ { name: 'text', type: 'text' } ] },
    exten: function(text) { },

    extendMetadata: { params: [ { name: 'text', type: 'text' } ] },
    extend: function(text) { }
};

exports.testAll = function() {
    canon.addCommand(tsv);
    canon.addCommand(tsr);
    canon.addCommand(tsu);
    canon.addCommands(tsn, 'tsn');

    exports.testTokenize();
    exports.testSplit();
    exports.testCli();

    canon.removeCommand(tsv);
    canon.removeCommand(tsr);
    canon.removeCommand(tsu);
    canon.removeCommands(tsn, 'tsn');

    return "testAll Completed";
};

exports.testTokenize = function() {
    var args;
    var cli = new CliRequisition();

    args = cli._tokenize('');
    test.verifyEqual(1, args.length);
    test.verifyEqual('', args[0].text);
    test.verifyEqual(0, args[0].start);
    test.verifyEqual(0, args[0].end);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);

    args = cli._tokenize('s');
    test.verifyEqual(1, args.length);
    test.verifyEqual('s', args[0].text);
    test.verifyEqual(0, args[0].start);
    test.verifyEqual(1, args[0].end);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);

    args = cli._tokenize(' ');
    test.verifyEqual(1, args.length);
    test.verifyEqual('', args[0].text);
    test.verifyEqual(1, args[0].start);
    test.verifyEqual(1, args[0].end);
    test.verifyEqual(' ', args[0].prefix);
    test.verifyEqual('', args[0].suffix);

    args = cli._tokenize('s s');
    test.verifyEqual(2, args.length);
    test.verifyEqual('s', args[0].text);
    test.verifyEqual(0, args[0].start);
    test.verifyEqual(1, args[0].end);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('s', args[1].text);
    test.verifyEqual(2, args[1].start);
    test.verifyEqual(3, args[1].end);
    test.verifyEqual(' ', args[1].prefix);
    test.verifyEqual('', args[1].suffix);

    args = cli._tokenize(' 1234  \'12 34\'');
    test.verifyEqual(2, args.length);
    test.verifyEqual('1234', args[0].text);
    test.verifyEqual(1, args[0].start);
    test.verifyEqual(5, args[0].end);
    test.verifyEqual(' ', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('12 34', args[1].text);
    test.verifyEqual(7, args[1].start);
    test.verifyEqual(14, args[1].end);
    test.verifyEqual('  \'', args[1].prefix);
    test.verifyEqual('\'', args[1].suffix);

    args = cli._tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \
    test.verifyEqual(3, args.length);
    test.verifyEqual('12\'34', args[0].text);
    test.verifyEqual(0, args[0].start);
    test.verifyEqual(5, args[0].end);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('12 34', args[1].text);
    test.verifyEqual(6, args[1].start);
    test.verifyEqual(13, args[1].end);
    test.verifyEqual(' "', args[1].prefix);
    test.verifyEqual('"', args[1].suffix);
    test.verifyEqual('\\', args[2].text);
    test.verifyEqual(14, args[2].start);
    test.verifyEqual(15, args[2].end);
    test.verifyEqual(' ', args[2].prefix);
    test.verifyEqual('', args[2].suffix);

    args = cli._tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd
    test.verifyEqual(4, args.length);
    test.verifyEqual('a b', args[0].text);
    test.verifyEqual(0, args[0].start);
    test.verifyEqual(3, args[0].end);
    test.verifyEqual('', args[0].prefix);
    test.verifyEqual('', args[0].suffix);
    test.verifyEqual('\t\n\r', args[1].text);
    test.verifyEqual(4, args[1].start);
    test.verifyEqual(7, args[1].end);
    test.verifyEqual(' ', args[1].prefix);
    test.verifyEqual('', args[1].suffix);
    test.verifyEqual('\'x"', args[2].text);
    test.verifyEqual(8, args[2].start);
    test.verifyEqual(11, args[2].end);
    test.verifyEqual(' ', args[2].prefix);
    test.verifyEqual('', args[2].suffix);
    test.verifyEqual('d', args[3].text);
    test.verifyEqual(13, args[3].start);
    test.verifyEqual(14, args[3].end);
    test.verifyEqual(' \'', args[3].prefix);
    test.verifyEqual('', args[3].suffix);

    return "testTokenize Completed";
};

exports.testSplit = function() {
    var args;
    var cli = new CliRequisition();

    args = cli._tokenize('s');
    cli._split(args);
    test.verifyEqual(0, args.length);
    test.verifyEqual('s', cli.commandAssignment.arg.text);

    args = cli._tokenize('tsv');
    cli._split(args);
    test.verifyEqual([], args);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);

    args = cli._tokenize('tsv a b');
    cli._split(args);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual(2, args.length);
    test.verifyEqual('a', args[0].text);
    test.verifyEqual('b', args[1].text);

    // TODO: add tests for sub commands
    return "testSplit Completed";
};

exports.testCli = function() {
    var assign1;
    var assign2;
    var assignC;
    var cli = new CliRequisition();
    var debug = false;
    var status;
    var prev;
    var statuses;
    var predictions;

    function update(input) {
        cli.update(input);

        if (debug) {
            console.log('####### TEST: typed="' + input.typed +
                    '" cur=' + input.cursor.start +
                    ' cli=', cli);
        }

        status = cli.getStatus();
        assignC = cli.getAssignmentAt(input.cursor.start, true);
        statuses = cli.getInputStatusMarkup().map(function(status) {
            return status.toString()[0];
        }).join('');

        if (cli.commandAssignment.value) {
            assign1 = cli.getAssignment(0);
            assign2 = cli.getAssignment(1);
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

    var historyLengthSetting = settings.getSetting('historyLength');

    update({  typed: '', cursor: { start: 0, end: 0 } });
    test.verifyEqual('', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(0, assignC.arg.start);
    test.verifyEqual(0, assignC.arg.end);
    test.verifyEqual(null, cli.commandAssignment.value);

    update({  typed: ' ', cursor: { start: 1, end: 1 } });
    test.verifyEqual('V', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    //test.verifyEqual(1, assign.arg.start);
    test.verifyEqual(1, assignC.arg.end);
    test.verifyEqual(null, cli.commandAssignment.value);

    update({  typed: ' ', cursor: { start: 0, end: 0 } });
    test.verifyEqual('V', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    //test.verifyEqual(1, assign.arg.start);
    test.verifyEqual(1, assignC.arg.end);
    test.verifyEqual(null, cli.commandAssignment.value);

    update({  typed: 't', cursor: { start: 1, end: 1 } });
    test.verifyEqual('I', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(0, assignC.arg.start);
    test.verifyEqual(1, assignC.arg.end);
    test.verifyTrue(assignC.getPredictions().length > 0);
    test.verifyTrue(assignC.getPredictions().length < 20); // could break ...
    verifyPredictionsContains('tsv', assignC.getPredictions());
    verifyPredictionsContains('tsr', assignC.getPredictions());
    test.verifyNull(cli.commandAssignment.value);

    update({  typed: 'tsv', cursor: { start: 3, end: 3 } });
    test.verifyEqual('VVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(0, assignC.arg.start);
    test.verifyEqual(3, assignC.arg.end);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);

    update({  typed: 'tsv ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(-1, assignC.arg.start);
    test.verifyEqual(-1, assignC.arg.end);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);

    update({  typed: 'tsv ', cursor: { start: 2, end: 2 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(0, assignC.arg.start);
    //test.verifyEqual(2, assign.arg.end);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);

    update({  typed: 'tsv h', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVI', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(4, assignC.arg.start);
    test.verifyEqual(5, assignC.arg.end);
    test.verifyTrue(assignC.getPredictions().length > 0);
    verifyPredictionsContains('historyLength', assignC.getPredictions());
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('h', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({  typed: 'tsv historyLengt', cursor: { start: 16, end: 16 } });
    test.verifyEqual('VVVVIIIIIIIIIIII', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual(4, assignC.arg.start);
    test.verifyEqual(16, assignC.arg.end);
    test.verifyEqual(1, assignC.getPredictions().length);
    verifyPredictionsContains('historyLength', assignC.getPredictions());
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLengt', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsv historyLengt', cursor: { start: 1, end: 1 } });
    test.verifyEqual('VVVVEEEEEEEEEEEE', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(0, assignC.arg.start);
    test.verifyEqual(3, assignC.arg.end);
    test.verifyEqual(Status.ERROR, status);
    test.verifyEqual(0, assignC.getPredictions().length);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLengt', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsv historyLengt ', cursor: { start: 17, end: 17 } });
    test.verifyEqual('VVVVEEEEEEEEEEEEV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual(-1, assignC.arg.start);
    test.verifyEqual(-1, assignC.arg.end);
    test.verifyEqual(Status.ERROR, status);
    test.verifyEqual(0, assignC.getPredictions().length);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLengt', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsv historyLength', cursor: { start: 17, end: 17 } });
    test.verifyEqual('VVVVVVVVVVVVVVVVV', statuses);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLength', assign1.arg.text);
    test.verifyEqual(historyLengthSetting, assign1.value);

    update({ typed:  'tsv historyLength ', cursor: { start: 18, end: 18 } });
    test.verifyEqual('VVVVVVVVVVVVVVVVVV', statuses);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLength', assign1.arg.text);
    test.verifyEqual(historyLengthSetting, assign1.value);

    update({ typed:  'tsv historyLength 6', cursor: { start: 19, end: 19 } });
    test.verifyEqual('VVVVVVVVVVVVVVVVVVV', statuses);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLength', assign1.arg.text);
    test.verifyEqual(historyLengthSetting, assign1.value);
    test.verifyEqual('6', assign2.arg.text);
    test.verifyEqual(6, assign2.value);
    test.verifyEqual('number', typeof assign2.value);

    update({ typed:  'fred', cursor: { start: 4, end: 4 } });
    test.verifyEqual('EEEE', statuses);
    test.verifyEqual('fred', cli.commandAssignment.arg.text);
    test.verifyEqual(null, cli._unassigned);

    update({ typed:  'fred ', cursor: { start: 5, end: 5 } });
    test.verifyEqual('EEEEV', statuses);
    test.verifyEqual('fred', cli.commandAssignment.arg.text);
    test.verifyEqual(null, cli._unassigned);

    update({ typed:  'fred one', cursor: { start: 8, end: 8 } });
    test.verifyEqual('EEEEVEEE', statuses);
    test.verifyEqual('fred', cli.commandAssignment.arg.text);
    test.verifyEqual('one', cli._unassigned.text);

    update({ typed:  'tsr', cursor: { start: 3, end: 3 } });
    test.verifyEqual('VVV', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    //test.verifyEqual(undefined, assign1.arg);
    //test.verifyEqual(undefined, assign1.value);
    test.verifyEqual(undefined, assign2);

    update({ typed:  'tsr ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    //test.verifyEqual(undefined, assign1.arg);
    //test.verifyEqual(undefined, assign1.value);
    test.verifyEqual(undefined, assign2);

    update({ typed:  'tsr h', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVV', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual('h', assign1.arg.text);
    test.verifyEqual('h', assign1.value);

    update({ typed:  'tsr "h h"', cursor: { start: 9, end: 9 } });
    test.verifyEqual('VVVVVVVVV', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual('h h', assign1.arg.text);
    test.verifyEqual('h h', assign1.value);

    update({ typed:  'tsr h h h', cursor: { start: 9, end: 9 } });
    test.verifyEqual('VVVVVVVVV', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual('h h h', assign1.arg.text);
    test.verifyEqual('h h h', assign1.value);

    // TODO: Add test to see that a command without mandatory param causes ERROR

    update({ typed:  'tsu', cursor: { start: 3, end: 3 } });
    test.verifyEqual('VVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsu', cli.commandAssignment.value.name);
    //test.verifyEqual(undefined, assign1.arg);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsu ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('VVVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsu', cli.commandAssignment.value.name);
    //test.verifyEqual(undefined, assign1.arg);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsu 1', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual('tsu', cli.commandAssignment.value.name);
    test.verifyEqual('1', assign1.arg.text);
    test.verifyEqual(1, assign1.value);
    test.verifyEqual('number', typeof assign1.value);

    update({ typed:  'tsu x', cursor: { start: 5, end: 5 } });
    test.verifyEqual('VVVVE', statuses);
    test.verifyEqual(Status.ERROR, status);
    test.verifyEqual('tsu', cli.commandAssignment.value.name);
    test.verifyEqual('x', assign1.arg.text);
    test.verifyEqual(NaN, assign1.value);

    update({ typed:  'tsn', cursor: { start: 3, end: 3 } });
    test.verifyEqual('III', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn', cli.commandAssignment.value.name);
    test.verifyEqual(undefined, assign1);

    update({ typed:  'tsn ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('IIIV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn', cli.commandAssignment.value.name);
    test.verifyEqual(undefined, assign1);

    update({ typed:  'tsn x', cursor: { start: 5, end: 5 } });
    test.verifyEqual('EEEEE', statuses);
    test.verifyEqual(Status.ERROR, status);
    test.verifyEqual('tsn x', cli.commandAssignment.arg.text);
    test.verifyEqual(undefined, assign1);

    update({ typed:  'tsn dif', cursor: { start: 7, end: 7 } });
    test.verifyEqual('VVVVVVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn dif', cli.commandAssignment.value.name);
    //test.verifyEqual(undefined, assign1.arg);
    //test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsn dif ', cursor: { start: 8, end: 8 } });
    test.verifyEqual('VVVVVVVV', statuses);
    test.verifyEqual(Status.INCOMPLETE, status);
    test.verifyEqual('tsn dif', cli.commandAssignment.value.name);
    //test.verifyEqual(undefined, assign1.arg);
    //test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsn dif x', cursor: { start: 9, end: 9 } });
    test.verifyEqual('VVVVVVVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual('tsn dif', cli.commandAssignment.value.name);
    test.verifyEqual('x', assign1.arg.text);
    test.verifyEqual('x', assign1.value);

    update({ typed:  'tsn ext', cursor: { start: 7, end: 7 } });
    test.verifyEqual('VVVVVVV', statuses);
    test.verifyEqual(Status.VALID, status);
    test.verifyEqual('tsn ext', cli.commandAssignment.value.name);
    //test.verifyEqual(undefined, assign1.arg);
    //test.verifyEqual(undefined, assign1.value);

    return "testCli Completed";
};


});
