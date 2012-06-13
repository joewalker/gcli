/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
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
          /Source \(BSD\)/,
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
