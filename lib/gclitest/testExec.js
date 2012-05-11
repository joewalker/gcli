/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var canon = require('gcli/canon');
var mockCommands = require('gclitest/mockCommands');
var nodetype = require('gcli/types/node');

var test = require('test/assert');

var actualExec;
var actualOutput;
var hideExec = false;

exports.setup = function() {
  mockCommands.setup();
  mockCommands.onCommandExec.add(commandExeced);
  canon.commandOutputManager.onOutput.add(commandOutputed);
};

exports.shutdown = function() {
  mockCommands.shutdown();
  mockCommands.onCommandExec.remove(commandExeced);
  canon.commandOutputManager.onOutput.remove(commandOutputed);
};

function commandExeced(ev) {
  actualExec = ev;
}

function commandOutputed(ev) {
  actualOutput = ev.output;
}

function exec(command, expectedArgs) {
  var environment = {};

  var requisition = new Requisition(environment);
  var outputObject = requisition.exec({ typed: command, hidden: hideExec });

  test.is(command.indexOf(actualExec.command.name), 0, 'Command name: ' + command);

  test.is(command, outputObject.typed, 'outputObject.command for: ' + command);
  test.ok(outputObject.completed, 'outputObject.completed false for: ' + command);

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

  if (!hideExec) {
    test.is(false, actualOutput.error, 'output error is false');
    test.is(command, actualOutput.typed, 'command is typed');
    test.ok(typeof actualOutput.canonical === 'string', 'canonical exists');

    test.is(actualExec.args, actualOutput.args, 'actualExec.args is actualOutput.args');
  }
}


exports.testExec = function(options) {
  hideExec = options.hideExec;

  exec('tss', {});

  // Bug 707008 - GCLI deferred types don't work properly
  exec('tsv option1 10', { optionType: mockCommands.option1, optionValue: '10' });
  exec('tsv option2 10', { optionType: mockCommands.option2, optionValue: 10 });

  exec('tsr fred', { text: 'fred' });
  exec('tsr fred bloggs', { text: 'fred bloggs' });
  exec('tsr "fred bloggs"', { text: 'fred bloggs' });

  exec('tsb', { toggle: false });
  exec('tsb --toggle', { toggle: true });

  exec('tsu 10', { num: 10 });
  exec('tsu --num 10', { num: 10 });

  // Bug 704829 - Enable GCLI Javascript parameters
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

  // Bug 707009 - GCLI doesn't always fill in default parameters properly
  exec('tsg aaa', { solo: 'aaa', txt1: null, bool: false, txt2: 'd', num: 42 });
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
