/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var assert = require('test/assert');
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

exports.testNode = function(options) {
  helpers.audit([
    {
      setup: 'tse ',
      check: {
        input:  'tse ',
        hints:      '<node> [options]',
        markup: 'VVVV',
        cursor: 4,
        current: 'node',
        status: 'ERROR',
        args: {
          command: { name: 'tse' },
          node: { status: 'INCOMPLETE', message: '' },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      }
    },
    {
      setup: 'tse :',
      check: {
        input:  'tse :',
        hints:       ' [options]',
        markup: 'VVVVE',
        cursor: 5,
        current: 'node',
        status: 'ERROR',
        args: {
          command: { name: 'tse' },
          node: {
            arg: ' :',
            status: 'ERROR',
            message: 'Syntax error in CSS query'
          },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      }
    },
    {
      setup: 'tse #',
      check: {
        input:  'tse #',
        hints:       ' [options]',
        markup: 'VVVVE',
        cursor: 5,
        current: 'node',
        status: 'ERROR',
        args: {
          command: { name: 'tse' },
          node: {
            value: undefined,
            arg: ' #',
            status: 'ERROR',
            message: 'Syntax error in CSS query'
          },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      }
    },
    {
      setup: 'tse .',
      check: {
        input:  'tse .',
        hints:       ' [options]',
        markup: 'VVVVE',
        cursor: 5,
        current: 'node',
        status: 'ERROR',
        args: {
          command: { name: 'tse' },
          node: {
            value: undefined,
            arg: ' .',
            status: 'ERROR',
            message: 'Syntax error in CSS query'
          },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      }
    },
    {
      setup: 'tse *',
      check: {
        input:  'tse *',
        hints:       ' [options]',
        markup: 'VVVVE',
        cursor: 5,
        current: 'node',
        status: 'ERROR',
        args: {
          command: { name: 'tse' },
          node: {
            value: undefined,
            arg: ' *',
            status: 'ERROR'
            // message: 'Too many matches (128)'
          },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      }
    }
  ]);
};

exports.testNodeDom = function(options) {
  if (options.isJsdom) {
    assert.log('skipping node tests because jsdom');
    return;
  }

  var requisition = options.display.requisition;

  helpers.audit([
    {
      setup: 'tse :root',
      check: {
        input:  'tse :root',
        hints:           ' [options]',
        markup: 'VVVVVVVVV',
        cursor: 9,
        current: 'node',
        status: 'VALID',
        args: {
          command: { name: 'tse' },
          node: { arg: ' :root', status: 'VALID' },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      }
    },
    {
      setup: 'tse :root ',
      check: {
        input:  'tse :root ',
        hints:            '[options]',
        markup: 'VVVVVVVVVV',
        cursor: 10,
        current: 'node',
        status: 'VALID',
        args: {
          command: { name: 'tse' },
          node: { arg: ' :root ', status: 'VALID' },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      },
      post: function() {
        assert.is(requisition.getAssignment('node').value.tagName,
                  'HTML',
                  'root id');
      }
    },
    {
      setup: 'tse #gcli-nomatch',
      check: {
        input:  'tse #gcli-nomatch',
        hints:                   ' [options]',
        markup: 'VVVVIIIIIIIIIIIII',
        cursor: 17,
        current: 'node',
        status: 'ERROR',
        args: {
          command: { name: 'tse' },
          node: {
            value: undefined,
            arg: ' #gcli-nomatch',
            status: 'INCOMPLETE',
            message: 'No matches'
          },
          nodes: { status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      }
    }
  ]);
};

exports.testNodes = function(options) {
  if (options.isJsdom) {
    assert.log('skipping node tests because jsdom');
    return;
  }

  var requisition = options.display.requisition;

  helpers.audit([
    {
      setup: 'tse :root --nodes *',
      check: {
        input:  'tse :root --nodes *',
        hints:                       ' [options]',
        markup: 'VVVVVVVVVVVVVVVVVVV',
        current: 'nodes',
        status: 'VALID',
        args: {
          command: { name: 'tse' },
          node: { arg: ' :root', status: 'VALID' },
          nodes: { arg: ' --nodes *', status: 'VALID' },
          nodes2: { status: 'VALID' }
        }
      },
      post: function() {
        assert.is(requisition.getAssignment('node').value.tagName,
                  'HTML',
                  '#gcli-input id');
      }
    },
    {
      setup: 'tse :root --nodes2 div',
      check: {
        input:  'tse :root --nodes2 div',
        hints:                       ' [options]',
        markup: 'VVVVVVVVVVVVVVVVVVVVVV',
        cursor: 22,
        current: 'nodes2',
        status: 'VALID',
        args: {
          command: { name: 'tse' },
          node: { arg: ' :root', status: 'VALID' },
          nodes: { status: 'VALID' },
          nodes2: { arg: ' --nodes2 div', status: 'VALID' }
        }
      },
      post: function() {
        assert.is(requisition.getAssignment('node').value.tagName,
                  'HTML',
                  'root id');
      }
    },
    {
      setup: 'tse --nodes ffff',
      check: {
        input:  'tse --nodes ffff',
        hints:                  ' <node> [options]',
        markup: 'VVVVIIIIIIIVIIII',
        cursor: 16,
        current: 'nodes',
        status: 'ERROR',
        outputState: 'false:default',
        tooltipState: 'true:isError',
        args: {
          command: { name: 'tse' },
          node: {
            value: undefined,
            arg: '',
            status: 'INCOMPLETE',
            message: ''
          },
          nodes: {
            value: undefined,
            arg: ' --nodes ffff',
            status: 'INCOMPLETE',
            message: 'No matches'
          },
          nodes2: { arg: '', status: 'VALID', message: '' }
        }
      },
      post: function() {
        /*
        assert.is(requisition.getAssignment('nodes2').value.constructor.name,
                  'NodeList',
                  '#gcli-input id');
        */
      }
    },
    {
      setup: 'tse --nodes2 ffff',
      check: {
        input:  'tse --nodes2 ffff',
        hints:                   ' <node> [options]',
        markup: 'VVVVVVVVVVVVVVVVV',
        cursor: 17,
        current: 'nodes2',
        status: 'ERROR',
        outputState: 'false:default',
        tooltipState: 'false:default',
        args: {
          command: { name: 'tse' },
          node: {
            value: undefined,
            arg: '',
            status: 'INCOMPLETE',
            message: ''
          },
          nodes: { arg: '', status: 'VALID', message: '' },
          nodes2: { arg: ' --nodes2 ffff', status: 'VALID', message: '' }
        }
      },
      post: function() {
        /*
        assert.is(requisition.getAssignment('nodes').value.constructor.name,
                  'NodeList',
                  '#gcli-input id');
        assert.is(requisition.getAssignment('nodes2').value.constructor.name,
                  'NodeList',
                  '#gcli-input id');
        */
      }
    },
  ]);
};


});
