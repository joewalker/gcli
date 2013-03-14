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

'use strict';

var helpers = require('gclitest/helpers');
var canon = require('gcli/canon');

exports.testHelpStatus = function(options) {
  return helpers.audit(options, [
    {
      skipRemainingIf: function commandHelpMissing() {
        return canon.getCommand('help') == null;
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
        return canon.getCommand('help') == null;
      },
      setup:    'help',
      check: {
        args: { search: { value: undefined } }
      },
      exec: {
        output: options.isFirefox ?
          [ /Available Commands/, /Get help/ ] :
          [ /Welcome to GCLI/, /Source \(Apache-2.0\)/, /Get help/ ],
        completed: true,
      }
    },
    {
      setup:    'help nomatch',
      check: {
        args: { search: { value: 'nomatch' } }
      },
      exec: {
        output: /No commands starting with 'nomatch'$/,
        completed: true,
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
          /Provide help either/,
          /\(string, optional\)/
        ],
        completed: true,
      }
    },
    {
      setup:    'help a b',
      check: {
        args: { search: { value: 'a b' } }
      },
      exec: {
        output: /No commands starting with 'a b'$/,
        completed: true,
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
        ],
        completed: true,
      }
    }
  ]);
};


});
