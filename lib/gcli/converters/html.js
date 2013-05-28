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

var converters = require('gcli/converters');
var util = require('util/util');

var htmlDomConverter = {
  from: 'html',
  to: 'dom',
  exec: function(html, conversionContext) {
    var div = util.createElement(conversionContext.document, 'div');
    div.innerHTML = html;
    return div;
  }
};

var htmlStringConverter = {
  from: 'html',
  to: 'string',
  exec: function(html, conversionContext) {
    var div = util.createElement(conversionContext.document, 'div');
    div.innerHTML = html;
    return div.textContent;
  }
};

exports.startup = function() {
  converters.addConverter(htmlDomConverter);
  converters.addConverter(htmlStringConverter);
};

exports.shutdown = function() {
  converters.removeConverter(htmlDomConverter);
  converters.removeConverter(htmlStringConverter);
};


});
