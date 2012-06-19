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

  var helpers = require('gclitest/helpers');
  var test = require('test/assert');

  exports.testIntroStatus = function(options) {
    if (options.isFirefox) {
      test.log('Skipping testIntroStatus in Firefox.');
      return;
    }

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
    if (options.isFirefox) {
      test.log('Skipping testIntroExec in Firefox.');
      return;
    }

    helpers.exec(options, {
      typed: 'intro',
      args: { },
      outputMatch: [
        /command\s*line/,
        /help/,
        /F1/,
        /Escape/
      ]
    });
  };

});
