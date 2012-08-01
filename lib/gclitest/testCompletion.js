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

exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping activate tests');
    return;
  }

  helpers.setInput('');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });

  helpers.setInput(' ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });

  helpers.setInput('tsr');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <text>'
  });

  helpers.setInput('tsr ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: '<text>'
  });

  helpers.setInput('tsr b');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });

  helpers.setInput('tsb');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [toggle]'
  });

  helpers.setInput('tsm');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <abc> <txt> <num>'
  });

  helpers.setInput('tsm ');
  helpers.check({
    emptyParameters: ' <txt> <num>',
    arrowTabText: '',
    directTabText: 'a'
  });

  helpers.setInput('tsm a');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <txt> <num>'
  });

  helpers.setInput('tsm a ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: '<txt> <num>'
  });

  helpers.setInput('tsm a  ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: '<txt> <num>'
  });

  helpers.setInput('tsm a  d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <num>'
  });

  helpers.setInput('tsm a "d d"');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <num>'
  });

  helpers.setInput('tsm a "d ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <num>'
  });

  helpers.setInput('tsm a "d d" ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: '<num>'
  });

  helpers.setInput('tsm a "d d ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <num>'
  });

  helpers.setInput('tsm d r');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <num>'
  });

  helpers.setInput('tsm a d ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: '<num>'
  });

  helpers.setInput('tsm a d 4');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });

  helpers.setInput('tsg');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' <solo> [options]'
  });

  helpers.setInput('tsg ');
  helpers.check({
    emptyParameters: '',
    arrowTabText: '',
    directTabText: 'aaa'
  });

  helpers.setInput('tsg a');
  helpers.check({
    emptyParameters: '',
    arrowTabText: '',
    directTabText: 'aa'
  });

  helpers.setInput('tsg b');
  helpers.check({
    emptyParameters: '',
    arrowTabText: '',
    directTabText: 'bb'
  });

  helpers.setInput('tsg d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [options]'
  });

  helpers.setInput('tsg aa');
  helpers.check({
    emptyParameters: '',
    arrowTabText: '',
    directTabText: 'a'
  });

  helpers.setInput('tsg aaa');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [options]'
  });

  helpers.setInput('tsg aaa ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: '[options]'
  });

  helpers.setInput('tsg aaa d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [options]'
  });

  helpers.setInput('tsg aaa dddddd');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [options]'
  });

  helpers.setInput('tsg aaa dddddd ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: '[options]'
  });

  helpers.setInput('tsg aaa "d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [options]'
  });

  helpers.setInput('tsg aaa "d d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [options]'
  });

  helpers.setInput('tsg aaa "d d"');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ' [options]'
  });

  helpers.setInput('tsn ex ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });

  helpers.setInput('selarr');
  helpers.check({
    directTabText: '',
    emptyParameters: '',
    arrowTabText: 'tselarr'
  });

  helpers.setInput('tselar 1');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });

  helpers.setInput('tselar 1', 7);
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });

  helpers.setInput('tselar 1', 6);
  helpers.check({
    directTabText: '',
    emptyParameters: '',
    arrowTabText: 'tselarr'
  });

  helpers.setInput('tselar 1', 5);
  helpers.check({
    directTabText: '',
    emptyParameters: '',
    arrowTabText: 'tselarr'
  });
};

exports.testLong = function(options) {
  helpers.setInput('tslong --sel');
  helpers.check({
    input:  'tslong --sel',
    markup: 'VVVVVVVIIIII',
    directTabText: '',
    emptyParameters: ' <selection>',
    // emptyParameters: ' <sel> <msg> [options]',
    arrowTabText: ''
  });

  helpers.pressTab();
  helpers.check({
    input:  'tslong --sel ',
    markup: 'VVVVVVVIIIIIV',
    directTabText: 'space',
    emptyParameters: '',
    // emptyParameters: ' <msg> [options]',
    arrowTabText: ''
  });

  helpers.setInput('tslong --sel ');
  helpers.check({
    input:  'tslong --sel ',
    markup: 'VVVVVVVIIIIIV',
    directTabText: 'space',
    emptyParameters: '',
    // emptyParameters: ' <msg> [options]',
    arrowTabText: ''
  });

  helpers.setInput('tslong --sel s');
  helpers.check({
    input:  'tslong --sel s',
    markup: 'VVVVVVVIIIIIVI',
    directTabText: 'pace',
    emptyParameters: '',
    arrowTabText: ''
  });

  helpers.setInput('tslong --num ');
  helpers.check({
    input:  'tslong --num ',
    markup: 'VVVVVVVIIIIIV',
    emptyParameters: '<number>',
    directTabText: '',
    arrowTabText: ''
  });

  helpers.setInput('tslong --num 42');
  helpers.check({
    input:  'tslong --num 42',
    markup: 'VVVVVVVVVVVVVVV',
    directTabText: '',
    emptyParameters: ' <msg> [options]',
    arrowTabText: ''
  });

  helpers.setInput('tslong --num 42 ');
  helpers.check({
    input:  'tslong --num 42 ',
    markup: 'VVVVVVVVVVVVVVVV',
    directTabText: '',
    emptyParameters: '<msg> [options]',
    arrowTabText: ''
  });

  helpers.setInput('tslong --num 42 --se');
  helpers.check({
    input:  'tslong --num 42 --se',
    markup: 'VVVVVVVVVVVVVVVVIIII',
    directTabText: 'l',
    emptyParameters: '',
    arrowTabText: ''
  });

  helpers.pressTab();
  helpers.check({
    input:  'tslong --num 42 --sel ',
    markup: 'VVVVVVVVVVVVVVVVIIIIIV',
    directTabText: 'space',
    emptyParameters: '',
    arrowTabText: ''
  });

  helpers.pressTab();
  helpers.check({
    input:  'tslong --num 42 --sel space ',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV',
    directTabText: '',
    emptyParameters: '<msg> [options]',
    arrowTabText: ''
  });

  helpers.setInput('tslong --num 42 --sel ');
  helpers.check({
    input:  'tslong --num 42 --sel ',
    markup: 'VVVVVVVVVVVVVVVVIIIIIV',
    directTabText: 'space',
    emptyParameters: '',
    arrowTabText: ''
  });

  helpers.setInput('tslong --num 42 --sel space ');
  helpers.check({
    input:  'tslong --num 42 --sel space ',
    markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVV',
    directTabText: '',
    emptyParameters: '<msg> [options]',
    arrowTabText: ''
  });
};

exports.testNoTab = function(options) {
  helpers.setInput('tss');
  helpers.pressTab();
  helpers.check({
    input:  'tss ',
    markup: 'VVVV',
    directTabText: '',
    emptyParameters: '',
    arrowTabText: ''
  });

  helpers.pressTab();
  helpers.check({
    input:  'tss ',
    markup: 'VVVV',
    directTabText: '',
    emptyParameters: '',
    arrowTabText: ''
  });

  helpers.setInput('xxxx');
  helpers.check({
    input:  'xxxx',
    markup: 'EEEE',
    directTabText: '',
    emptyParameters: '',
    arrowTabText: ''
  });

  helpers.pressTab();
  helpers.check({
    input:  'xxxx',
    markup: 'EEEE',
    directTabText: '',
    emptyParameters: '',
    arrowTabText: ''
  });
};


});
