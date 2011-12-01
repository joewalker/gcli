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

var actualExec;
var actualOutput;

exports.setup = function() {
  commands.setup();
  commands.commandExec.add(onCommandExec);
  canon.commandOutputManager.addListener(onCommandOutput);
};

exports.shutdown = function() {
  commands.shutdown();
  commands.commandExec.remove(onCommandExec);
  canon.commandOutputManager.removeListener(onCommandOutput);
};

function onCommandExec(ev) {
  actualExec = ev;
}

function onCommandOutput(ev) {
  actualOutput = ev.output;
}

function exec(command, expectedArgs) {
  var environment = {};

  var requisition = new Requisition(environment);
  var reply = requisition.exec({ typed: command });

  test.is(command.indexOf(actualExec.command.name), 0, 'Command name: ' + command);

  if (reply !== true) {
    test.ok(false, 'reply = false for command: ' + command);
  }

  if (expectedArgs == null) {
    test.ok(false, 'expectedArgs == null for ' + command);
    return;
  }
  if (actualExec.args == null) {
    test.ok(false, 'actualExec.args == null for ' + command);
    return;
  }

  test.is(Object.keys(expectedArgs).length, Object.keys(actualExec.args).length,
          'Arg count: ' + command);
  Object.keys(expectedArgs).forEach(function(arg) {
    var expectedArg = expectedArgs[arg];
    var actualArg = actualExec.args[arg];

    if (Array.isArray(expectedArg)) {
      if (!Array.isArray(actualArg)) {
        test.ok(false, 'actual is not an array. ' + command + '/' + arg);
        return;
      }

      test.is(expectedArg.length, actualArg.length,
              'Array length: ' + command + '/' + arg);
      for (var i = 0; i < expectedArg.length; i++) {
        test.is(expectedArg[i], actualArg[i],
                'Member: "' + command + '/' + arg + '/' + i);
      }
    }
    else {
      test.is(expectedArg, actualArg, 'Command: "' + command + '" arg: ' + arg);
    }
  });

  test.is(environment, actualExec.context.environment, 'Environment');

  test.is(false, actualOutput.error, 'output error is false');
  test.is(command, actualOutput.typed, 'command is typed');
  test.ok(typeof actualOutput.canonical === 'string', 'canonical exists');

  test.is(actualExec.args, actualOutput.args, 'actualExec.args is actualOutput.args');
}


exports.testExec = function() {
  exec('tss', {});

  // exec('tsv option1 10', { optionType: commands.option1, optionValue: '10' });
  // exec('tsv option2 10', { optionType: commands.option1, optionValue: 10 });

  exec('tsr fred', { text: 'fred' });
  // exec('tsr --text fred', { text: 'fred' });
  exec('tsr fred bloggs', { text: 'fred bloggs' });
  exec('tsr "fred bloggs"', { text: 'fred bloggs' });
  // exec('tsr --text "fred bloggs"', { text: 'fred bloggs' });

  exec('tsb', { toggle: false });
  exec('tsb --toggle', { toggle: true });

  exec('tsu 10', { num: 10 });
  exec('tsu --num 10', { num: 10 });

  // The answer to this should be 2
  exec('tsj { 1 + 1 }', { javascript: '1 + 1' });

  var origDoc = nodetype.getDocument();
  nodetype.setDocument(mockDoc);
  exec('tse :root', { node: mockBody });
  nodetype.setDocument(origDoc);

  exec('tsn dif fred', { text: 'fred' });
  exec('tsn exten fred', { text: 'fred' });
  exec('tsn extend fred', { text: 'fred' });

  exec('tselarr 1', { num: '1', arr: [ ] });
  exec('tselarr 1 a', { num: '1', arr: [ 'a' ] });
  exec('tselarr 1 a b', { num: '1', arr: [ 'a', 'b' ] });

  exec('tsm a 10 10', { abc: 'a', txt: '10', num: 10 });
  // exec('tsg a', { solo: 'a', txt1: null, boolean1: false, txt2: 'd', num2: 42 });
};

var mockBody = {
  style: {}
};

var mockDoc = {
  querySelectorAll: function(css) {
    if (css === ':root') {
      return {
        length: 1,
        item: function(i) {
          return mockBody;
        }
      };
    }
    throw new Error('mockDoc.querySelectorAll(\'' + css + '\') error');
  }
};


});
