/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

exports.testActivate = function(options) {
  if (!options.display) {
    assert.log('No display. Skipping activate tests');
    return;
  }

  helpers.audit([
    {
      setup: '',
      check: {
        hints: ''
      }
    },
    {
      setup: ' ',
      check: {
        hints: ''
      }
    },
    {
      setup: 'tsr',
      check: {
        hints: ' <text>'
      }
    },
    {
      setup: 'tsr ',
      check: {
        hints: '<text>'
      }
    },
    {
      setup: 'tsr b',
      check: {
        hints: ''
      }
    },
    {
      setup: 'tsb',
      check: {
        hints: ' [toggle]'
      }
    },
    {
      setup: 'tsm',
      check: {
        hints: ' <abc> <txt> <num>'
      }
    },
    {
      setup: 'tsm ',
      check: {
        hints: 'a <txt> <num>'
      }
    },
    {
      setup: 'tsm a',
      check: {
        hints: ' <txt> <num>'
      }
    },
    {
      setup: 'tsm a ',
      check: {
        hints: '<txt> <num>'
      }
    },
    {
      setup: 'tsm a  ',
      check: {
        hints: '<txt> <num>'
      }
    },
    {
      setup: 'tsm a  d',
      check: {
        hints: ' <num>'
      }
    },
    {
      setup: 'tsm a "d d"',
      check: {
        hints: ' <num>'
      }
    },
    {
      setup: 'tsm a "d ',
      check: {
        hints: ' <num>'
      }
    },
    {
      setup: 'tsm a "d d" ',
      check: {
        hints: '<num>'
      }
    },
    {
      setup: 'tsm a "d d ',
      check: {
        hints: ' <num>'
      }
    },
    {
      setup: 'tsm d r',
      check: {
        hints: ' <num>'
      }
    },
    {
      setup: 'tsm a d ',
      check: {
        hints: '<num>'
      }
    },
    {
      setup: 'tsm a d 4',
      check: {
        hints: ''
      }
    },
    {
      setup: 'tsg',
      check: {
        hints: ' <solo> [options]'
      }
    },
    {
      setup: 'tsg ',
      check: {
        hints: 'aaa [options]'
      }
    },
    {
      setup: 'tsg a',
      check: {
        hints: 'aa [options]'
      }
    },
    {
      setup: 'tsg b',
      check: {
        hints: 'bb [options]'
      }
    },
    {
      setup: 'tsg d',
      check: {
        hints: ' [options] -> ccc'
      }
    },
    {
      setup: 'tsg aa',
      check: {
        hints: 'a [options]'
      }
    },
    {
      setup: 'tsg aaa',
      check: {
        hints: ' [options]'
      }
    },
    {
      setup: 'tsg aaa ',
      check: {
        hints: '[options]'
      }
    },
    {
      setup: 'tsg aaa d',
      check: {
        hints: ' [options]'
      }
    },
    {
      setup: 'tsg aaa dddddd',
      check: {
        hints: ' [options]'
      }
    },
    {
      setup: 'tsg aaa dddddd ',
      check: {
        hints: '[options]'
      }
    },
    {
      setup: 'tsg aaa "d',
      check: {
        hints: ' [options]'
      }
    },
    {
      setup: 'tsg aaa "d d',
      check: {
        hints: ' [options]'
      }
    },
    {
      setup: 'tsg aaa "d d"',
      check: {
        hints: ' [options]'
      }
    },
    {
      setup: 'tsn ex ',
      check: {
        hints: ''
      }
    },
    {
      setup: 'selarr',
      check: {
        hints: ' -> tselarr'
      }
    },
    {
      setup: 'tselar 1',
      check: {
        hints: ''
      }
    },
    {
      name: 'tselar |1',
      setup: function() {
        helpers.setInput('tselar 1', 7);
      },
      check: {
        hints: ''
      }
    },
    {
      name: 'tselar| 1',
      setup: function() {
        helpers.setInput('tselar 1', 6);
      },
      check: {
        hints: ' -> tselarr'
      }
    },
    {
      name: 'tsela|r 1',
      setup: function() {
        helpers.setInput('tselar 1', 5);
      },
      check: {
        hints: ' -> tselarr'
      }
    },
  ]);
};

