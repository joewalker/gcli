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


var Requisition = require('gcli/cli').Requisition;
var Status = require('gcli/types').Status;
var commands = require('gclitest/commands');

var t = require('test/assert');

exports.setup = function() {
    commands.setup();
};

exports.shutdown = function() {
    commands.shutdown();
};


var assign1;
var assign2;
var assignC;
var requ;
var debug = false;
var status;
var prev;
var statuses;
var predictions;

function update(input) {
    if (!requ) {
      requ = new Requisition();
    }
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


exports.testBlank = function() {
    update({ typed: '', cursor: { start: 0, end: 0 } });
    t.verifyEqual(  '', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyEqual(null, requ.commandAssignment.getValue());

    update({ typed: ' ', cursor: { start: 1, end: 1 } });
    t.verifyEqual(  'V', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyEqual(null, requ.commandAssignment.getValue());

    update({ typed: ' ', cursor: { start: 0, end: 0 } });
    t.verifyEqual(  'V', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyEqual(null, requ.commandAssignment.getValue());
};

exports.testIncompleteMultiMatch = function() {
    update({ typed: 't', cursor: { start: 1, end: 1 } });
    t.verifyEqual(  'I', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyTrue(assignC.getPredictions().length > 0);
    t.verifyTrue(assignC.getPredictions().length < 20); // could break ...
    verifyPredictionsContains('tsv', assignC.getPredictions());
    verifyPredictionsContains('tsr', assignC.getPredictions());
    t.verifyTrue(null == requ.commandAssignment.getValue());
};

exports.testIncompleteSingleMatch = function() {
    update({ typed: 'tselar', cursor: { start: 6, end: 6 } });
    t.verifyEqual(  'IIIIII', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyEqual(1, assignC.getPredictions().length);
    t.verifyEqual('tselarr', assignC.getPredictions()[0].name);
    t.verifyTrue(null == requ.commandAssignment.getValue());
};

exports.testTsv = function() {
    update({ typed: 'tsv', cursor: { start: 3, end: 3 } });
    t.verifyEqual(  'VVV', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);

    update({ typed: 'tsv ', cursor: { start: 4, end: 4 } });
    t.verifyEqual(  'VVVV', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual(0, assignC.paramIndex);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);

    update({ typed: 'tsv ', cursor: { start: 2, end: 2 } });
    t.verifyEqual(  'VVVV', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);

    update({ typed: 'tsv o', cursor: { start: 5, end: 5 } });
    t.verifyEqual(  'VVVVI', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual(0, assignC.paramIndex);
    t.verifyEqual(2, assignC.getPredictions().length);
    t.verifyTrue(commands.option1, assignC.getPredictions()[0]);
    t.verifyTrue(commands.option2, assignC.getPredictions()[1]);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('o', assign1.getArg().text);
    t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsv option', cursor: { start: 10, end: 10 } });
    t.verifyEqual(  'VVVVIIIIII', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual(0, assignC.paramIndex);
    t.verifyEqual(2, assignC.getPredictions().length);
    t.verifyTrue(commands.option1, assignC.getPredictions()[0]);
    t.verifyTrue(commands.option2, assignC.getPredictions()[1]);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('option', assign1.getArg().text);
    t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsv option', cursor: { start: 1, end: 1 } });
    t.verifyEqual(  'VVVVEEEEEE', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual(-1, assignC.paramIndex);
    t.verifyEqual(Status.ERROR, status);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('option', assign1.getArg().text);
    t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsv option ', cursor: { start: 11, end: 11 } });
    t.verifyEqual(  'VVVVEEEEEEV', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual(Status.ERROR, status); // !!!!!!!!!
    t.verifyEqual(1, assignC.paramIndex);
    t.verifyEqual(0, assignC.getPredictions().length);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('option', assign1.getArg().text);
    t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsv option1', cursor: { start: 11, end: 11 } });
    t.verifyEqual(  'VVVVVVVVVVV', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('option1', assign1.getArg().text);
    t.verifyEqual(commands.option1, assign1.getValue());
    t.verifyEqual(0, assignC.paramIndex);

    update({ typed: 'tsv option1 ', cursor: { start: 12, end: 12 } });
    t.verifyEqual(  'VVVVVVVVVVVV', statuses);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('option1', assign1.getArg().text);
    t.verifyEqual(commands.option1, assign1.getValue());
    t.verifyEqual(1, assignC.paramIndex);

    update({ typed: 'tsv option1 6', cursor: { start: 13, end: 13 } });
    t.verifyEqual(  'VVVVVVVVVVVVV', statuses);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('option1', assign1.getArg().text);
    t.verifyEqual(commands.option1, assign1.getValue());
    t.verifyEqual('6', assign2.getArg().text);
    t.verifyEqual(6, assign2.getValue());
    t.verifyEqual('number', typeof assign2.getValue());
    t.verifyEqual(1, assignC.paramIndex);

    update({ typed: 'tsv option2 6', cursor: { start: 13, end: 13 } });
    t.verifyEqual(  'VVVVVVVVVVVVE', statuses);
    t.verifyEqual('tsv', requ.commandAssignment.getValue().name);
    t.verifyEqual('option2', assign1.getArg().text);
    t.verifyEqual(commands.option2, assign1.getValue());
    t.verifyEqual('6', assign2.getArg().text);
    t.verifyEqual(undefined, assign2.getValue());
    t.verifyEqual(1, assignC.paramIndex);
};

exports.testInvalid = function() {
    update({ typed: 'fred', cursor: { start: 4, end: 4 } });
    t.verifyEqual(  'EEEE', statuses);
    t.verifyEqual('fred', requ.commandAssignment.getArg().text);
    t.verifyEqual('', requ._unassigned.getArg().text);
    t.verifyEqual(-1, assignC.paramIndex);

    update({ typed: 'fred ', cursor: { start: 5, end: 5 } });
    t.verifyEqual(  'EEEEV', statuses);
    t.verifyEqual('fred', requ.commandAssignment.getArg().text);
    t.verifyEqual('', requ._unassigned.getArg().text);
    t.verifyEqual(-1, assignC.paramIndex);

    update({ typed: 'fred one', cursor: { start: 8, end: 8 } });
    t.verifyEqual(  'EEEEVEEE', statuses);
    t.verifyEqual('fred', requ.commandAssignment.getArg().text);
    t.verifyEqual('one', requ._unassigned.getArg().text);
};

exports.testSingleString = function() {
    update({ typed: 'tsr', cursor: { start: 3, end: 3 } });
    t.verifyEqual(  'VVV', statuses);
    t.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    //t.verifyEqual(undefined, assign1.getArg());
    //t.verifyEqual(undefined, assign1.getValue());
    t.verifyEqual(undefined, assign2);

    update({ typed: 'tsr ', cursor: { start: 4, end: 4 } });
    t.verifyEqual(  'VVVV', statuses);
    t.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    //t.verifyEqual(undefined, assign1.getArg());
    //t.verifyEqual(undefined, assign1.getValue());
    t.verifyEqual(undefined, assign2);

    update({ typed: 'tsr h', cursor: { start: 5, end: 5 } });
    t.verifyEqual(  'VVVVV', statuses);
    t.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    t.verifyEqual('h', assign1.getArg().text);
    t.verifyEqual('h', assign1.getValue());

    update({ typed: 'tsr "h h"', cursor: { start: 9, end: 9 } });
    t.verifyEqual(  'VVVVVVVVV', statuses);
    t.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    t.verifyEqual('h h', assign1.getArg().text);
    t.verifyEqual('h h', assign1.getValue());

    update({ typed: 'tsr h h h', cursor: { start: 9, end: 9 } });
    t.verifyEqual(  'VVVVVVVVV', statuses);
    t.verifyEqual('tsr', requ.commandAssignment.getValue().name);
    t.verifyEqual('h h h', assign1.getArg().text);
    t.verifyEqual('h h h', assign1.getValue());
};

// BUG 664203: Add test to see that a command without mandatory param -> ERROR

exports.testSingleNumber = function() {
    update({ typed: 'tsu', cursor: { start: 3, end: 3 } });
    t.verifyEqual(  'VVV', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    //t.verifyEqual(undefined, assign1.getArg());
    t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsu ', cursor: { start: 4, end: 4 } });
    t.verifyEqual(  'VVVV', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    //t.verifyEqual(undefined, assign1.getArg());
    t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsu 1', cursor: { start: 5, end: 5 } });
    t.verifyEqual(  'VVVVV', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    t.verifyEqual('1', assign1.getArg().text);
    t.verifyEqual(1, assign1.getValue());
    t.verifyEqual('number', typeof assign1.getValue());

    update({ typed: 'tsu x', cursor: { start: 5, end: 5 } });
    t.verifyEqual(  'VVVVE', statuses);
    t.verifyEqual(Status.ERROR, status);
    t.verifyEqual('tsu', requ.commandAssignment.getValue().name);
    t.verifyEqual('x', assign1.getArg().text);
    t.verifyNaN(assign1.getValue());
};

exports.testNestedCommand = function() {
    update({ typed: 'tsn', cursor: { start: 3, end: 3 } });
    t.verifyEqual(  'III', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual('tsn', requ.commandAssignment.getValue().name);
    t.verifyEqual(undefined, assign1);

    update({ typed: 'tsn ', cursor: { start: 4, end: 4 } });
    t.verifyEqual(  'IIIV', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual('tsn', requ.commandAssignment.getValue().name);
    t.verifyEqual(undefined, assign1);

    update({ typed: 'tsn x', cursor: { start: 5, end: 5 } });
    t.verifyEqual(  'EEEVE', statuses);
    t.verifyEqual(Status.ERROR, status);
    t.verifyEqual('tsn x', requ.commandAssignment.getArg().text);
    t.verifyEqual(undefined, assign1);

    update({ typed: 'tsn dif', cursor: { start: 7, end: 7 } });
    t.verifyEqual(  'VVVVVVV', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual('tsn dif', requ.commandAssignment.getValue().name);
    //t.verifyEqual(undefined, assign1.getArg());
    //t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsn dif ', cursor: { start: 8, end: 8 } });
    t.verifyEqual(  'VVVVVVVV', statuses);
    t.verifyEqual(Status.INCOMPLETE, status);
    t.verifyEqual('tsn dif', requ.commandAssignment.getValue().name);
    //t.verifyEqual(undefined, assign1.getArg());
    //t.verifyEqual(undefined, assign1.getValue());

    update({ typed: 'tsn dif x', cursor: { start: 9, end: 9 } });
    t.verifyEqual(  'VVVVVVVVV', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual('tsn dif', requ.commandAssignment.getValue().name);
    t.verifyEqual('x', assign1.getArg().text);
    t.verifyEqual('x', assign1.getValue());

    update({ typed: 'tsn ext', cursor: { start: 7, end: 7 } });
    t.verifyEqual(  'VVVVVVV', statuses);
    t.verifyEqual(Status.VALID, status);
    t.verifyEqual('tsn ext', requ.commandAssignment.getValue().name);
    //t.verifyEqual(undefined, assign1.getArg());
    //t.verifyEqual(undefined, assign1.getValue());
};


});
