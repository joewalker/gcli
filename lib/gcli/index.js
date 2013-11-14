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

require('./settings').startup();

var api = require('./api');
api.populateApi(exports);

exports.addItems(require('./types/delegate').items);
exports.addItems(require('./types/selection').items);

exports.addItems(require('./fields/delegate').items);
exports.addItems(require('./fields/selection').items);

exports.addItems(require('./types/array').items);
exports.addItems(require('./types/boolean').items);
exports.addItems(require('./types/command').items);
exports.addItems(require('./types/date').items);
exports.addItems(require('./types/file').items);
exports.addItems(require('./types/javascript').items);
exports.addItems(require('./types/node').items);
exports.addItems(require('./types/number').items);
exports.addItems(require('./types/remote').items);
exports.addItems(require('./types/resource').items);
exports.addItems(require('./types/setting').items);
exports.addItems(require('./types/string').items);

exports.addItems(require('./converters/converters').items);
exports.addItems(require('./converters/basic').items);
exports.addItems(require('./converters/html').items);
exports.addItems(require('./converters/terminal').items);

exports.addItems(require('./languages/command').items);
exports.addItems(require('./languages/javascript').items);

exports.addItems(require('./ui/intro').items);
exports.addItems(require('./ui/focus').items);

exports.addItems(require('./connectors/xhr').items);
exports.addItems(require('./connectors/websocket').items);

exports.addItems(require('./cli').items);
