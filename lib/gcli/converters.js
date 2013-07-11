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
var promise = require('util/promise');

// It's probably easiest to read this bottom to top

/**
 * Best guess at creating a DOM element from random data
 */
var fallbackDomConverter = {
  from: '*',
  to: 'dom',
  exec: function(data, conversionContext) {
    if (data == null) {
      return conversionContext.document.createTextNode('');
    }

    if (typeof HTMLElement !== 'undefined' && data instanceof HTMLElement) {
      return data;
    }

    var node = util.createElement(conversionContext.document, 'p');
    util.setContents(node, data.toString());
    return node;
  }
};

/**
 * Best guess at creating a string from random data
 */
var fallbackStringConverter = {
  from: '*',
  to: 'string',
  exec: function(data, conversionContext) {
    if (data.isView) {
      return data.toDom(conversionContext.document).textContent;
    }

    if (typeof HTMLElement !== 'undefined' && data instanceof HTMLElement) {
      return data.textContent;
    }

    return data == null ? '' : data.toString();
  }
};

/**
 * Convert a view object to a DOM element
 */
var viewDomConverter = {
  from: 'view',
  to: 'dom',
  exec: function(view, conversionContext) {
    return view.toDom(conversionContext.document);
  }
};

/**
 * Convert a view object to a string
 */
var viewStringConverter = {
  from: 'view',
  to: 'string',
  exec: function(view, conversionContext) {
    return view.toDom(conversionContext.document).textContent;
  }
};

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
  exec: function(data, context) {
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
  exec: function(data, context) {
    return Array.isArray(data) ? data.join('') : '' + data;
  }
};

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
 * Create a new converter by using 2 converters, one after the other
 */
function getChainConverter(first, second) {
  if (first.to !== second.from) {
    throw new Error('Chain convert impossible: ' + first.to + '!=' + second.from);
  }
  return {
    from: first.from,
    to: second.to,
    exec: function(data, conversionContext) {
      var intermediate = first.exec(data, conversionContext);
      return second.exec(intermediate, conversionContext);
    }
  };
}

/**
 * This is where we cache the converters that we know about
 */
var converters = {
  from: {}
};

/**
 * Add a new converter to the cache
 */
exports.addConverter = function(converter) {
  var fromMatch = converters.from[converter.from];
  if (fromMatch == null) {
    fromMatch = {};
    converters.from[converter.from] = fromMatch;
  }

  fromMatch[converter.to] = converter;
};

/**
 * Remove an existing converter from the cache
 */
exports.removeConverter = function(converter) {
  var fromMatch = converters.from[converter.from];
  if (fromMatch == null) {
    return;
  }

  if (fromMatch[converter.to] === converter) {
    fromMatch[converter.to] = null;
  }
};

/**
 * Work out the best converter that we've got, for a given conversion.
 */
function getConverter(from, to) {
  var fromMatch = converters.from[from];
  if (fromMatch == null) {
    return getFallbackConverter(from, to);
  }

  var converter = fromMatch[to];
  if (converter == null) {
    // Someone is going to love writing a graph search algorithm to work out
    // the smallest number of conversions, or perhaps the least 'lossy'
    // conversion but for now the only 2 step conversion is foo->view->dom,
    // which we are going to special case.
    if (to === 'dom') {
      converter = fromMatch['view'];
      if (converter != null) {
        return getChainConverter(converter, viewDomConverter);
      }
    }
    if (to === 'string') {
      converter = fromMatch['view'];
      if (converter != null) {
        return getChainConverter(converter, viewStringConverter);
      }
    }
    return getFallbackConverter(from, to);
  }
  return converter;
}

/**
 * Helper for getConverter to pick the best fallback converter
 */
function getFallbackConverter(from, to) {
  console.error('No converter from ' + from + ' to ' + to + '. Using fallback');

  if (to === 'dom') {
    return fallbackDomConverter;
  }

  if (to === 'string') {
    return fallbackStringConverter;
  }

  throw new Error('No conversion possible from ' + from + ' to ' + to + '.');
}

/**
 * Convert some data from one type to another
 * @param data The object to convert
 * @param from The type of the data right now
 * @param to The type that we would like the data in
 * @param conversionContext An execution context (i.e. simplified requisition) which is
 * often required for access to a document, or createView function
 */
exports.convert = function(data, from, to, conversionContext) {
  if (from === to) {
    return promise.resolve(data);
  }
  return promise.resolve(getConverter(from, to).exec(data, conversionContext));
};

exports.addConverter(viewDomConverter);
exports.addConverter(viewStringConverter);
exports.addConverter(terminalDomConverter);
exports.addConverter(terminalStringConverter);
exports.addConverter(stringDomConverter);
exports.addConverter(numberDomConverter);
exports.addConverter(booleanDomConverter);
exports.addConverter(undefinedDomConverter);
exports.addConverter(errorDomConverter);


});
