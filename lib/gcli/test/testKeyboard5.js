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

exports.testCompleteDown = function(options) {
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
    }
  ]);
};
