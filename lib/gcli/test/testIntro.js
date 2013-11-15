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

var helpers = require('./helpers');
var canon = require('../canon').centralCanon;

exports.testIntroStatus = function(options) {
  return helpers.audit(options, [
    {
      skipRemainingIf: function commandIntroMissing() {
        return canon.getCommand('intro') == null;
      },
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
      skipIf: options.isNoDom,
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
