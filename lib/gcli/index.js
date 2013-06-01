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

'use strict';

// Patch-up IE9
require('util/legacy');

require('gcli/settings').startup();

var api = require('gcli/api');
api.populateApi(exports);

exports.addItems(require('gcli/types/selection').items);
exports.addItems(require('gcli/types/delegate').items);

exports.addItems(require('gcli/types/array').items);
exports.addItems(require('gcli/types/boolean').items);
exports.addItems(require('gcli/types/command').items);
exports.addItems(require('gcli/types/date').items);
exports.addItems(require('gcli/types/javascript').items);
exports.addItems(require('gcli/types/node').items);
exports.addItems(require('gcli/types/number').items);
exports.addItems(require('gcli/types/resource').items);
exports.addItems(require('gcli/types/setting').items);
exports.addItems(require('gcli/types/string').items);

exports.addItems(require('gcli/converters').items);
exports.addItems(require('gcli/converters/basic').items);
exports.addItems(require('gcli/converters/html').items);
exports.addItems(require('gcli/converters/terminal').items);

exports.addItems(require('gcli/ui/intro').items);
exports.addItems(require('gcli/ui/focus').items);

exports.addItems(require('gcli/ui/fields/basic').items);
exports.addItems(require('gcli/ui/fields/javascript').items);
exports.addItems(require('gcli/ui/fields/selection').items);

exports.addItems(require('gcli/cli').items);

var display = require('gcli/ui/display');
exports.createDisplay = function(options) {
  return display.createDisplay(options || {});
};


});
