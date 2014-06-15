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

exports.testDefault = function(options) {
  return helpers.audit(options, [
    {
      skipRemainingIf: options.isNode || options.isPhantomjs,
      setup:    'urlcommand',
      check: {
        input:  'urlcommand',
        markup: 'VVVVVVVVVV',
        hints:              ' <url>',
        status: 'ERROR',
        args: {
          url: {
            value: undefined,
            arg: '',
            status: 'INCOMPLETE'
          }
        }
      }
    },
    {
      setup:    'urlcommand example',
      check: {
        input:  'urlcommand example',
        markup: 'VVVVVVVVVVVIIIIIII',
        hints:                    ' -> http://localhost:9999/example',
        status: 'ERROR',
        args: {
          url: {
            value: undefined,
            arg: ' example',
            status: 'INCOMPLETE'
          }
        }
      },
    },
    {
      setup:    'urlcommand example.com/',
      check: {
        input:  'urlcommand example.com/',
        markup: 'VVVVVVVVVVVIIIIIIIIIIII',
        hints:                         ' -> http://example.com/',
        status: 'ERROR',
        args: {
          url: {
            value: undefined,
            arg: ' example.com/',
            status: 'INCOMPLETE'
          }
        }
      },
    },
    {
      setup:    'urlcommand http://example.com/index?q=a#hash',
      check: {
        input:  'urlcommand http://example.com/index?q=a#hash',
        markup: 'VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV',
        hints:                                              '',
        status: 'VALID',
        args: {
          url: {
            value: function(data) {
              assert.is(data.hash, '#hash', 'url hash');
            },
            arg: ' http://example.com/index?q=a#hash',
            status: 'VALID'
          }
        }
      },
      exec: { output: /"url": ?/ }
    }
  ]);
};
