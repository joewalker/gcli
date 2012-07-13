/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var test = require('test/assert');
var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testBasic = function(options) {
  var requisition = options.display.requisition;

  helpers.setInput('tsu 2 extra');
  helpers.check({
    args: {
      num: { value: 2, type: 'Argument' }
    }
  });
  test.is(requisition._unassigned.length, 1, 'single unassigned: tsu 2 extra');
  test.is(requisition._unassigned[0].param.type.isIncompleteName, false,
          'unassigned.isIncompleteName: tsu 2 extra');

  helpers.setInput('tsu');
  helpers.check({
    args: {
      num: { value: undefined, type: 'BlankArgument' }
    }
  });

  helpers.setInput('tsg');
  helpers.check({
    args: {
      solo: { type: 'BlankArgument' },
      txt1: { type: 'BlankArgument' },
      bool: { type: 'BlankArgument' },
      txt2: { type: 'BlankArgument' },
      num: { type: 'BlankArgument' }
    }
  });
};

exports.testCompleted = function(options) {
  helpers.setInput('tsela');
  helpers.pressTab();
  helpers.check({
    args: {
      command: { name: 'tselarr', type: 'Argument' },
      num: { type: 'Argument' },
      arr: { type: 'ArrayArgument' },
    }
  });

  helpers.setInput('tsn dif ');
  helpers.check({
    input:  'tsn dif ',
    markup: 'VVVVVVVV',
    cursor: 8,
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ '<text>' ],
    args: {
      command: { name: 'tsn dif', type: 'MergedArgument' },
      text: { type: 'BlankArgument', status: 'INCOMPLETE' }
    }
  });

  helpers.setInput('tsn di');
  helpers.pressTab();
  helpers.check({
    input:  'tsn dif ',
    markup: 'VVVVVVVV',
    cursor: 8,
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ '<text>' ],
    args: {
      command: { name: 'tsn dif', type: 'Argument' },
      text: { type: 'Argument', status: 'INCOMPLETE' }
    }
  });

  // The above 2 tests take different routes to 'tsn dif '. The results should
  // be similar. The difference is in args.command.type.

  helpers.setInput('tsg -');
  helpers.check({
    input:  'tsg -',
    markup: 'VVVVI',
    cursor: 5,
    directTabText: '-txt1',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      solo: { value: undefined, status: 'INCOMPLETE' },
      txt1: { value: undefined, status: 'VALID' },
      bool: { value: undefined, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });

  helpers.pressTab();
  helpers.check({
    input:  'tsg --txt1 ',
    markup: 'VVVVIIIIIIV',
    cursor: 11,
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ], // Bug 770830: '<txt1>', ' <solo>'
    args: {
      solo: { value: undefined, status: 'INCOMPLETE' },
      txt1: { value: undefined, status: 'INCOMPLETE' },
      bool: { value: undefined, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tsg --txt1 fred');
  helpers.check({
    input:  'tsg --txt1 fred',
    markup: 'VVVVVVVVVVVVVVV',
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ], // Bug 770830: ' <solo>'
    args: {
      solo: { value: undefined, status: 'INCOMPLETE' },
      txt1: { value: 'fred', status: 'VALID' },
      bool: { value: undefined, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tscook key value --path path --');
  helpers.check({
    input:  'tscook key value --path path --',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVII',
    directTabText: 'domain',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      key: { value: 'key', status: 'VALID' },
      value: { value: 'value', status: 'VALID' },
      path: { value: 'path', status: 'VALID' },
      domain: { value: undefined, status: 'VALID' },
      secure: { value: false, status: 'VALID' }
    }
  });

  helpers.setInput('tscook key value --path path --domain domain --');
  helpers.check({
    input:  'tscook key value --path path --domain domain --',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVII',
    directTabText: 'secure',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      key: { value: 'key', status: 'VALID' },
      value: { value: 'value', status: 'VALID' },
      path: { value: 'path', status: 'VALID' },
      domain: { value: 'domain', status: 'VALID' },
      secure: { value: false, status: 'VALID' }
    }
  });
};

exports.testCase = function(options) {
  helpers.setInput('tsg AA');
  helpers.check({
    input:  'tsg AA',
    markup: 'VVVVII',
    directTabText: '',
    arrowTabText: 'aaa',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      solo: { value: undefined, text: 'AA', status: 'INCOMPLETE' },
      txt1: { value: undefined, status: 'VALID' },
      bool: { value: undefined, status: 'VALID' },
      txt2: { value: undefined, status: 'VALID' },
      num: { value: undefined, status: 'VALID' }
    }
  });
};

exports.testIncomplete = function(options) {
  var requisition = options.display.requisition;

  helpers.setInput('tsm a a -');
  helpers.check({
    args: {
      abc: { value: 'a', type: 'Argument' },
      txt: { value: 'a', type: 'Argument' },
      num: { value: undefined, arg: ' -', type: 'Argument', status: 'INCOMPLETE' }
    }
  });

  helpers.setInput('tsg -');
  helpers.check({
    args: {
      solo: { type: 'BlankArgument' },
      txt1: { type: 'BlankArgument' },
      bool: { type: 'BlankArgument' },
      txt2: { type: 'BlankArgument' },
      num: { type: 'BlankArgument' }
    }
  });
  test.is(requisition._unassigned[0], requisition.getAssignmentAt(5),
          'unassigned -');
  test.is(requisition._unassigned.length, 1, 'single unassigned - tsg -');
  test.is(requisition._unassigned[0].param.type.isIncompleteName, true,
          'unassigned.isIncompleteName: tsg -');
};

exports.testHidden = function(options) {
  helpers.setInput('tshidde');
  helpers.check({
    input:  'tshidde',
    markup: 'EEEEEEE',
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
  });

  helpers.setInput('tshidden');
  helpers.check({
    input:  'tshidden',
    markup: 'VVVVVVVV',
    directTabText: '',
    arrowTabText: '',
    status: 'VALID',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden');
  helpers.check({
    input:  'tshidden',
    markup: 'VVVVVVVV',
    directTabText: '',
    arrowTabText: '',
    status: 'VALID',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --vis');
  helpers.check({
    input:  'tshidden --vis',
    markup: 'VVVVVVVVVIIIII',
    directTabText: 'ible',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisiblestrin');
  helpers.check({
    input:  'tshidden --invisiblestrin',
    markup: 'VVVVVVVVVEEEEEEEEEEEEEEEE',
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisiblestring');
  helpers.check({
    input:  'tshidden --invisiblestring',
    markup: 'VVVVVVVVVIIIIIIIIIIIIIIIII',
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'INCOMPLETE' },
      invisibleboolean: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisiblestring x');
  helpers.check({
    input:  'tshidden --invisiblestring x',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV',
    directTabText: '',
    arrowTabText: '',
    status: 'VALID',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: 'x', status: 'VALID' },
      invisibleboolean: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisibleboolea');
  helpers.check({
    input:  'tshidden --invisibleboolea',
    markup: 'VVVVVVVVVEEEEEEEEEEEEEEEEE',
    directTabText: '',
    arrowTabText: '',
    status: 'ERROR',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: undefined, status: 'VALID' }
    }
  });

  helpers.setInput('tshidden --invisibleboolean');
  helpers.check({
    input:  'tshidden --invisibleboolean',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVV',
    directTabText: '',
    arrowTabText: '',
    status: 'VALID',
    emptyParameters: [ ],
    args: {
      visible: { value: undefined, status: 'VALID' },
      invisiblestring: { value: undefined, status: 'VALID' },
      invisibleboolean: { value: true, status: 'VALID' }
    }
  });
};

});
