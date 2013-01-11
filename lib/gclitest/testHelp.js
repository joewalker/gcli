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

exports.setup = function(options) {
  helpers.setup(options);
};

exports.shutdown = function(options) {
  helpers.shutdown(options);
};

exports.testHelpStatus = function(options) {
  helpers.audit([
    {
      setup: 'help',
      check: {
        typed:  'help',
        hints:      ' [search]',
        markup: 'VVVV',
        status: 'VALID'
      }
    },
    {
      setup: 'help ',
      check: {
        typed:  'help ',
        hints:       '[search]',
        markup: 'VVVVV',
        status: 'VALID'
      }
    },
    // From bug 779816
    {
      setup: 'help<TAB>',
      check: {
        typed:  'help ',
        hints:       '[search]',
        markup: 'VVVVV',
        status: 'VALID'
      }
    },
    {
      setup: 'help foo',
      check: {
        typed:  'help foo',
        markup: 'VVVVVVVV',
        status: 'VALID',
        hints:  ''
      }
    },
    {
      setup: 'help foo bar',
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
  if (options.isFirefox) {
    helpers.exec({
      typed: 'help',
      args: { search: null },
      outputMatch: [
        /Available Commands/,
        /Get help/
      ]
    });
  }
  else {
    helpers.exec({
      typed: 'help',
      args: { search: null },
      outputMatch: [
        /Welcome to GCLI/,
        /Source \(Apache-2.0\)/,
        /Get help/
      ]
    });
  }

  helpers.exec({
    typed: 'help nomatch',
    args: { search: 'nomatch' },
    outputMatch: /No commands starting with 'nomatch'$/
  });

  helpers.exec({
    typed: 'help help',
    args: { search: 'help' },
    outputMatch: [
      /Synopsis:/,
      /Provide help either/,
      /\(string, optional\)/
    ]
  });

  helpers.exec({
    typed: 'help a b',
    args: { search: 'a b' },
    outputMatch: /No commands starting with 'a b'$/
  });

  helpers.exec({
    typed: 'help hel',
    args: { search: 'hel' },
    outputMatch: [
      /Commands starting with 'hel':/,
      /Get help on the available commands/
    ]
  });
};


});
