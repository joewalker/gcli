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

/**
 * This loader is something of a hack to allow RequireJS to know what resources
 * to load before it loads this module (the the modules that depend on it)
 *
 * This is likely to be temporary in its current form. Other loaders (i.e
 * in Firefox) are asynchronous (unless we find a delayed loading trick) and
 * allowing promise based returns could allow for a less hacky implementation
 * here.
 */
exports.staticRequire = function(name) {
  if (name === 'gcli/ui/terminal.html') {
    return require('text!gcli/ui/terminal.html');
  }
  if (name === 'gcli/ui/terminal.css') {
    return require('text!gcli/ui/terminal.css');
  }
  if (name === 'gcli/ui/fields/menu.html') {
    return require('text!gcli/ui/fields/menu.html');
  }
  if (name === 'gcli/ui/fields/menu.css') {
    return require('text!gcli/ui/fields/menu.css');
  }
  throw new Error('Unexpected requirement: ' + name);
};

});
