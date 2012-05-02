/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var helpers = require('gclitest/helpers');

  exports.testIntroStatus = function(options) {
    helpers.status(options, {
      typed:  'intro',
      markup: 'VVVVV',
      status: 'VALID',
      emptyParameters: [ ]
    });

    helpers.status(options, {
      typed:  'intro foo',
      markup: 'VVVVVVEEE',
      status: 'ERROR',
      emptyParameters: [ ]
    });
  };

  exports.testIntroExec = function(options) {
    helpers.exec(options, {
      typed: 'intro',
      args: { },
      outputMatch: [
        /graphical\s*command\s*line/,
        /GCLI/,
        /help/,
        /F1/,
        /Escape/
      ]
    });
  };

});
