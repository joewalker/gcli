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


var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');

var assert = require('test/assert');

exports.setup = function(options) {
  mockCommands.setup(options);
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown(options);
  helpers.shutdown(options);
};

exports.testBlank = function(options) {
  var requisition = options.display.requisition;

  helpers.setInput('');
  helpers.check({
    input:  '',
    hints:  '',
    markup: '',
    cursor: 0,
    current: '__command',
    status: 'ERROR'
  });

  assert.is(undefined, requisition.commandAssignment.value);

  helpers.setInput(' ');
  helpers.check({
    input:  ' ',
    hints:   '',
    markup: 'V',
    cursor: 1,
    current: '__command',
    status: 'ERROR'
  });

  assert.is(undefined, requisition.commandAssignment.value);

  helpers.setInput(' ', 0);
  helpers.check({
    input:  ' ',
    hints:   '',
    markup: 'V',
    cursor: 0,
    current: '__command',
    status: 'ERROR'
  });

  assert.is(undefined, requisition.commandAssignment.value);
};

exports.testIncompleteMultiMatch = function() {
  helpers.setInput('t');
  helpers.check({
    input:  't',
    hints:   'est',
    markup: 'I',
    cursor: 1,
    current: '__command',
    status: 'ERROR',
    predictionsContains: [ 'tsb' ]
  });

  helpers.setInput('tsn ex');
  helpers.check({
    input:  'tsn ex',
    hints:        't',
    markup: 'IIIVII',
    cursor: 6,
    current: '__command',
    status: 'ERROR',
    predictionsContains: [ 'tsn ext', 'tsn exte', 'tsn exten', 'tsn extend' ]
  });
};

exports.testIncompleteSingleMatch = function() {
  helpers.setInput('tselar');
  helpers.check({
    input:  'tselar',
    hints:        'r',
    markup: 'IIIIII',
    cursor: 6,
    current: '__command',
    status: 'ERROR',
    predictions: [ 'tselarr' ],
    unassigned: [ ]
  });
};