exports.testLong = function(options) {
  helpers.audit([
    {
      setup: 'tslong --sel',
      check: {
        input:  'tslong --sel',
        hints:              ' <selection> <msg> [options]',
        markup: 'VVVVVVVIIIII'
      }
    },
    {
      setup: 'tslong --sel<TAB>',
      check: {
        input:  'tslong --sel ',
        hints:               'space <msg> [options]',
        markup: 'VVVVVVVIIIIIV'
      }
    },
    {
      setup: 'tslong --sel ',
      check: {
        input:  'tslong --sel ',
        hints:               'space <msg> [options]',
        markup: 'VVVVVVVIIIIIV'
      }
    },
    {
      setup: 'tslong --sel s',
      check: {
        input:  'tslong --sel s',
        hints:                'pace <msg> [options]',
        markup: 'VVVVVVVIIIIIVI'
      }
    },
    {
      setup: 'tslong --num ',
      check: {
        input:  'tslong --num ',
        hints:               '<number> <msg> [options]',
        markup: 'VVVVVVVIIIIIV'
      }
    },
    {
      setup: 'tslong --num 42',
      check: {
        input:  'tslong --num 42',
        hints:                 ' <msg> [options]',
        markup: 'VVVVVVVVVVVVVVV'
      }
    },
    {
      setup: 'tslong --num 42 ',
      check: {
        input:  'tslong --num 42 ',
        hints:                  '<msg> [options]',
        markup: 'VVVVVVVVVVVVVVVV'
      }
    },
    {
      setup: 'tslong --num 42 --se',
      check: {
        input:  'tslong --num 42 --se',
        hints:                      'l <msg> [options]',
        markup: 'VVVVVVVVVVVVVVVVIIII'
      }
    },
    {
      setup:    'tslong --num 42 --se<TAB>',
      check: {
        input:  'tslong --num 42 --sel ',
        hints:                        'space <msg> [options]',
        markup: 'VVVVVVVVVVVVVVVVIIIIIV'
      }
    },
    {
      setup: 'tslong --num 42 --se<TAB><TAB>',
      check: {
        input:  'tslong --num 42 --sel space ',
        hints:                              '<msg> [options]',
        markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV'
      }
    },
    {
      setup: 'tslong --num 42 --sel ',
      check: {
        input:  'tslong --num 42 --sel ',
        hints:                        'space <msg> [options]',
        markup: 'VVVVVVVVVVVVVVVVIIIIIV'
      }
    },
    {
      setup: 'tslong --num 42 --sel space ',
      check: {
        input:  'tslong --num 42 --sel space ',
        hints:                              '<msg> [options]',
        markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV'
      }
    }
  ]);
};

exports.testNoTab = function(options) {
  helpers.audit([
    {
      setup: 'tss<TAB>',
      check: {
        input:  'tss ',
        markup: 'VVVV',
        hints: ''
      }
    },
    {
      setup: 'tss<TAB><TAB>',
      check: {
        input:  'tss ',
        markup: 'VVVV',
        hints: ''
      }
    },
    {
      setup: 'xxxx',
      check: {
        input:  'xxxx',
        markup: 'EEEE',
        hints: ''
      }
    },
    {
      name: '<TAB>',
      setup: function() {
        // Doing it this way avoids clearing the input buffer
        return helpers.pressTab();
      },
      check: {
        input:  'xxxx',
        markup: 'EEEE',
        hints: ''
      }
    }
  ]);
};

exports.testOutstanding = function(options) {
  // See bug 779800
  /*
  helpers.audit([
    {
      setup: 'tsg --txt1 ddd ',
      check: {
        input:  'tsg --txt1 ddd ',
        hints:                 'aaa [options]',
        markup: 'VVVVVVVVVVVVVVV'
      }
    },
  ]);
  */
};

exports.testCompleteIntoOptional = function(options) {
  // From bug 779816
  helpers.audit([
    {
      setup: 'tso ',
      check: {
        typed:  'tso ',
        hints:      '[text]',
        markup: 'VVVV',
        status: 'VALID'
      }
    },
    {
      setup: 'tso<TAB>',
      check: {
        typed:  'tso ',
        hints:      '[text]',
        markup: 'VVVV',
        status: 'VALID'
      }
    }
  ]);
};

exports.testSpaceComplete = function(options) {
  helpers.audit([
    {
      setup: 'tslong --sel2 wit',
      check: {
        input:  'tslong --sel2 wit',
        hints:                   'h space <msg> [options]',
        markup: 'VVVVVVVIIIIIIVIII',
        cursor: 17,
        current: 'sel2',
        status: 'ERROR',
        tooltipState: 'true:importantFieldFlag',
        args: {
          command: { name: 'tslong' },
          msg: { status: 'INCOMPLETE', message: '' },
          num: { status: 'VALID' },
          sel: { status: 'VALID' },
          bool: { value: false, status: 'VALID' },
          num2: { status: 'VALID' },
          bool2: { value: false, status: 'VALID' },
          sel2: { arg: ' --sel2 wit', status: 'INCOMPLETE' }
        }
      }
    },
    {
      setup: 'tslong --sel2 wit<TAB>',
      check: {
        input:  'tslong --sel2 \'with space\' ',
        hints:                             '<msg> [options]',
        markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVV',
        cursor: 27,
        current: 'sel2',
        status: 'ERROR',
        tooltipState: 'true:importantFieldFlag',
        args: {
          command: { name: 'tslong' },
          msg: { status: 'INCOMPLETE', message: '' },
          num: { status: 'VALID' },
          sel: { status: 'VALID' },
          bool: { value: false,status: 'VALID' },
          num2: { status: 'VALID' },
          bool2: { value: false,status: 'VALID' },
          sel2: {
            value: 'with space',
            arg: ' --sel2 \'with space\' ',
            status: 'VALID'
          }
        }
      }
    }
  ]);
};


});
