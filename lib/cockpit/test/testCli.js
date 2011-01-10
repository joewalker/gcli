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


var test = require('cockpit/test/assert').test;
var Status = require('pilot/types').Status;
var settings = require('pilot/settings').settings;
var tokenize = require('cockpit/cli')._tokenize;
var split = require('cockpit/cli')._split;
var CliRequisition = require('cockpit/cli').CliRequisition;
var canon = require('pilot/canon');

var tsvCommandSpec = {
    name: 'tsv',
    params: [
        { name: 'setting', type: 'setting', defaultValue: null },
        { name: 'value', type: 'settingValue', defaultValue: null }
    ],
    exec: function(env, args, request) { }
};

var tsrCommandSpec = {
    name: 'tsr',
    params: [ { name: 'text', type: 'text' } ],
    exec: function(env, args, request) { }
};

exports.testAll = function() {
    canon.addCommand(tsvCommandSpec);
    canon.addCommand(tsrCommandSpec);

    exports.testTokenize();
    exports.testSplit();
    exports.testCli();

    canon.removeCommand(tsvCommandSpec);
    canon.removeCommand(tsrCommandSpec);

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
    test.verifyEqual(1, args.length);
    test.verifyEqual('s', args[0].text);
    test.verifyNull(cli.commandAssignment.value);

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
    var cli = new CliRequisition();
    var debug = true;
    var worst;
    var display;
    var statuses;

    function update(input) {
        cli.update(input);

        if (debug) {
            console.log('####### TEST: typed="' + input.typed +
                    '" cur=' + input.cursor.start +
                    ' cli=', cli);
        }

        worst = cli.getWorstHint();
        display = cli.getAssignmentAt(input.cursor.start).getHint();
        statuses = cli.getInputStatusMarkup().map(function(status) {
          return status.valueOf();
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
    test.verifyEqual(Status.INCOMPLETE, display.status);
    test.verifyEqual(0, display.start);
    test.verifyEqual(0, display.end);
    test.verifyEqual(display, worst);
    test.verifyNull(cli.commandAssignment.value);

    update({  typed: ' ', cursor: { start: 1, end: 1 } });
    test.verifyEqual('0', statuses);
    test.verifyEqual(Status.INCOMPLETE, display.status);
    test.verifyEqual(1, display.start);
    test.verifyEqual(1, display.end);
    test.verifyEqual(display, worst);
    test.verifyNull(cli.commandAssignment.value);

    update({  typed: ' ', cursor: { start: 0, end: 0 } });
    test.verifyEqual('0', statuses);
    test.verifyEqual(Status.INCOMPLETE, display.status);
    test.verifyEqual(1, display.start);
    test.verifyEqual(1, display.end);
    test.verifyEqual(display, worst);
    test.verifyNull(cli.commandAssignment.value);

    update({  typed: 't', cursor: { start: 1, end: 1 } });
    test.verifyEqual('1', statuses);
    test.verifyEqual(Status.INCOMPLETE, display.status);
    test.verifyEqual(0, display.start);
    test.verifyEqual(1, display.end);
    test.verifyEqual(display, worst);
    test.verifyTrue(display.predictions.length > 0);
    test.verifyTrue(display.predictions.length < 20); // could break ...
    verifyPredictionsContains('tsv', display.predictions);
    verifyPredictionsContains('tsr', display.predictions);
    test.verifyNull(cli.commandAssignment.value);

    update({  typed: 'tsv', cursor: { start: 3, end: 3 } });
    test.verifyEqual('000', statuses);
    test.verifyEqual(Status.VALID, display.status);
    test.verifyEqual(-1, display.start);
    test.verifyEqual(-1, display.end);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);

    update({  typed: 'tsv ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('0000', statuses);
    test.verifyEqual(Status.VALID, display.status);
    test.verifyEqual(-1, display.start);
    test.verifyEqual(-1, display.end);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);

    update({  typed: 'tsv ', cursor: { start: 2, end: 2 } });
    test.verifyEqual('0000', statuses);
    test.verifyEqual(Status.VALID, display.status);
    test.verifyEqual(0, display.start);
    test.verifyEqual(3, display.end);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);

    update({  typed: 'tsv h', cursor: { start: 5, end: 5 } });
    test.verifyEqual('00001', statuses);
    test.verifyEqual(Status.INCOMPLETE, display.status);
    test.verifyEqual(4, display.start);
    test.verifyEqual(5, display.end);
    test.verifyTrue(display.predictions.length > 0);
    verifyPredictionsContains('historyLength', display.predictions);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('h', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({  typed: 'tsv historyLengt', cursor: { start: 16, end: 16 } });
    test.verifyEqual('0000111111111111', statuses);
    test.verifyEqual(Status.INCOMPLETE, display.status);
    test.verifyEqual(4, display.start);
    test.verifyEqual(16, display.end);
    test.verifyEqual(1, display.predictions.length);
    verifyPredictionsContains('historyLength', display.predictions);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLengt', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsv historyLengt', cursor: { start: 1, end: 1 } });
    test.verifyEqual('0000222222222222', statuses);
    test.verifyEqual(Status.VALID, display.status);
    test.verifyEqual(0, display.start);
    test.verifyEqual(3, display.end);
    test.verifyEqual(Status.INVALID, worst.status);
    test.verifyEqual(4, worst.start);
    test.verifyEqual(16, worst.end);
    test.verifyEqual(1, worst.predictions.length);
    verifyPredictionsContains('historyLength', worst.predictions);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLengt', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsv historyLengt ', cursor: { start: 17, end: 17 } });
    // TODO: would   '00002222222222220' be better?
    test.verifyEqual('00002222222222222', statuses);
    test.verifyEqual(Status.VALID, display.status);
    test.verifyEqual(-1, display.start);
    test.verifyEqual(-1, display.end);
    test.verifyEqual(Status.INVALID, worst.status);
    test.verifyEqual(4, worst.start);
    test.verifyEqual(16, worst.end);
    test.verifyEqual(1, worst.predictions.length);
    verifyPredictionsContains('historyLength', worst.predictions);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLengt', assign1.arg.text);
    test.verifyEqual(undefined, assign1.value);

    update({ typed:  'tsv historyLength', cursor: { start: 17, end: 17 } });
    test.verifyEqual('00000000000000000', statuses);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLength', assign1.arg.text);
    test.verifyEqual(historyLengthSetting, assign1.value);

    update({ typed:  'tsv historyLength ', cursor: { start: 18, end: 18 } });
    test.verifyEqual('000000000000000000', statuses);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLength', assign1.arg.text);
    test.verifyEqual(historyLengthSetting, assign1.value);

    update({ typed:  'tsv historyLength 6', cursor: { start: 19, end: 19 } });
    test.verifyEqual('0000000000000000000', statuses);
    test.verifyEqual('tsv', cli.commandAssignment.value.name);
    test.verifyEqual('historyLength', assign1.arg.text);
    test.verifyEqual(historyLengthSetting, assign1.value);
    test.verifyEqual('6', assign2.arg.text);
    test.verifyEqual(6, assign2.value);
    test.verifyEqual('number', typeof assign2.value);

    update({ typed:  'tsr', cursor: { start: 3, end: 3 } });
    test.verifyEqual('000', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual(undefined, assign1.arg);
    test.verifyEqual(undefined, assign1.value);
    test.verifyEqual(undefined, assign2);

    update({ typed:  'tsr ', cursor: { start: 4, end: 4 } });
    test.verifyEqual('0000', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual(undefined, assign1.arg);
    test.verifyEqual(undefined, assign1.value);
    test.verifyEqual(undefined, assign2);

    update({ typed:  'tsr h', cursor: { start: 5, end: 5 } });
    test.verifyEqual('00000', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual('h', assign1.arg.text);
    test.verifyEqual('h', assign1.value);

    update({ typed:  'tsr "h h"', cursor: { start: 9, end: 9 } });
    test.verifyEqual('000000000', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual('h h', assign1.arg.text);
    test.verifyEqual('h h', assign1.value);

    update({ typed:  'tsr h h h', cursor: { start: 9, end: 9 } });
    test.verifyEqual('000000000', statuses);
    test.verifyEqual('tsr', cli.commandAssignment.value.name);
    test.verifyEqual('h h h', assign1.arg.text);
    test.verifyEqual('h h h', assign1.value);

    // TODO: Add test to see that a command without mandatory param causes INVALID

    return "testCli Completed";
};


});
