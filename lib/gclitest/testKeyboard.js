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

function complete(initial, after) {
  var requisition = new Requisition();
  requisition.update({
    typed: initial,
    cursor: { start: initial.length, end: initial.length }
  });
  var assignment = requisition.getAssignmentAt(initial.length);
  assignment.complete();

  test.is(after, requisition.toString(), 'complete ' + initial);
}

exports.testComplete = function() {
  complete('tsela', 'tselarr ');
  complete('tsn di', 'tsn dif ');
  complete('tsg a', 'tsg aaa ');

  complete('{ wind', '{ window');
  complete('{ window.docum', '{ window.document');
  complete('{ window.document.titl', '{ window.document.title ');
};


});
