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


var pref = require('gcli/commands/pref');
var helpers = require('gclitest/helpers');
var mockSettings = require('gclitest/mockSettings');
var assert = require('test/assert');
var canon = require('gcli/canon');


exports.setup = function(options) {
  helpers.setup(options);

  if (!options.isFirefox) {
    mockSettings.setup();
  }
  else {
    assert.log('Skipping testPref in Firefox.');
  }
};

exports.shutdown = function(options) {
  helpers.shutdown(options);

  if (!options.isFirefox) {
    mockSettings.shutdown();
  }
};

exports.testPrefShowStatus = function(options) {
  if (options.isFirefox) {
    assert.log('Skipping testPrefShowStatus in Firefox.');
    return;
  }

  if (canon.getCommand('intro') == null) {
    assert.log('Skipping testIntroStatus; missing intro command.');
    return;
  }

  helpers.audit([
    {
      setup: 'pref s',
      check: {
        typed:  'pref s',
        hints:        'et',
        markup: 'IIIIVI',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref show',
      check: {
        typed:  'pref show',
        hints:           ' <setting>',
        markup: 'VVVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref show ',
      check: {
        typed:  'pref show ',
        hints:            'allowSet',
        markup: 'VVVVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref show tempTBo',
      check: {
        typed:  'pref show tempTBo',
        hints:                   'ol',
        markup: 'VVVVVVVVVVIIIIIII',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref show tempTBool',
      check: {
        typed:  'pref show tempTBool',
        markup: 'VVVVVVVVVVVVVVVVVVV',
        status: 'VALID',
        hints:  ''
      }
    },
    {
      setup: 'pref show tempTBool 4',
      check: {
        typed:  'pref show tempTBool 4',
        markup: 'VVVVVVVVVVVVVVVVVVVVE',
        status: 'ERROR',
        hints:  ''
      }
    },
    {
      setup: 'pref show tempNumber 4',
      check: {
        typed:  'pref show tempNumber 4',
        markup: 'VVVVVVVVVVVVVVVVVVVVVE',
        status: 'ERROR',
        hints:  ''
      }
    }
  ]);
};

exports.testPrefSetStatus = function(options) {
  if (options.isFirefox) {
    assert.log('Skipping testPrefSetStatus in Firefox.');
    return;
  }

  if (canon.getCommand('intro') == null) {
    assert.log('Skipping testIntroStatus; missing intro command.');
    return;
  }

  helpers.audit([
    {
      setup: 'pref s',
      check: {
        typed:  'pref s',
        hints:        'et',
        markup: 'IIIIVI',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref set',
      check: {
        typed:  'pref set',
        hints:          ' <setting> <value>',
        markup: 'VVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref xxx',
      check: {
        typed:  'pref xxx',
        markup: 'IIIIVIII',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref set ',
      check: {
        typed:  'pref set ',
        hints:           'allowSet <value>',
        markup: 'VVVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref set tempTBo',
      check: {
        typed:  'pref set tempTBo',
        hints:                  'ol <value>',
        markup: 'VVVVVVVVVIIIIIII',
        status: 'ERROR'
      }
    },
    {
      setup: 'pref set tempTBool 4',
      check: {
        typed:  'pref set tempTBool 4',
        markup: 'VVVVVVVVVVVVVVVVVVVE',
        status: 'ERROR',
        hints: ''
      }
    },
    {
      setup: 'pref set tempNumber 4',
      check: {
        typed:  'pref set tempNumber 4',
        markup: 'VVVVVVVVVVVVVVVVVVVVV',
        status: 'VALID',
        hints: ''
      }
    }
  ]);
};

exports.testPrefExec = function(options) {
  if (options.isFirefox) {
    assert.log('Skipping testPrefExec in Firefox.');
    return;
  }

  if (canon.getCommand('intro') == null) {
    assert.log('Skipping testIntroStatus; missing intro command.');
    return;
  }

  var initialAllowSet = pref.allowSet.value;
  pref.allowSet.value = false;

  assert.is(mockSettings.tempNumber.value, 42, 'set to 42');

  helpers.exec({
    typed: 'pref set tempNumber 4',
    args: {
      setting: mockSettings.tempNumber,
      value: 4
    },
    outputMatch: [ /void your warranty/, /I promise/ ]
  });

  assert.is(mockSettings.tempNumber.value, 42, 'still set to 42');
  pref.allowSet.value = true;

  helpers.exec({
    typed: 'pref set tempNumber 4',
    args: {
      setting: mockSettings.tempNumber,
      value: 4
    },
    blankOutput: true
  });

  assert.is(mockSettings.tempNumber.value, 4, 'set to 4');

  helpers.exec({
    typed: 'pref reset tempNumber',
    args: {
      setting: mockSettings.tempNumber
    },
    blankOutput: true
  });

  assert.is(mockSettings.tempNumber.value, 42, 'reset to 42');

  pref.allowSet.value = initialAllowSet;

  helpers.exec({
    typed: 'pref list tempNum',
    args: {
      search: 'tempNum'
    },
    outputMatch: /Filter/
  });
};


});
