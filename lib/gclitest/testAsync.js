/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');
var canon = require('gcli/canon');
var Q = require('util/promise');
var assert = require('test/assert');


exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testBasic = function(options) {
  var getData = assert.checkCalled(function() {
    var deferred = Q.defer();

    var resolve = assert.checkCalled(function() {
      deferred.resolve([
        'Shalom', 'Namasté', 'Hallo', 'Dydd-da',
        'Chào', 'Hej', 'Saluton', 'Sawubona'
      ]);
    });

    setTimeout(resolve, 500);
    return deferred.promise;
  });

  var tsslow = {
    name: 'tsslow',
    params: [
      {
        name: 'hello',
        type: {
          name: 'selection',
          data: getData
        }
      }
    ],
    exec: function(args, context) {
      return 'Test completed';
    }
  };

  canon.addCommand(tsslow);

  helpers.audit([
    {
      setup:    'tsslo',
      check: {
        input:  'tsslo',
        hints:       'w',
        markup: 'IIIII',
        cursor: 5,
        current: '__command',
        status: 'ERROR',
        predictions: ['tsslow'],
        unassigned: [ ]
      }
    },
    {
      setup:    'tsslo<TAB>',
      check: {
        input:  'tsslow ',
        hints:         'Shalom',
        markup: 'VVVVVVV',
        cursor: 7,
        current: 'hello',
        status: 'ERROR',
        predictions: [
          'Shalom', 'Namasté', 'Hallo', 'Dydd-da', 'Chào', 'Hej',
          'Saluton', 'Sawubona'
        ],
        unassigned: [ ],
        tooltipState: 'true:importantFieldFlag',
        args: {
          command: { name: 'tsslow' },
          hello: {
            value: undefined,
            arg: '',
            status: 'INCOMPLETE',
            message: ''
          },
        }
      }
    },
    {
      setup:    'tsslow S',
      check: {
        input:  'tsslow S',
        hints:          'halom',
        markup: 'VVVVVVVI',
        cursor: 8,
        current: 'hello',
        status: 'ERROR',
        predictions: [ 'Shalom', 'Saluton', 'Sawubona', 'Namasté' ],
        unassigned: [ ],
        tooltipState: 'true:importantFieldFlag',
        args: {
          command: { name: 'tsslow' },
          hello: {
            value: undefined,
            arg: ' S',
            status: 'INCOMPLETE',
            message: ''
          },
        }
      }
    },
    {
      setup:    'tsslow S<TAB>',
      check: {
        input:  'tsslow Shalom ',
        hints:                '',
        markup: 'VVVVVVVVVVVVVV',
        cursor: 14,
        current: 'hello',
        status: 'VALID',
        predictions: [ 'Shalom' ],
        unassigned: [ ],
        tooltipState: 'true:importantFieldFlag',
        args: {
          command: { name: 'tsslow' },
          hello: {
            value: 'Shalom',
            arg: ' Shalom ',
            status: 'VALID',
            message: ''
          },
        }
      },
      post: function() {
        canon.removeCommand(tsslow);
      }
    },
    {
      setup:    'tsslow ',
      check: {
        input:  'tsslow ',
        markup: 'EEEEEEV',
        cursor: 7,
        status: 'ERROR'
      }
    }
  ]);
};


});
