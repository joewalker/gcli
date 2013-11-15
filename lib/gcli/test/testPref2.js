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

'use strict';

var assert = require('../testharness/assert');
var helpers = require('./helpers');
var mockSettings = require('./mockSettings');

var settings = require('../settings');
var canon = require('../canon').centralCanon;

exports.setup = function(options) {
  if (!options.isFirefox) {
    mockSettings.setup();
  }
  else {
    assert.log('Skipping testPref in Firefox.');
  }
};

exports.shutdown = function(options) {
  if (!options.isFirefox) {
    mockSettings.shutdown();
  }
};

exports.testPrefExec = function(options) {
  if (canon.getCommand('pref') == null) {
    assert.log('Skipping test; missing pref command.');
    return;
  }

  if (options.isFirefox) {
    assert.log('Skipping test; differing pref actions.');
    return;
  }

  var allowSet = settings.getSetting('allowSet');
  var initialAllowSet = allowSet.value;
  allowSet.value = false;

  assert.is(mockSettings.tempNumber.value, 42, 'set to 42');

  return helpers.audit(options, [
    {
      skipRemainingIf: options.isNoDom,
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
        output: [ /void your warranty/, /I promise/ ]
      },
      post: function() {
        assert.is(mockSettings.tempNumber.value, 42, 'still set to 42');
        allowSet.value = true;
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
        output: ''
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
        output: ''
      },
      post: function() {
        assert.is(mockSettings.tempNumber.value, 42, 'reset to 42');

        allowSet.value = initialAllowSet;
      }
    },
    {
      skipRemainingIf: function commandPrefListMissing() {
        return canon.getCommand('pref list') == null;
      },
      setup:    'pref list tempNum',
      check: {
        args: {
          command: { name: 'pref list' },
          search: { value: 'tempNum' }
        }
      },
      exec: {
        output: /tempNum/
      }
    },
  ]);
};
