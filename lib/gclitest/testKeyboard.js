/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var Status = require('gcli/types').Status;
var canon = require('gcli/canon');
var commands = require('gclitest/commands');
var nodetype = require('gcli/types/node');

var test = require('test/assert');


exports.setup = function() {
  commands.setup();
};

exports.shutdown = function() {
  commands.shutdown();
};

var COMPLETES_TO = 'complete';
var KEY_UPS_TO = 'keyup';
var KEY_DOWNS_TO = 'keydown';

function check(initial, action, after) {
  var requisition = new Requisition();
  requisition.update({
    typed: initial,
    cursor: { start: initial.length, end: initial.length }
  });
  var assignment = requisition.getAssignmentAt(initial.length);
  switch (action) {
    case COMPLETES_TO:
      assignment.complete();
      break;

    case KEY_UPS_TO:
      assignment.increment();
      break;

    case KEY_DOWNS_TO:
      assignment.decrement();
      break;
  }

  test.is(after, requisition.toString(), initial + ' + ' + action + ' -> ' + after);
}

exports.testComplete = function() {
  check('tsela', COMPLETES_TO, 'tselarr ');
  check('tsn di', COMPLETES_TO, 'tsn dif ');
  check('tsg a', COMPLETES_TO, 'tsg aaa ');

  check('{ wind', COMPLETES_TO, '{ window');
  check('{ window.docum', COMPLETES_TO, '{ window.document');
  check('{ window.document.titl', COMPLETES_TO, '{ window.document.title ');
};

exports.testIncrDecr = function() {
  check('tsu -70', KEY_UPS_TO, 'tsu -5');
  check('tsu -7', KEY_UPS_TO, 'tsu -5');
  check('tsu -6', KEY_UPS_TO, 'tsu -5');
  check('tsu -5', KEY_UPS_TO, 'tsu -3');
  check('tsu -4', KEY_UPS_TO, 'tsu -3');
  check('tsu -3', KEY_UPS_TO, 'tsu 0');
  check('tsu -2', KEY_UPS_TO, 'tsu 0');
  check('tsu -1', KEY_UPS_TO, 'tsu 0');
  check('tsu 0', KEY_UPS_TO, 'tsu 3');
  check('tsu 1', KEY_UPS_TO, 'tsu 3');
  check('tsu 2', KEY_UPS_TO, 'tsu 3');
  check('tsu 3', KEY_UPS_TO, 'tsu 6');
  check('tsu 4', KEY_UPS_TO, 'tsu 6');
  check('tsu 5', KEY_UPS_TO, 'tsu 6');
  check('tsu 6', KEY_UPS_TO, 'tsu 9');
  check('tsu 7', KEY_UPS_TO, 'tsu 9');
  check('tsu 8', KEY_UPS_TO, 'tsu 9');
  check('tsu 9', KEY_UPS_TO, 'tsu 10');
  check('tsu 10', KEY_UPS_TO, 'tsu 10');
  check('tsu 100', KEY_UPS_TO, 'tsu -5');

  check('tsu -70', KEY_DOWNS_TO, 'tsu 10');
  check('tsu -7', KEY_DOWNS_TO, 'tsu 10');
  check('tsu -6', KEY_DOWNS_TO, 'tsu 10');
  check('tsu -5', KEY_DOWNS_TO, 'tsu -5');
  check('tsu -4', KEY_DOWNS_TO, 'tsu -5');
  check('tsu -3', KEY_DOWNS_TO, 'tsu -5');
  check('tsu -2', KEY_DOWNS_TO, 'tsu -3');
  check('tsu -1', KEY_DOWNS_TO, 'tsu -3');
  check('tsu 0', KEY_DOWNS_TO, 'tsu -3');
  check('tsu 1', KEY_DOWNS_TO, 'tsu 0');
  check('tsu 2', KEY_DOWNS_TO, 'tsu 0');
  check('tsu 3', KEY_DOWNS_TO, 'tsu 0');
  check('tsu 4', KEY_DOWNS_TO, 'tsu 3');
  check('tsu 5', KEY_DOWNS_TO, 'tsu 3');
  check('tsu 6', KEY_DOWNS_TO, 'tsu 3');
  check('tsu 7', KEY_DOWNS_TO, 'tsu 6');
  check('tsu 8', KEY_DOWNS_TO, 'tsu 6');
  check('tsu 9', KEY_DOWNS_TO, 'tsu 6');
  check('tsu 10', KEY_DOWNS_TO, 'tsu 9');
  check('tsu 100', KEY_DOWNS_TO, 'tsu 10');

  // Bug 707007 - GCLI increment and decrement operations cycle through
  // selection options in the wrong order
  check('tselarr 1', KEY_DOWNS_TO, 'tselarr 2');
  check('tselarr 2', KEY_DOWNS_TO, 'tselarr 3');
  check('tselarr 3', KEY_DOWNS_TO, 'tselarr 1');

  check('tselarr 3', KEY_UPS_TO, 'tselarr 2');
};

});
