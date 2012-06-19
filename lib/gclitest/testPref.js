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


var pref = require('gcli/commands/pref');
var helpers = require('gclitest/helpers');
var mockSettings = require('gclitest/mockSettings');
var test = require('test/assert');


exports.setup = function(options) {
  if (!options.isFirefox) {
    mockSettings.setup();
  }
  else {
    test.log('Skipping testPref in Firefox.');
  }
};

exports.shutdown = function(options) {
  if (!options.isFirefox) {
    mockSettings.shutdown();
  }
};

exports.testPrefShowStatus = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPrefShowStatus in Firefox.');
    return;
  }

  helpers.status(options, {
    typed:  'pref s',
    markup: 'IIIIVI',
    status: 'ERROR',
    directTabText: 'et'
  });

  helpers.status(options, {
    typed:  'pref show',
    markup: 'VVVVVVVVV',
    status: 'ERROR',
    emptyParameters: [ ' <setting>' ]
  });

  helpers.status(options, {
    typed:  'pref show ',
    markup: 'VVVVVVVVVV',
    status: 'ERROR',
    emptyParameters: [ ]
  });

  helpers.status(options, {
    typed:  'pref show tempTBo',
    markup: 'VVVVVVVVVVIIIIIII',
    directTabText: 'ol',
    status: 'ERROR',
    emptyParameters: [ ]
  });

  helpers.status(options, {
    typed:  'pref show tempTBool',
    markup: 'VVVVVVVVVVVVVVVVVVV',
    directTabText: '',
    status: 'VALID',
    emptyParameters: [ ]
  });

  helpers.status(options, {
    typed:  'pref show tempTBool 4',
    markup: 'VVVVVVVVVVVVVVVVVVVVE',
    directTabText: '',
    status: 'ERROR',
    emptyParameters: [ ]
  });

  helpers.status(options, {
    typed:  'pref show tempNumber 4',
    markup: 'VVVVVVVVVVVVVVVVVVVVVE',
    directTabText: '',
    status: 'ERROR',
    emptyParameters: [ ]
  });
};

exports.testPrefSetStatus = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPrefSetStatus in Firefox.');
    return;
  }

  helpers.status(options, {
    typed:  'pref s',
    markup: 'IIIIVI',
    status: 'ERROR',
    directTabText: 'et'
  });

  helpers.status(options, {
    typed:  'pref set',
    markup: 'VVVVVVVV',
    status: 'ERROR',
    emptyParameters: [ ' <setting>', ' <value>' ]
  });

  helpers.status(options, {
    typed:  'pref xxx',
    markup: 'EEEEVEEE',
    status: 'ERROR'
  });

  helpers.status(options, {
    typed:  'pref set ',
    markup: 'VVVVVVVVV',
    status: 'ERROR',
    emptyParameters: [ ' <value>' ]
  });

  helpers.status(options, {
    typed:  'pref set tempTBo',
    markup: 'VVVVVVVVVIIIIIII',
    directTabText: 'ol',
    status: 'ERROR',
    emptyParameters: [ ' <value>' ]
  });

  helpers.status(options, {
    typed:  'pref set tempTBool 4',
    markup: 'VVVVVVVVVVVVVVVVVVVE',
    directTabText: '',
    status: 'ERROR',
    emptyParameters: [ ]
  });

  helpers.status(options, {
    typed:  'pref set tempNumber 4',
    markup: 'VVVVVVVVVVVVVVVVVVVVV',
    directTabText: '',
    status: 'VALID',
    emptyParameters: [ ]
  });
};

exports.testPrefExec = function(options) {
  if (options.isFirefox) {
    test.log('Skipping testPrefExec in Firefox.');
    return;
  }

  var initialAllowSet = pref.allowSet.value;
  pref.allowSet.value = false;

  test.is(mockSettings.tempNumber.value, 42, 'set to 42');

  helpers.exec(options, {
    typed: 'pref set tempNumber 4',
    args: {
      setting: mockSettings.tempNumber,
      value: 4
    },
    outputMatch: [ /void your warranty/, /I promise/ ]
  });

  test.is(mockSettings.tempNumber.value, 42, 'still set to 42');
  pref.allowSet.value = true;

  helpers.exec(options, {
    typed: 'pref set tempNumber 4',
    args: {
      setting: mockSettings.tempNumber,
      value: 4
    },
    blankOutput: true
  });

  test.is(mockSettings.tempNumber.value, 4, 'set to 4');

  helpers.exec(options, {
    typed: 'pref reset tempNumber',
    args: {
      setting: mockSettings.tempNumber
    },
    blankOutput: true
  });

  test.is(mockSettings.tempNumber.value, 42, 'reset to 42');

  pref.allowSet.value = initialAllowSet;

  helpers.exec(options, {
    typed: 'pref list tempNum',
    args: {
      search: 'tempNum'
    },
    outputMatch: /Filter/
  });
};


});
