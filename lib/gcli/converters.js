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
var Promise = require('util/promise');

// It's probably easiest to read this bottom to top

/**
 * Best guess at creating a DOM element from random data
 */
var fallbackDomConverter = {
  from: '*',
  to: 'dom',
  exec: function(data, context) {
    if (data == null) {
      return context.document.createTextNode('');
    }

    if (typeof HTMLElement !== 'undefined' && data instanceof HTMLElement) {
      return data;
    }

    var node = util.createElement(context.document, 'p');
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
  exec: function(data, context) {
    if (data.isView) {
      return data.toDom(context.document).textContent;
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
  exec: function(data, context) {
    return data.toDom(context.document);
  }
};

/**
 * Convert a terminal object (to help traditional CLI integration) to an element
 */
var terminalDomConverter = {
  from: 'terminal',
  to: 'dom',
  createTextArea: function(text) {
    var node = util.createElement(context.document, 'textarea');
    node.classList.add('gcli-row-subterminal');
    node.readOnly = true;
    node.textContent = text;
    return node;
  },
  exec: function(data, context) {
    if (Array.isArray(data)) {
      var node = util.createElement(context.document, 'div');
      data.forEach(function(member) {
        node.appendChild(this.createTextArea(member));
      });
      return node;
    }
    return this.createTextArea(data);
  }
};

/**
 * Convert a string to a DOM element
 */
var stringDomConverter = {
  from: 'string',
  to: 'dom',
  exec: function(data, context) {
    var node = util.createElement(context.document, 'p');
    node.textContent = data;
    return node;
  }
};

/**
 * Convert a string to a DOM element
 */
var exceptionDomConverter = {
  from: 'exception',
  to: 'dom',
  exec: function(ex, context) {
    var node = util.createElement(context.document, 'p');
    node.className = "gcli-exception";
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
    exec: function(data, context) {
      var intermediate = first.exec(data, context);
      return second.exec(intermediate, context);
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
    return getFallbackConverter(to);
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
    return getFallbackConverter(to);
  }
  return converter;
}

/**
 * Helper for getConverter to pick the best fallback converter
 */
function getFallbackConverter(to) {
  if (to == 'dom') {
    return fallbackDomConverter;
  }
  if (to == 'string') {
    return fallbackStringConverter;
  }
  throw new Error('No conversion possible from ' + from + ' to ' + to + '.');
}

/**
 * Convert some data from one type to another
 * @param data The object to convert
 * @param from The type of the data right now
 * @param to The type that we would like the data in
 * @param context An execution context (i.e. simplified requisition) which is
 * often required for access to a document, or createView function
 */
exports.convert = function(data, from, to, context) {
  if (from === to) {
    return Promise.resolve(data);
  }
  return Promise.resolve(getConverter(from, to).exec(data, context));
};

exports.addConverter(viewDomConverter);
exports.addConverter(terminalDomConverter);
exports.addConverter(stringDomConverter);
exports.addConverter(exceptionDomConverter);


});
