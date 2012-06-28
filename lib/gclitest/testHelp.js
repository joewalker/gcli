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

  exports.testHelpStatus = function(options) {
    helpers.status(options, {
      typed:  'help',
      markup: 'VVVV',
      status: 'VALID',
      emptyParameters: [ " [search]" ]
    });

    helpers.status(options, {
      typed:  'help foo',
      markup: 'VVVVVVVV',
      status: 'VALID',
      emptyParameters: [ ]
    });

    helpers.status(options, {
      typed:  'help foo bar',
      markup: 'VVVVVVVVVVVV',
      status: 'VALID',
      emptyParameters: [ ]
    });
  };

  exports.testHelpExec = function(options) {
    if (options.isFirefox) {
      helpers.exec(options, {
        typed: 'help',
        args: { search: null },
        outputMatch: [
          /Available Commands/,
          /Get help/
        ]
      });
    }
    else {
      helpers.exec(options, {
        typed: 'help',
        args: { search: null },
        outputMatch: [
          /Welcome to GCLI/,
          /Source \(Apache-2.0\)/,
          /Get help/
        ]
      });
    }

    helpers.exec(options, {
      typed: 'help nomatch',
      args: { search: 'nomatch' },
      outputMatch: /No commands starting with 'nomatch'$/
    });

    helpers.exec(options, {
      typed: 'help help',
      args: { search: 'help' },
      outputMatch: [
        /Synopsis:/,
        /Provide help either/,
        /\(string, optional\)/
      ]
    });

    helpers.exec(options, {
      typed: 'help a b',
      args: { search: 'a b' },
      outputMatch: /No commands starting with 'a b'$/
    });

    helpers.exec(options, {
      typed: 'help hel',
      args: { search: 'hel' },
      outputMatch: [
        /Commands starting with 'hel':/,
        /Get help on the available commands/
      ]
    });
  };

});
