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

exports.testHelpStatus = function(options) {
  return helpers.audit(options, [
    {
      skipRemainingIf: function commandHelpMissing() {
        return options.requisition.canon.getCommand('help') == null;
      },
      setup:    'help',
      check: {
        typed:  'help',
        hints:      ' [search]',
        markup: 'VVVV',
        status: 'VALID'
      }
    },
    {
      setup:    'help ',
      check: {
        typed:  'help ',
        hints:       '[search]',
        markup: 'VVVVV',
        status: 'VALID'
      }
    },
    // From bug 779816
    {
      setup:    'help<TAB>',
      check: {
        typed:  'help ',
        hints:       '[search]',
        markup: 'VVVVV',
        status: 'VALID'
      }
    },
    {
      setup:    'help foo',
      check: {
        typed:  'help foo',
        markup: 'VVVVVVVV',
        status: 'VALID',
        hints:  ''
      }
    },
    {
      setup:    'help foo bar',
      check: {
        typed:  'help foo bar',
        markup: 'VVVVVVVVVVVV',
        status: 'VALID',
        hints:  ''
      }
    },
  ]);
};

exports.testHelpExec = function(options) {
  return helpers.audit(options, [
    {
      skipRemainingIf: function commandHelpMissing() {
        return options.isNoDom ||
               options.requisition.canon.getCommand('help') == null;
      },
      setup: 'help',
      check: {
        args: { search: { value: undefined } }
      },
      exec: {
        output: [
          /GCLI is an experiment/,
          /Available Commands/,
          /Get help/
        ]
      }
    },
    {
      setup:    'help nomatch',
      check: {
        args: { search: { value: 'nomatch' } }
      },
      exec: {
        output: /No commands starting with 'nomatch'$/
      }
    },
    {
      setup:    'help help',
      check: {
        args: { search: { value: 'help' } }
      },
      exec: {
        output: [
          /Synopsis:/,
          /Provide help either/
          // Commented out until bug 935990 is fixed
          // /\(string, optional\)/
        ]
      }
    },
    {
      setup:    'help a b',
      check: {
        args: { search: { value: 'a b' } }
      },
      exec: {
        output: /No commands starting with 'a b'$/
      }
    },
    {
      setup:    'help hel',
      check: {
        args: { search: { value: 'hel' } }
      },
      exec: {
        output: [
          /Commands starting with 'hel':/,
          /Get help on the available commands/
        ]
      }
    },
    {
      setup:    'help tscook',
      check: {
        input:  'help tscook',
        hints:             '',
        markup: 'VVVVVVVVVVV',
        status: 'VALID',
      },
      exec: {
        output: [
          /tscook\s*<key> <value> \[--path \.\.\.\] \[--domain \.\.\.\] \[--secure\]/,
          // Commented out until bug 935990 is fixed
          // /[--secure]:? \(boolean, optional, default=false\)/,
          /tscookSecureDesc/
        ],
        type: 'commandData',
        error: false
      }
    },
    {
      setup:    'help tsn',
      check: {
        input:  'help tsn',
        hints:          '',
        markup: 'VVVVVVVV',
        status: 'VALID',
      },
      exec: {
        output: [
          /tsn deep down/,
          /tsn extend/
        ],
        type: 'commandData',
        error: false
      },
      post: function(output, data) {
        if (data.indexOf('hidden') !== -1) {
          assert.ok(false, 'hidden is hidden');
        }
      }
    },
    {
      setup:    'help tsn hidden',
      check: {
        input:  'help tsn hidden',
        hints:                 '',
        markup: 'VVVVVVVVVVVVVVV',
        status: 'VALID',
      },
      exec: {
        output: /tsn hidden/,
        type: 'commandData',
        error: false
      }
    },
    {
      setup:    'help tsg',
      check: {
        status: 'VALID',
      },
      exec: {
        output: [
          /Options:/,
          /First:/,
          /Second:/,
        ],
        type: 'commandData',
        error: false
      }
    }
  ]);
};
