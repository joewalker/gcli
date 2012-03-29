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
var javascript = require('gcli/types/javascript');

var test = require('test/assert');

var tempWindow;
var inputter;

exports.setup = function(options) {
  tempWindow = javascript.getGlobalObject();
  javascript.setGlobalObject(options.window);

  if (options.display) {
    inputter = options.display.inputter;
  }

  commands.setup();
};

exports.shutdown = function(options) {
  commands.shutdown();

  inputter = undefined;
  javascript.setGlobalObject(tempWindow);
  tempWindow = undefined;
};

var COMPLETES_TO = 'complete';
var KEY_UPS_TO = 'keyup';
var KEY_DOWNS_TO = 'keydown';

function check(initial, action, after, choice, cursor, expectedCursor) {
  var requisition;
  if (inputter) {
    requisition = inputter.requisition;
    inputter.setInput(initial);
  }
  else {
    requisition = new Requisition();
    requisition.update(initial);
  }

  if (cursor == null) {
    cursor = initial.length;
  }
  var assignment = requisition.getAssignmentAt(cursor);
  switch (action) {
    case COMPLETES_TO:
      requisition.complete({ start: cursor, end: cursor }, choice);
      break;

    case KEY_UPS_TO:
      assignment.increment();
      break;

    case KEY_DOWNS_TO:
      assignment.decrement();
      break;
  }

  test.is(after, requisition.toString(),
          initial + ' + ' + action + ' -> ' + after);

  if (expectedCursor != null) {
    if (inputter) {
      test.is(expectedCursor, inputter.getInputState().cursor.start,
              'Ending cursor position for \'' + initial + '\'');
    }
  }
}

exports.testComplete = function(options) {
  if (!inputter) {
    test.log('Missing display, reduced checks');
  }

  check('tsela', COMPLETES_TO, 'tselarr ', 0);
  check('tsn di', COMPLETES_TO, 'tsn dif ', 0);
  check('tsg a', COMPLETES_TO, 'tsg aaa ', 0);

  check('tsn e', COMPLETES_TO, 'tsn extend ', -5);
  check('tsn e', COMPLETES_TO, 'tsn ext ', -4);
  check('tsn e', COMPLETES_TO, 'tsn exte ', -3);
  check('tsn e', COMPLETES_TO, 'tsn exten ', -2);
  check('tsn e', COMPLETES_TO, 'tsn extend ', -1);
  check('tsn e', COMPLETES_TO, 'tsn ext ', 0);
  check('tsn e', COMPLETES_TO, 'tsn exte ', 1);
  check('tsn e', COMPLETES_TO, 'tsn exten ', 2);
  check('tsn e', COMPLETES_TO, 'tsn extend ', 3);
  check('tsn e', COMPLETES_TO, 'tsn ext ', 4);
  check('tsn e', COMPLETES_TO, 'tsn exte ', 5);
  check('tsn e', COMPLETES_TO, 'tsn exten ', 6);
  check('tsn e', COMPLETES_TO, 'tsn extend ', 7);
  check('tsn e', COMPLETES_TO, 'tsn ext ', 8);

  check('{ wind', COMPLETES_TO, '{ window', 0);
  check('{ window.docum', COMPLETES_TO, '{ window.document', 0);

  // Bug 717228: This fails under node
  if (!options.isNode) {
    check('{ window.document.titl', COMPLETES_TO, '{ window.document.title ', 0);
  }
  else {
    test.log('Running under Node. Skipping tests due to bug 717228.');
  }
};

exports.testInternalComplete = function(options) {
  // Bug 664377
  // check('tsela 1', COMPLETES_TO, 'tselarr 1', 0, 3, 8);
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