exports.testTsv = function() {
  helpers.setInput('tsv');
  helpers.check({
    input:  'tsv',
    hints:     ' <optionType> <optionValue>',
    markup: 'VVV',
    cursor: 3,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsv' },
      optionType: { arg: '', status: 'INCOMPLETE', message: '' },
      optionValue: { arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv ');
  helpers.check({
    input:  'tsv ',
    hints:      'option1 <optionValue>',
    markup: 'VVVV',
    cursor: 4,
    current: 'optionType',
    status: 'ERROR',
    predictions: [ 'option1', 'option2' ],
    unassigned: [ ],
    tooltipState: 'true:importantFieldFlag',
    args: {
      command: { name: 'tsv' },
      optionType: { arg: '', status: 'INCOMPLETE', message: '' },
      optionValue: { arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv ', 2);
  helpers.check({
    input:  'tsv ',
    hints:      '<optionType> <optionValue>',
    markup: 'VVVV',
    cursor: 2,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsv' },
      optionType: { arg: '', status: 'INCOMPLETE', message: '' },
      optionValue: { arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv o');
  helpers.check({
    input:  'tsv o',
    hints:       'ption1 <optionValue>',
    markup: 'VVVVI',
    cursor: 5,
    current: 'optionType',
    status: 'ERROR',
    predictions: [ 'option1', 'option2' ],
    unassigned: [ ],
    tooltipState: 'true:importantFieldFlag',
    args: {
      command: { name: 'tsv' },
      optionType: { value: undefined, arg: ' o', status: 'INCOMPLETE', message: '' },
      optionValue: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv option');
  helpers.check({
    input:  'tsv option',
    hints:            '1 <optionValue>',
    markup: 'VVVVIIIIII',
    cursor: 10,
    current: 'optionType',
    status: 'ERROR',
    predictions: [ 'option1', 'option2' ],
    unassigned: [ ],
    tooltipState: 'true:importantFieldFlag',
    args: {
      command: { name: 'tsv' },
      optionType: { value: undefined, arg: ' option', status: 'INCOMPLETE', message: '' },
      optionValue: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv option', 0);
  helpers.check({
    input:  'tsv option',
    hints:            ' <optionValue>',
    markup: 'VVVVEEEEEE',
    cursor: 0,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsv' },
      optionType: { value: undefined, arg: ' option', status: 'INCOMPLETE', message: '' },
      optionValue: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv option ');
  helpers.check({
    input:  'tsv option ',
    hints:             '<optionValue>',
    markup: 'VVVVEEEEEEV',
    cursor: 11,
    current: 'optionValue',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError',
    args: {
      command: { name: 'tsv' },
      optionType: { value: undefined, arg: ' option ', status: 'ERROR', message: 'Can\'t use \'option\'.' },
      optionValue: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv option1');
  helpers.check({
    input:  'tsv option1',
    hints:             ' <optionValue>',
    markup: 'VVVVVVVVVVV',
    cursor: 11,
    current: 'optionType',
    status: 'ERROR',
    predictions: [ 'option1' ],
    unassigned: [ ],
    tooltipState: 'true:importantFieldFlag',
    args: {
      command: { name: 'tsv' },
      optionType: { value: mockCommands.option1, arg: ' option1', status: 'VALID', message: '' },
      optionValue: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv option1 ');
  helpers.check({
    input:  'tsv option1 ',
    hints:              '<optionValue>',
    markup: 'VVVVVVVVVVVV',
    cursor: 12,
    current: 'optionValue',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsv' },
      optionType: { value: mockCommands.option1, arg: ' option1 ', status: 'VALID', message: '' },
      optionValue: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv option2');
  helpers.check({
    input:  'tsv option2',
    hints:             ' <optionValue>',
    markup: 'VVVVVVVVVVV',
    cursor: 11,
    current: 'optionType',
    status: 'ERROR',
    predictions: [ 'option2' ],
    unassigned: [ ],
    tooltipState: 'true:importantFieldFlag',
    args: {
      command: { name: 'tsv' },
      optionType: { value: mockCommands.option2, arg: ' option2', status: 'VALID', message: '' },
      optionValue: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsv option1 6');
  helpers.check({
    input:  'tsv option1 6',
    hints:               '',
    markup: 'VVVVVVVVVVVVV',
    cursor: 13,
    current: 'optionValue',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsv' },
      optionType: { value: mockCommands.option1, arg: ' option1', status: 'VALID', message: '' },
      optionValue: { value: '6', arg: ' 6', status: 'VALID', message: '' },
    }
  });

  helpers.setInput('tsv option2 6');
  helpers.check({
    input:  'tsv option2 6',
    hints:               '',
    markup: 'VVVVVVVVVVVVV',
    cursor: 13,
    current: 'optionValue',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsv' },
      optionType: { value: mockCommands.option2,  arg: ' option2', status: 'VALID', message: '' },
      optionValue: { value: 6, arg: ' 6', status: 'VALID', message: '' },
    }
  });
};

exports.testInvalid = function() {
  helpers.setInput('zxjq');
  helpers.check({
    input:  'zxjq',
    hints:      '',
    markup: 'EEEE',
    cursor: 4,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError'
  });

  helpers.setInput('zxjq ');
  helpers.check({
    input:  'zxjq ',
    hints:       '',
    markup: 'EEEEV',
    cursor: 5,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError'
  });

  helpers.setInput('zxjq one');
  helpers.check({
    input:  'zxjq one',
    hints:          '',
    markup: 'EEEEVEEE',
    cursor: 8,
    current: '__unassigned',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ' one' ],
    tooltipState: 'true:isError'
  });
};

exports.testSingleString = function() {
  helpers.setInput('tsr');
  helpers.check({
    input:  'tsr',
    hints:     ' <text>',
    markup: 'VVV',
    cursor: 3,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsr' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsr ');
  helpers.check({
    input:  'tsr ',
    hints:      '<text>',
    markup: 'VVVV',
    cursor: 4,
    current: 'text',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsr' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsr h');
  helpers.check({
    input:  'tsr h',
    hints:       '',
    markup: 'VVVVV',
    cursor: 5,
    current: 'text',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsr' },
      text: { value: 'h', arg: ' h', status: 'VALID', message: '' },
    }
  });

  helpers.setInput('tsr "h h"');
  helpers.check({
    input:  'tsr "h h"',
    hints:           '',
    markup: 'VVVVVVVVV',
    cursor: 9,
    current: 'text',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsr' },
      text: { value: 'h h', arg: ' "h h"', status: 'VALID', message: '' },
    }
  });

  helpers.setInput('tsr h h h');
  helpers.check({
    input:  'tsr h h h',
    hints:           '',
    markup: 'VVVVVVVVV',
    cursor: 9,
    current: 'text',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsr' },
      text: { value: 'h h h', arg: ' h h h', status: 'VALID', message: '' },
    }
  });
};

exports.testSingleNumber = function() {
  helpers.setInput('tsu');
  helpers.check({
    input:  'tsu',
    hints:     ' <num>',
    markup: 'VVV',
    cursor: 3,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsu' },
      num: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsu ');
  helpers.check({
    input:  'tsu ',
    hints:      '<num>',
    markup: 'VVVV',
    cursor: 4,
    current: 'num',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsu' },
      num: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsu 1');
  helpers.check({
    input:  'tsu 1',
    hints:       '',
    markup: 'VVVVV',
    cursor: 5,
    current: 'num',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsu' },
      num: { value: 1, arg: ' 1', status: 'VALID', message: '' },
    }
  });

  helpers.setInput('tsu x');
  helpers.check({
    input:  'tsu x',
    hints:       '',
    markup: 'VVVVE',
    cursor: 5,
    current: 'num',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError',
    args: {
      command: { name: 'tsu' },
      num: { value: undefined, arg: ' x', status: 'ERROR', message: 'Can\'t convert "x" to a number.' },
    }
  });
};

exports.testElement = function(options) {
  helpers.setInput('tse');
  helpers.check({
    input:  'tse',
    hints:     ' <node> [options]',
    markup: 'VVV',
    cursor: 3,
    current: '__command',
    status: 'ERROR',
    predictions: [ 'tse', 'tselarr' ],
    unassigned: [ ],
    args: {
      command: { name: 'tse' },
      node: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
      nodes: { arg: '', status: 'VALID', message: '' },
      nodes2: { arg: '', status: 'VALID', message: '' },
    }
  });

  if (!options.isJsdom) {
    helpers.setInput('tse :root');
    helpers.check({
      input:  'tse :root',
      hints:           ' [options]',
      markup: 'VVVVVVVVV',
      cursor: 9,
      current: 'node',
      status: 'VALID',
      predictions: [ ],
      unassigned: [ ],
      args: {
        command: { name: 'tse' },
        node: {
          value: options.window.document.documentElement,
          arg: ' :root',
          status: 'VALID',
          message: ''
        },
        nodes: { arg: '', status: 'VALID', message: '' },
        nodes2: { arg: '', status: 'VALID', message: '' },
      }
    });

    var inputElement = options.window.document.getElementById('gcli-input');
    if (inputElement) {
      helpers.setInput('tse #gcli-input');
      helpers.check({
        input:  'tse #gcli-input',
        hints:                 ' [options]',
        markup: 'VVVVVVVVVVVVVVV',
        cursor: 15,
        current: 'node',
        status: 'VALID',
        predictions: [ ],
        unassigned: [ ],
        args: {
          command: { name: 'tse' },
          node: {
            value: inputElement,
            arg: ' #gcli-input',
            status: 'VALID',
            message: ''
          },
          nodes: { arg: '', status: 'VALID', message: '' },
          nodes2: { arg: '', status: 'VALID', message: '' },
        }
      });
    }
    else {
      assert.log('Skipping test that assumes gcli on the web');
    }

    helpers.setInput('tse #gcli-nomatch');
    helpers.check({
      input:  'tse #gcli-nomatch',
      hints:                   ' [options]',
      markup: 'VVVVIIIIIIIIIIIII',
      cursor: 17,
      current: 'node',
      status: 'ERROR',
      predictions: [ ],
      unassigned: [ ],
      outputState: 'false:default',
      tooltipState: 'true:isError',
      args: {
        command: { name: 'tse' },
        node: {
          value: undefined,
          arg: ' #gcli-nomatch',
          // This is somewhat debatable because this input can't be corrected
          // simply by typing so it's and error rather than incomplete, however
          // without digging into the CSS engine we can't tell that so we
          // default to incomplete
          status: 'INCOMPLETE',
          message: 'No matches'
        },
        nodes: { arg: '', status: 'VALID', message: '' },
        nodes2: { arg: '', status: 'VALID', message: '' },
      }
    });
  }
  else {
    assert.log('Skipping :root test due to jsdom');
  }

  helpers.setInput('tse #');
  helpers.check({
    input:  'tse #',
    hints:       ' [options]',
    markup: 'VVVVE',
    cursor: 5,
    current: 'node',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError',
    args: {
      command: { name: 'tse' },
      node: {
        value: undefined,
        arg: ' #',
        status: 'ERROR',
        message: 'Syntax error in CSS query'
      },
      nodes: { arg: '', status: 'VALID', message: '' },
      nodes2: { arg: '', status: 'VALID', message: '' },
    }
  });

  helpers.setInput('tse .');
  helpers.check({
    input:  'tse .',
    hints:       ' [options]',
    markup: 'VVVVE',
    cursor: 5,
    current: 'node',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError',
    args: {
      command: { name: 'tse' },
      node: {
        value: undefined,
        arg: ' .',
        status: 'ERROR',
        message: 'Syntax error in CSS query'
      },
      nodes: { arg: '', status: 'VALID', message: '' },
      nodes2: { arg: '', status: 'VALID', message: '' },
    }
  });

  helpers.setInput('tse *');
  helpers.check({
    input:  'tse *',
    hints:       ' [options]',
    markup: 'VVVVE',
    cursor: 5,
    current: 'node',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError',
    args: {
      command: { name: 'tse' },
      node: {
        value: undefined,
        arg: ' *',
        status: 'ERROR',
        message: /^Too many matches \([0-9]*\)/
      },
      nodes: { arg: '', status: 'VALID', message: '' },
      nodes2: { arg: '', status: 'VALID', message: '' },
    }
  });
};

exports.testNestedCommand = function() {
  helpers.setInput('tsn');
  helpers.check({
    input:  'tsn',
    hints:     '',
    markup: 'III',
    cursor: 3,
    current: '__command',
    status: 'ERROR',
    predictionsInclude: [
      'tsn deep', 'tsn deep down', 'tsn deep down nested',
      'tsn deep down nested cmd', 'tsn dif'
    ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn' },
    }
  });

  helpers.setInput('tsn ');
  helpers.check({
    input:  'tsn ',
    hints:      '',
    markup: 'IIIV',
    cursor: 4,
    current: '__command',
    status: 'ERROR',
    unassigned: [ ]
  });

  helpers.setInput('tsn x');
  helpers.check({
    input:  'tsn x',
    hints:       ' -> tsn ext',
    markup: 'IIIVI',
    cursor: 5,
    current: '__command',
    status: 'ERROR',
    predictions: [ 'tsn ext' ],
    unassigned: [ ]
  });

  helpers.setInput('tsn dif');
  helpers.check({
    input:  'tsn dif',
    hints:         ' <text>',
    markup: 'VVVVVVV',
    cursor: 7,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn dif' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsn dif ');
  helpers.check({
    input:  'tsn dif ',
    hints:          '<text>',
    markup: 'VVVVVVVV',
    cursor: 8,
    current: 'text',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn dif' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsn dif x');
  helpers.check({
    input:  'tsn dif x',
    hints:           '',
    markup: 'VVVVVVVVV',
    cursor: 9,
    current: 'text',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn dif' },
      text: { value: 'x', arg: ' x', status: 'VALID', message: '' },
    }
  });

  helpers.setInput('tsn ext');
  helpers.check({
    input:  'tsn ext',
    hints:         ' <text>',
    markup: 'VVVVVVV',
    cursor: 7,
    current: '__command',
    status: 'ERROR',
    predictions: [ 'tsn ext', 'tsn exte', 'tsn exten', 'tsn extend' ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn ext' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsn exte');
  helpers.check({
    input:  'tsn exte',
    hints:          ' <text>',
    markup: 'VVVVVVVV',
    cursor: 8,
    current: '__command',
    status: 'ERROR',
    predictions: [ 'tsn exte', 'tsn exten', 'tsn extend' ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn exte' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsn exten');
  helpers.check({
    input:  'tsn exten',
    hints:           ' <text>',
    markup: 'VVVVVVVVV',
    cursor: 9,
    current: '__command',
    status: 'ERROR',
    predictions: [ 'tsn exten', 'tsn extend' ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn exten' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('tsn extend');
  helpers.check({
    input:  'tsn extend',
    hints:            ' <text>',
    markup: 'VVVVVVVVVV',
    cursor: 10,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn extend' },
      text: { value: undefined, arg: '', status: 'INCOMPLETE', message: '' },
    }
  });

  helpers.setInput('ts ');
  helpers.check({
    input:  'ts ',
    hints:     '',
    markup: 'EEV',
    cursor: 3,
    current: '__command',
    status: 'ERROR',
    predictions: [ ],
    unassigned: [ ],
    tooltipState: 'true:isError'
  });
};

// From Bug 664203
exports.testDeeplyNested = function() {
  helpers.setInput('tsn deep down nested');
  helpers.check({
    input:  'tsn deep down nested',
    hints:                      '',
    markup: 'IIIVIIIIVIIIIVIIIIII',
    cursor: 20,
    current: '__command',
    status: 'ERROR',
    predictions: [ 'tsn deep down nested', 'tsn deep down nested cmd' ],
    unassigned: [ ],
    outputState: 'false:default',
    tooltipState: 'false:default',
    args: {
      command: { name: 'tsn deep down nested' },
    }
  });

  helpers.setInput('tsn deep down nested cmd');
  helpers.check({
    input:  'tsn deep down nested cmd',
    hints:                          '',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVV',
    cursor: 24,
    current: '__command',
    status: 'VALID',
    predictions: [ ],
    unassigned: [ ],
    args: {
      command: { name: 'tsn deep down nested cmd' },
    }
  });
};


});
