/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

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
var statuses;

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
  statuses = requ.getInputStatusMarkup().map(function(s) {
    return s.toString()[0];
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
    return name === prediction.name || name === prediction.value.name;
  }, this);
}


exports.testBlank = function() {
  update({ typed: '', cursor: { start: 0, end: 0 } });
  t.verifySame(   '', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifySame(null, requ.commandAssignment.getValue());

  update({ typed: ' ', cursor: { start: 1, end: 1 } });
  t.verifySame(   'V', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifySame(null, requ.commandAssignment.getValue());

  update({ typed: ' ', cursor: { start: 0, end: 0 } });
  t.verifySame(   'V', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifySame(null, requ.commandAssignment.getValue());
};

exports.testIncompleteMultiMatch = function() {
  update({ typed: 't', cursor: { start: 1, end: 1 } });
  t.verifySame(   'I', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifyTrue(assignC.getPredictions().length > 0);
  t.verifyTrue(assignC.getPredictions().length < 20); // could break ...
  verifyPredictionsContains('tsv', assignC.getPredictions());
  verifyPredictionsContains('tsr', assignC.getPredictions());
  t.verifyTrue(null === requ.commandAssignment.getValue());
};

exports.testIncompleteSingleMatch = function() {
  update({ typed: 'tselar', cursor: { start: 6, end: 6 } });
  t.verifySame(   'IIIIII', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifySame(1, assignC.getPredictions().length);
  t.verifySame('tselarr', assignC.getPredictions()[0].value.name);
  t.verifyTrue(null === requ.commandAssignment.getValue());
};

exports.testTsv = function() {
  update({ typed: 'tsv', cursor: { start: 3, end: 3 } });
  t.verifySame(   'VVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv ', cursor: { start: 4, end: 4 } });
  t.verifySame(   'VVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(0, assignC.paramIndex);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv ', cursor: { start: 2, end: 2 } });
  t.verifySame(   'VVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv o', cursor: { start: 5, end: 5 } });
  t.verifySame(   'VVVVI', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(0, assignC.paramIndex);
  t.verifySame(2, assignC.getPredictions().length);
  t.verifyTrue(commands.option1, assignC.getPredictions()[0].value);
  t.verifyTrue(commands.option2, assignC.getPredictions()[1].value);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('o', assign1.getArg().text);
  t.verifySame(null, assign1.getValue());

  update({ typed: 'tsv option', cursor: { start: 10, end: 10 } });
  t.verifySame(   'VVVVIIIIII', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(0, assignC.paramIndex);
  t.verifySame(2, assignC.getPredictions().length);
  t.verifyTrue(commands.option1, assignC.getPredictions()[0].value);
  t.verifyTrue(commands.option2, assignC.getPredictions()[1].value);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('option', assign1.getArg().text);
  t.verifySame(null, assign1.getValue());

  update({ typed: 'tsv option', cursor: { start: 1, end: 1 } });
  t.verifySame(   'VVVVEEEEEE', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(-1, assignC.paramIndex);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('option', assign1.getArg().text);
  t.verifySame(null, assign1.getValue());

  update({ typed: 'tsv option ', cursor: { start: 11, end: 11 } });
  t.verifySame(   'VVVVEEEEEEV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame(1, assignC.paramIndex);
  t.verifySame(0, assignC.getPredictions().length);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('option', assign1.getArg().text);
  t.verifySame(null, assign1.getValue());

  update({ typed: 'tsv option1', cursor: { start: 11, end: 11 } });
  t.verifySame(   'VVVVVVVVVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('option1', assign1.getArg().text);
  t.verifySame(commands.option1, assign1.getValue());
  t.verifySame(0, assignC.paramIndex);

  update({ typed: 'tsv option1 ', cursor: { start: 12, end: 12 } });
  t.verifySame(   'VVVVVVVVVVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('option1', assign1.getArg().text);
  t.verifySame(commands.option1, assign1.getValue());
  t.verifySame(1, assignC.paramIndex);

  update({ typed: 'tsv option1 6', cursor: { start: 13, end: 13 } });
  t.verifySame(   'VVVVVVVVVVVVV', statuses);
  t.verifySame(Status.VALID, status);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('option1', assign1.getArg().text);
  t.verifySame(commands.option1, assign1.getValue());
  t.verifySame('6', assign2.getArg().text);
  t.verifySame(6, assign2.getValue());
  t.verifySame('number', typeof assign2.getValue());
  t.verifySame(1, assignC.paramIndex);

  update({ typed: 'tsv option2 6', cursor: { start: 13, end: 13 } });
  t.verifySame(   'VVVVVVVVVVVVE', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsv', requ.commandAssignment.getValue().name);
  t.verifySame('option2', assign1.getArg().text);
  t.verifySame(commands.option2, assign1.getValue());
  t.verifySame('6', assign2.getArg().text);
  t.verifySame(null, assign2.getValue());
  t.verifySame(1, assignC.paramIndex);
};

exports.testInvalid = function() {
  update({ typed: 'fred', cursor: { start: 4, end: 4 } });
  t.verifySame(   'EEEE', statuses);
  t.verifySame('fred', requ.commandAssignment.getArg().text);
  t.verifySame('', requ._unassigned.getArg().text);
  t.verifySame(-1, assignC.paramIndex);

  update({ typed: 'fred ', cursor: { start: 5, end: 5 } });
  t.verifySame(   'EEEEV', statuses);
  t.verifySame('fred', requ.commandAssignment.getArg().text);
  t.verifySame('', requ._unassigned.getArg().text);
  t.verifySame(-1, assignC.paramIndex);

  update({ typed: 'fred one', cursor: { start: 8, end: 8 } });
  t.verifySame(   'EEEEVEEE', statuses);
  t.verifySame('fred', requ.commandAssignment.getArg().text);
  t.verifySame('one', requ._unassigned.getArg().text);
};

exports.testSingleString = function() {
  update({ typed: 'tsr', cursor: { start: 3, end: 3 } });
  t.verifySame(   'VVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsr', requ.commandAssignment.getValue().name);
  //t.verifySame(undefined, assign1.getArg());
  //t.verifySame(undefined, assign1.getValue());
  t.verifySame(undefined, assign2);

  update({ typed: 'tsr ', cursor: { start: 4, end: 4 } });
  t.verifySame(   'VVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsr', requ.commandAssignment.getValue().name);
  //t.verifySame(undefined, assign1.getArg());
  //t.verifySame(undefined, assign1.getValue());
  t.verifySame(undefined, assign2);

  update({ typed: 'tsr h', cursor: { start: 5, end: 5 } });
  t.verifySame(   'VVVVV', statuses);
  t.verifySame(Status.VALID, status);
  t.verifySame('tsr', requ.commandAssignment.getValue().name);
  t.verifySame('h', assign1.getArg().text);
  t.verifySame('h', assign1.getValue());

  update({ typed: 'tsr "h h"', cursor: { start: 9, end: 9 } });
  t.verifySame(   'VVVVVVVVV', statuses);
  t.verifySame(Status.VALID, status);
  t.verifySame('tsr', requ.commandAssignment.getValue().name);
  t.verifySame('h h', assign1.getArg().text);
  t.verifySame('h h', assign1.getValue());

  update({ typed: 'tsr h h h', cursor: { start: 9, end: 9 } });
  t.verifySame(   'VVVVVVVVV', statuses);
  t.verifySame('tsr', requ.commandAssignment.getValue().name);
  t.verifySame('h h h', assign1.getArg().text);
  t.verifySame('h h h', assign1.getValue());
};

// BUG 664203: Add test to see that a command without mandatory param -> ERROR

exports.testSingleNumber = function() {
  update({ typed: 'tsu', cursor: { start: 3, end: 3 } });
  t.verifySame(   'VVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsu', requ.commandAssignment.getValue().name);
  //t.verifySame(undefined, assign1.getArg());
  t.verifySame(null, assign1.getValue());

  update({ typed: 'tsu ', cursor: { start: 4, end: 4 } });
  t.verifySame(   'VVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsu', requ.commandAssignment.getValue().name);
  //t.verifySame(undefined, assign1.getArg());
  t.verifySame(null, assign1.getValue());

  update({ typed: 'tsu 1', cursor: { start: 5, end: 5 } });
  t.verifySame(   'VVVVV', statuses);
  t.verifySame(Status.VALID, status);
  t.verifySame('tsu', requ.commandAssignment.getValue().name);
  t.verifySame('1', assign1.getArg().text);
  t.verifySame(1, assign1.getValue());
  t.verifySame('number', typeof assign1.getValue());

  update({ typed: 'tsu x', cursor: { start: 5, end: 5 } });
  t.verifySame(   'VVVVE', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsu', requ.commandAssignment.getValue().name);
  t.verifySame('x', assign1.getArg().text);
  t.verifyNaN(assign1.getValue());
};

exports.testNestedCommand = function() {
  update({ typed: 'tsn', cursor: { start: 3, end: 3 } });
  t.verifySame(   'III', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsn', requ.commandAssignment.getValue().name);
  t.verifySame(undefined, assign1);

  update({ typed: 'tsn ', cursor: { start: 4, end: 4 } });
  t.verifySame(   'IIIV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsn', requ.commandAssignment.getValue().name);
  t.verifySame(undefined, assign1);

  update({ typed: 'tsn x', cursor: { start: 5, end: 5 } });
  t.verifySame(   'EEEVE', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsn x', requ.commandAssignment.getArg().text);
  t.verifySame(undefined, assign1);

  update({ typed: 'tsn dif', cursor: { start: 7, end: 7 } });
  t.verifySame(   'VVVVVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsn dif', requ.commandAssignment.getValue().name);
  //t.verifySame(undefined, assign1.getArg());
  //t.verifySame(undefined, assign1.getValue());

  update({ typed: 'tsn dif ', cursor: { start: 8, end: 8 } });
  t.verifySame(   'VVVVVVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsn dif', requ.commandAssignment.getValue().name);
  //t.verifySame(undefined, assign1.getArg());
  //t.verifySame(undefined, assign1.getValue());

  update({ typed: 'tsn dif x', cursor: { start: 9, end: 9 } });
  t.verifySame(   'VVVVVVVVV', statuses);
  t.verifySame(Status.VALID, status);
  t.verifySame('tsn dif', requ.commandAssignment.getValue().name);
  t.verifySame('x', assign1.getArg().text);
  t.verifySame('x', assign1.getValue());

  update({ typed: 'tsn ext', cursor: { start: 7, end: 7 } });
  t.verifySame(   'VVVVVVV', statuses);
  t.verifySame(Status.ERROR, status);
  t.verifySame('tsn ext', requ.commandAssignment.getValue().name);
  //t.verifySame(undefined, assign1.getArg());
  //t.verifySame(undefined, assign1.getValue());
};


});
