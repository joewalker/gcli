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

var util = require('util/util');
var converters = require('gcli/converters');

/**
 * Several converters are just data.toString inside a 'p' element
 */
function nodeFromDataToString(data, conversionContext) {
  var node = util.createElement(conversionContext.document, 'p');
  node.textContent = data.toString();
  return node;
}

/**
 * Convert a string to a DOM element
 */
var stringDomConverter = {
  from: 'string',
  to: 'dom',
  exec: nodeFromDataToString
};

/**
 * Convert a number to a DOM element
 */
var numberDomConverter = {
  from: 'number',
  to: 'dom',
  exec: nodeFromDataToString
};

/**
 * Convert a number to a DOM element
 */
var booleanDomConverter = {
  from: 'boolean',
  to: 'dom',
  exec: nodeFromDataToString
};

/**
 * Convert a number to a DOM element
 */
var undefinedDomConverter = {
  from: 'undefined',
  to: 'dom',
  exec: function(data, conversionContext) {
    return util.createElement(conversionContext.document, 'span');
  }
};

/**
 * Convert a string to a DOM element
 */
var errorDomConverter = {
  from: 'error',
  to: 'dom',
  exec: function(ex, conversionContext) {
    var node = util.createElement(conversionContext.document, 'p');
    node.className = "gcli-error";
    node.textContent = ex;
    return node;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  converters.addConverter(stringDomConverter);
  converters.addConverter(numberDomConverter);
  converters.addConverter(booleanDomConverter);
  converters.addConverter(undefinedDomConverter);
  converters.addConverter(errorDomConverter);
};

exports.shutdown = function() {
  converters.removeConverter(stringDomConverter);
  converters.removeConverter(numberDomConverter);
  converters.removeConverter(booleanDomConverter);
  converters.removeConverter(undefinedDomConverter);
  converters.removeConverter(errorDomConverter);
};


});
