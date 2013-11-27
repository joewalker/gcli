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

// Patch-up IE9
require('./util/legacy');

var api = require('./api');
api.populateApi(exports);

var items = [
  require('./types/delegate').items,
  require('./types/selection').items,

  require('./fields/delegate').items,
  require('./fields/selection').items,

  require('./types/array').items,
  require('./types/boolean').items,
  require('./types/command').items,
  require('./types/date').items,
  require('./types/file').items,
  require('./types/javascript').items,
  require('./types/node').items,
  require('./types/number').items,
  require('./types/resource').items,
  require('./types/setting').items,
  require('./types/string').items,

  require('./converters/converters').items,
  require('./converters/basic').items,
  require('./converters/html').items,
  require('./converters/terminal').items,

  require('./languages/command').items,
  require('./languages/javascript').items,

  require('./ui/intro').items,
  require('./ui/focus').items,

  require('./connectors/xhr').items,
  require('./connectors/websocket').items,

  require('./cli').items
].reduce(function(prev, curr) { return prev.concat(curr); }, []);

exports.addItems(items);
