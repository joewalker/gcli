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

  // The API for use by command authors
  exports.addCommand = require('gcli/canon').addCommand;
  exports.removeCommand = require('gcli/canon').removeCommand;
  exports.addConverter = require('gcli/converters').addConverter;
  exports.removeConverter = require('gcli/converters').removeConverter;
  exports.addType = require('gcli/types').addType;
  exports.removeType = require('gcli/types').removeType;

  // The first group are depended on by others so they must be registered first
  require('gcli/types/basic').startup();
  require('gcli/types/selection').startup();

  require('gcli/types/command').startup();
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/types/resource').startup();
  require('gcli/types/setting').startup();

  require('gcli/settings').startup();
  require('gcli/cli').startup();
  require('gcli/ui/intro').startup();
  require('gcli/ui/focus').startup();
  require('gcli/ui/fields/basic').startup();
  require('gcli/ui/fields/javascript').startup();
  require('gcli/ui/fields/selection').startup();

  var display = require('gcli/ui/display');

  /**
   * Create a basic UI for GCLI on the web
   */
  exports.createDisplay = function(options) {
    return display.createDisplay(options || {});
  };

  /**
   * @deprecated Use createDisplay
   */
  exports.createView = exports.createDisplay;

});
