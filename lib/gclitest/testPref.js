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
    assert.skip('Skipping testPref in Firefox.');
  }
};

exports.shutdown = function(options) {
  helpers.shutdown(options);

  if (!options.isFirefox) {
    mockSettings.shutdown();
  }
};

function shouldContinuePrefTests() {
  if (canon.getCommand('pref') == null) {
    assert.skip('Skipping test; missing pref command.');
    return false;
  }

  if (helpers.options.isFirefox) {
    assert.skip('Skipping test; differing pref actions.');
    return false;
  }

  return true;
}

exports.testPrefShowStatus = function() {
  if (!shouldContinuePrefTests()) {
    return;
  }

  return helpers.audit([
    {
      setup:    'pref s',
      check: {
        typed:  'pref s',
        hints:        'et',
        markup: 'IIIIVI',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref show',
      check: {
        typed:  'pref show',
        hints:           ' <setting>',
        markup: 'VVVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref show ',
      check: {
        typed:  'pref show ',
        hints:            'allowSet',
        markup: 'VVVVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref show tempTBo',
      check: {
        typed:  'pref show tempTBo',
        hints:                   'ol',
        markup: 'VVVVVVVVVVIIIIIII',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref show tempTBool',
      check: {
        typed:  'pref show tempTBool',
        markup: 'VVVVVVVVVVVVVVVVVVV',
        status: 'VALID',
        hints:  ''
      }
    },
    {
      setup:    'pref show tempTBool 4',
      check: {
        typed:  'pref show tempTBool 4',
        markup: 'VVVVVVVVVVVVVVVVVVVVE',
        status: 'ERROR',
        hints:  ''
      }
    },
    {
      setup:    'pref show tempNumber 4',
      check: {
        typed:  'pref show tempNumber 4',
        markup: 'VVVVVVVVVVVVVVVVVVVVVE',
        status: 'ERROR',
        hints:  ''
      }
    }
  ]);
};

exports.testPrefSetStatus = function() {
  if (!shouldContinuePrefTests()) {
    return;
  }

  return helpers.audit([
    {
      setup:    'pref s',
      check: {
        typed:  'pref s',
        hints:        'et',
        markup: 'IIIIVI',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref set',
      check: {
        typed:  'pref set',
        hints:          ' <setting> <value>',
        markup: 'VVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref xxx',
      check: {
        typed:  'pref xxx',
        markup: 'IIIIVIII',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref set ',
      check: {
        typed:  'pref set ',
        hints:           'allowSet <value>',
        markup: 'VVVVVVVVV',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref set tempTBo',
      check: {
        typed:  'pref set tempTBo',
        hints:                  'ol <value>',
        markup: 'VVVVVVVVVIIIIIII',
        status: 'ERROR'
      }
    },
    {
      setup:    'pref set tempTBool 4',
      check: {
        typed:  'pref set tempTBool 4',
        markup: 'VVVVVVVVVVVVVVVVVVVE',
        status: 'ERROR',
        hints: ''
      }
    },
    {
      setup:    'pref set tempNumber 4',
      check: {
        typed:  'pref set tempNumber 4',
        markup: 'VVVVVVVVVVVVVVVVVVVVV',
        status: 'VALID',
        hints: ''
      }
    }
  ]);
};

exports.testPrefExec = function() {
  if (!shouldContinuePrefTests()) {
    return;
  }

  var initialAllowSet = pref.allowSet.value;
  pref.allowSet.value = false;

  assert.is(mockSettings.tempNumber.value, 42, 'set to 42');

  return helpers.audit([
    {
      setup:    'pref set tempNumber 4',
      check: {
        input:  'pref set tempNumber 4',
        hints:                       '',
        markup: 'VVVVVVVVVVVVVVVVVVVVV',
        cursor: 21,
        current: 'value',
        status: 'VALID',
        predictions: [ ],
        unassigned: [ ],
        args: {
          command: { name: 'pref set' },
          setting: {
            value: mockSettings.tempNumber,
            arg: ' tempNumber',
            status: 'VALID',
            message: ''
          },
          value: {
            value: 4,
            arg: ' 4',
            status: 'VALID',
            message: ''
          }
        }
      },
      exec: {
        output: [ /void your warranty/, /I promise/ ],
        completed: true
      },
      post: function() {
        assert.is(mockSettings.tempNumber.value, 42, 'still set to 42');
        pref.allowSet.value = true;
      }
    },
    {
      setup:    'pref set tempNumber 4',
      check: {
        args: {
          command: { name: 'pref set' },
          setting: { value: mockSettings.tempNumber },
          value: { value: 4 }
        }
      },
      exec: {
        output: '',
        completed: true
      },
      post: function() {
        assert.is(mockSettings.tempNumber.value, 4, 'set to 4');
      }
    },
    {
      setup:    'pref reset tempNumber',
      check: {
        args: {
          command: { name: 'pref reset' },
          setting: { value: mockSettings.tempNumber }
        }
      },
      exec: {
        output: '',
        completed: true
      },
      post: function() {
        assert.is(mockSettings.tempNumber.value, 42, 'reset to 42');

        pref.allowSet.value = initialAllowSet;
      }
    },
    {
      skipRemainingIf: helpers.reason.createComandCheck('pref list'),
      setup:    'pref list tempNum',
      check: {
        args: {
          command: { name: 'pref list' },
          search: { value: 'tempNum' }
        }
      },
      exec: {
        output: /Filter/,
        completed: true
      },
      post: function() {
      }
    },
  ]);
};


});
