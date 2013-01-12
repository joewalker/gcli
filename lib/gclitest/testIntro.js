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
var assert = require('test/assert');
var canon = require('gcli/canon');

exports.setup = function(options) {
  helpers.setup(options);
};

exports.shutdown = function(options) {
  helpers.shutdown(options);
};

exports.testIntroStatus = function(options) {
  if (canon.getCommand('intro') == null) {
    assert.log('Skipping testIntroStatus; missing intro command.');
    return;
  }

  helpers.audit([
    {
      setup:    'intro',
      check: {
        typed:  'intro',
        markup: 'VVVVV',
        status: 'VALID',
        hints: ''
      }
    },
    {
      setup:    'intro foo',
      check: {
        typed:  'intro foo',
        markup: 'VVVVVVEEE',
        status: 'ERROR',
        hints: ''
      }
    },
    {
      setup:    'intro',
      check: {
        typed:  'intro',
        markup: 'VVVVV',
        status: 'VALID',
        hints: ''
      },
      exec: {
        output: [
          /command\s*line/,
          /help/,
          /F1/,
          /Escape/
        ]
      }
    }
  ]);
};


});
