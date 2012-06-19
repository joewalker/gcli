/*
 * Copyright 2011, Mozilla Foundation and contributors
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
var mockCommands = require('gclitest/mockCommands');


exports.setup = function() {
  mockCommands.setup();
};

exports.shutdown = function() {
  mockCommands.shutdown();
};


function type(typed, tests, options) {
  var inputter = options.display.inputter;
  var completer = options.display.completer;

  inputter.setInput(typed);

  if (tests.cursor) {
    inputter.setCursor({ start: tests.cursor, end: tests.cursor });
  }

  if (tests.emptyParameters == null) {
    tests.emptyParameters = [];
  }

  var realParams = completer.emptyParameters;
  test.is(tests.emptyParameters.length, realParams.length,
          'emptyParameters.length for \'' + typed + '\'');

  if (realParams.length === tests.emptyParameters.length) {
    for (var i = 0; i < realParams.length; i++) {
      test.is(tests.emptyParameters[i], realParams[i].replace(/\u00a0/g, ' '),
              'emptyParameters[' + i + '] for \'' + typed + '\'');
    }
  }

  if (tests.directTabText) {
    test.is(tests.directTabText, completer.directTabText,
            'directTabText for \'' + typed + '\'');
  }
  else {
    test.is('', completer.directTabText,
            'directTabText for \'' + typed + '\'');
  }

  if (tests.arrowTabText) {
    test.is(' \u00a0\u21E5 ' + tests.arrowTabText,
            completer.arrowTabText,
            'arrowTabText for \'' + typed + '\'');
  }
  else {
    test.is('', completer.arrowTabText,
            'arrowTabText for \'' + typed + '\'');
  }
}

exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping activate tests');
    return;
  }

  type('', { }, options);

  type(' ', { }, options);

  type('tsr', {
    emptyParameters: [ ' <text>' ]
  }, options);

  type('tsr ', {
    emptyParameters: [ '<text>' ]
  }, options);

  type('tsr b', { }, options);

  type('tsb', {
    emptyParameters: [ ' [toggle]' ]
  }, options);

  type('tsm', {
    emptyParameters: [ ' <abc>', ' <txt>', ' <num>' ]
  }, options);

  type('tsm ', {
    emptyParameters: [ ' <txt>', ' <num>' ],
    directTabText: 'a'
  }, options);

  type('tsm a', {
    emptyParameters: [ ' <txt>', ' <num>' ]
  }, options);

  type('tsm a ', {
    emptyParameters: [ '<txt>', ' <num>' ]
  }, options);

  type('tsm a  ', {
    emptyParameters: [ '<txt>', ' <num>' ]
  }, options);

  type('tsm a  d', {
    emptyParameters: [ ' <num>' ]
  }, options);

  type('tsm a "d d"', {
    emptyParameters: [ ' <num>' ]
  }, options);

  type('tsm a "d ', {
    emptyParameters: [ ' <num>' ]
  }, options);

  type('tsm a "d d" ', {
    emptyParameters: [ '<num>' ]
  }, options);

  type('tsm a "d d ', {
    emptyParameters: [ ' <num>' ]
  }, options);

  type('tsm d r', {
    emptyParameters: [ ' <num>' ]
  }, options);

  type('tsm a d ', {
    emptyParameters: [ '<num>' ]
  }, options);

  type('tsm a d 4', { }, options);

  type('tsg', {
    emptyParameters: [ ' <solo>' ]
  }, options);

  type('tsg ', {
    directTabText: 'aaa'
  }, options);

  type('tsg a', {
    directTabText: 'aa'
  }, options);

  type('tsg b', {
    directTabText: 'bb'
  }, options);

  type('tsg d', { }, options);

  type('tsg aa', {
    directTabText: 'a'
  }, options);

  type('tsg aaa', { }, options);

  type('tsg aaa ', { }, options);

  type('tsg aaa d', { }, options);

  type('tsg aaa dddddd', { }, options);

  type('tsg aaa dddddd ', { }, options);

  type('tsg aaa "d', { }, options);

  type('tsg aaa "d d', { }, options);

  type('tsg aaa "d d"', { }, options);

  type('tsn ex ', { }, options);

  type('selarr', {
    arrowTabText: 'tselarr'
  }, options);

  type('tselar 1', { }, options);

  type('tselar 1', {
    cursor: 7
  }, options);

  type('tselar 1', {
    cursor: 6,
    arrowTabText: 'tselarr'
  }, options);

  type('tselar 1', {
    cursor: 5,
    arrowTabText: 'tselarr'
  }, options);
};


});
