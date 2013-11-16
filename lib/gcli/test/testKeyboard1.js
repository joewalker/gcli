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
var mockCommands = require('./mockCommands');

exports.setup = function(options) {
  mockCommands.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown(options);
};

// Bug 664377: Add tests for internal completion. i.e. "tsela<TAB> 1"

exports.testSimple = function(options) {
  return helpers.audit(options, [
    {
      setup: 'tsela<TAB>',
      check: { input: 'tselarr ', cursor: 8 }
    },
    {
      setup: 'tsn di<TAB>',
      check: { input: 'tsn dif ', cursor: 8 }
    },
    {
      setup: 'tsg a<TAB>',
      check: { input: 'tsg aaa ', cursor: 8 }
    }
  ]);
};

exports.testComplete = function(options) {
  return helpers.audit(options, [
    {
      setup: 'tsn e<DOWN><DOWN><DOWN><DOWN><DOWN><TAB>',
      check: { input: 'tsn exte ' }
    },
    {
      setup: 'tsn e<DOWN><DOWN><DOWN><DOWN><TAB>',
      check: { input: 'tsn ext ' }
    },
    {
      setup: 'tsn e<DOWN><DOWN><DOWN><TAB>',
      check: { input: 'tsn extend ' }
    },
    {
      setup: 'tsn e<DOWN><DOWN><TAB>',
      check: { input: 'tsn exten ' }
    },
    {
      setup: 'tsn e<DOWN><TAB>',
      check: { input: 'tsn exte ' }
    },
    {
      setup: 'tsn e<TAB>',
      check: { input: 'tsn ext ' }
    },
    {
      setup: 'tsn e<UP><TAB>',
      check: { input: 'tsn extend ' }
    },
    {
      setup: 'tsn e<UP><UP><TAB>',
      check: { input: 'tsn exten ' }
    },
    {
      setup: 'tsn e<UP><UP><UP><TAB>',
      check: { input: 'tsn exte ' }
    },
    {
      setup: 'tsn e<UP><UP><UP><UP><TAB>',
      check: { input: 'tsn ext ' }
    },
    {
      setup: 'tsn e<UP><UP><UP><UP><UP><TAB>',
      check: { input: 'tsn extend ' }
    },
    {
      setup: 'tsn e<UP><UP><UP><UP><UP><UP><TAB>',
      check: { input: 'tsn exten ' }
    },
    {
      setup: 'tsn e<UP><UP><UP><UP><UP><UP><UP><TAB>',
      check: { input: 'tsn exte ' }
    },
    {
      setup: 'tsn e<UP><UP><UP><UP><UP><UP><UP><UP><TAB>',
      check: { input: 'tsn ext ' }
    }
  ]);
};
