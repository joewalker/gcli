/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var Status = require('gcli/types').Status;
var commands = require('gclitest/commands');

var test = require('test/assert');

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
    return name === prediction.name;
  }, this);
}


exports.testBlank = function() {
  update({ typed: '', cursor: { start: 0, end: 0 } });
  test.is(        '', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(null, requ.commandAssignment.getValue());

  update({ typed: ' ', cursor: { start: 1, end: 1 } });
  test.is(        'V', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(null, requ.commandAssignment.getValue());

  update({ typed: ' ', cursor: { start: 0, end: 0 } });
  test.is(        'V', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(null, requ.commandAssignment.getValue());
};

exports.testIncompleteMultiMatch = function() {
  update({ typed: 't', cursor: { start: 1, end: 1 } });
  test.is(        'I', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.ok(assignC.getPredictions().length > 0);
  test.ok(assignC.getPredictions().length < 20); // could break ...
  verifyPredictionsContains('tsv', assignC.getPredictions());
  verifyPredictionsContains('tsr', assignC.getPredictions());
  test.is(null, requ.commandAssignment.getValue());
};

exports.testIncompleteSingleMatch = function() {
  update({ typed: 'tselar', cursor: { start: 6, end: 6 } });
  test.is(        'IIIIII', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(1, assignC.getPredictions().length);
  test.is('tselarr', assignC.getPredictions()[0].name);
  test.is(null, requ.commandAssignment.getValue());
};

exports.testTsv = function() {
  update({ typed: 'tsv', cursor: { start: 3, end: 3 } });
  test.is(        'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv ', cursor: { start: 4, end: 4 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv ', cursor: { start: 2, end: 2 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv o', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVI', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.is(2, assignC.getPredictions().length);
  test.is(commands.option1, assignC.getPredictions()[0].value);
  test.is(commands.option2, assignC.getPredictions()[1].value);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('o', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option', cursor: { start: 10, end: 10 } });
  test.is(        'VVVVIIIIII', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.is(2, assignC.getPredictions().length);
  test.is(commands.option1, assignC.getPredictions()[0].value);
  test.is(commands.option2, assignC.getPredictions()[1].value);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option', cursor: { start: 1, end: 1 } });
  test.is(        'VVVVEEEEEE', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option ', cursor: { start: 11, end: 11 } });
  test.is(        'VVVVEEEEEEV', statuses);
  test.is(Status.ERROR, status);
  test.is(1, assignC.paramIndex);
  test.is(0, assignC.getPredictions().length);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option1', cursor: { start: 11, end: 11 } });
  test.is(        'VVVVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option1', assign1.getArg().text);
  test.is(commands.option1, assign1.getValue());
  test.is(0, assignC.paramIndex);

  update({ typed: 'tsv option1 ', cursor: { start: 12, end: 12 } });
  test.is(        'VVVVVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option1', assign1.getArg().text);
  test.is(commands.option1, assign1.getValue());
  test.is(1, assignC.paramIndex);

  update({ typed: 'tsv option1 6', cursor: { start: 13, end: 13 } });
  test.is(        'VVVVVVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option1', assign1.getArg().text);
  test.is(commands.option1, assign1.getValue());
  test.is('6', assign2.getArg().text);
  test.is(6, assign2.getValue());
  test.is('number', typeof assign2.getValue());
  test.is(1, assignC.paramIndex);

  update({ typed: 'tsv option2 6', cursor: { start: 13, end: 13 } });
  test.is(        'VVVVVVVVVVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option2', assign1.getArg().text);
  test.is(commands.option2, assign1.getValue());
  test.is('6', assign2.getArg().text);
  test.is(null, assign2.getValue());
  test.is(1, assignC.paramIndex);
};

exports.testInvalid = function() {
  update({ typed: 'fred', cursor: { start: 4, end: 4 } });
  test.is(        'EEEE', statuses);
  test.is('fred', requ.commandAssignment.getArg().text);
  test.is('', requ._unassigned.getArg().text);
  test.is(-1, assignC.paramIndex);

  update({ typed: 'fred ', cursor: { start: 5, end: 5 } });
  test.is(        'EEEEV', statuses);
  test.is('fred', requ.commandAssignment.getArg().text);
  test.is('', requ._unassigned.getArg().text);
  test.is(-1, assignC.paramIndex);

  update({ typed: 'fred one', cursor: { start: 8, end: 8 } });
  test.is(        'EEEEVEEE', statuses);
  test.is('fred', requ.commandAssignment.getArg().text);
  test.is('one', requ._unassigned.getArg().text);
};

exports.testSingleString = function() {
  update({ typed: 'tsr', cursor: { start: 3, end: 3 } });
  test.is(        'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());
  test.is(undefined, assign2);

  update({ typed: 'tsr ', cursor: { start: 4, end: 4 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());
  test.is(undefined, assign2);

  update({ typed: 'tsr h', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  test.is('h', assign1.getArg().text);
  test.is('h', assign1.getValue());

  update({ typed: 'tsr "h h"', cursor: { start: 9, end: 9 } });
  test.is(        'VVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  test.is('h h', assign1.getArg().text);
  test.is('h h', assign1.getValue());

  update({ typed: 'tsr h h h', cursor: { start: 9, end: 9 } });
  test.is(        'VVVVVVVVV', statuses);
  test.is('tsr', requ.commandAssignment.getValue().name);
  test.is('h h h', assign1.getArg().text);
  test.is('h h h', assign1.getValue());
};

// BUG 664203: Add test to see that a command without mandatory param -> ERROR

exports.testSingleNumber = function() {
  update({ typed: 'tsu', cursor: { start: 3, end: 3 } });
  test.is(        'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  test.is(null, assign1.getValue());

  update({ typed: 'tsu ', cursor: { start: 4, end: 4 } });
  test.is(        'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  test.is(null, assign1.getValue());

  update({ typed: 'tsu 1', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  test.is('1', assign1.getArg().text);
  test.is(1, assign1.getValue());
  test.is('number', typeof assign1.getValue());

  update({ typed: 'tsu x', cursor: { start: 5, end: 5 } });
  test.is(        'VVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  test.is('x', assign1.getArg().text);
  test.is(null, assign1.getValue());
};

exports.testNestedCommand = function() {
  update({ typed: 'tsn', cursor: { start: 3, end: 3 } });
  test.is(        'III', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn', requ.commandAssignment.getValue().name);
  test.is(undefined, assign1);

  update({ typed: 'tsn ', cursor: { start: 4, end: 4 } });
  test.is(        'IIIV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn', requ.commandAssignment.getValue().name);
  test.is(undefined, assign1);

  update({ typed: 'tsn x', cursor: { start: 5, end: 5 } });
  test.is(        'EEEVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn x', requ.commandAssignment.getArg().text);
  test.is(undefined, assign1);

  update({ typed: 'tsn dif', cursor: { start: 7, end: 7 } });
  test.is(        'VVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn dif', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());

  update({ typed: 'tsn dif ', cursor: { start: 8, end: 8 } });
  test.is(        'VVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn dif', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());

  update({ typed: 'tsn dif x', cursor: { start: 9, end: 9 } });
  test.is(        'VVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsn dif', requ.commandAssignment.getValue().name);
  test.is('x', assign1.getArg().text);
  test.is('x', assign1.getValue());

  update({ typed: 'tsn ext', cursor: { start: 7, end: 7 } });
  test.is(        'VVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn ext', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());
};


});
