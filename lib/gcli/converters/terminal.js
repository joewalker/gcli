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

/**
 * Convert a terminal object (to help traditional CLI integration) to an element
 */
var terminalDomConverter = {
  from: 'terminal',
  to: 'dom',
  createTextArea: function(text, conversionContext) {
    var node = util.createElement(conversionContext.document, 'textarea');
    node.classList.add('gcli-row-subterminal');
    node.readOnly = true;
    node.textContent = text;
    return node;
  },
  exec: function(data, conversionContext) {
    if (Array.isArray(data)) {
      var node = util.createElement(conversionContext.document, 'div');
      data.forEach(function(member) {
        node.appendChild(this.createTextArea(member, conversionContext));
      });
      return node;
    }
    return this.createTextArea(data);
  }
};

/**
 * Convert a terminal object to a string
 */
var terminalStringConverter = {
  from: 'terminal',
  to: 'string',
  exec: function(data, conversionContext) {
    return Array.isArray(data) ? data.join('') : '' + data;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  converters.addConverter(terminalDomConverter);
  converters.addConverter(terminalStringConverter);
};

exports.shutdown = function() {
  converters.removeConverter(terminalDomConverter);
  converters.removeConverter(terminalStringConverter);
};


});
