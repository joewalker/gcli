/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var domtemplate = exports;


// WARNING: do not 'use_strict' without reading the notes in envEval;

/**
 * A templater that allows one to quickly template DOM nodes.
 */
function Templater() {
  this.stack = [];
}

/**
 * Recursive function to walk the tree processing the attributes as it goes.
 * @param node the node to process. If you pass a string in instead of a DOM
 * element, it is assumed to be an id for use with document.getElementById()
 * @param data the data to use for node processing.
 */
Templater.prototype.processNode = function(node, data) {
  if (typeof node === 'string') {
    node = document.getElementById(node);
  }
  if (data == null) {
    data = {};
  }
  this.stack.push(node.nodeName + (node.id ? '#' + node.id : ''));
  try {
    // Process attributes
    if (node.attributes && node.attributes.length) {
      // We need to handle 'foreach' and 'if' first because they might stop
      // some types of processing from happening, and foreach must come first
      // because it defines new data on which 'if' might depend.
      if (node.hasAttribute('foreach')) {
        this._processForEach(node, data);
        return;
      }
      if (node.hasAttribute('if')) {
        if (!this._processIf(node, data)) {
          return;
        }
      }
      // Only make the node available once we know it's not going away
      data.__element = node;
      // It's good to clean up the attributes when we've processed them,
      // but if we do it straight away, we mess up the array index
      var attrs = Array.prototype.slice.call(node.attributes);
      for (var i = 0; i < attrs.length; i++) {
        var value = attrs[i].value;
        var name = attrs[i].name;
        this.stack.push(name);
        try {
          if (name === 'save') {
            // Save attributes are a setter using the node
            value = this.stripBraces(value);
            this.property(value, data, node);
            node.removeAttribute('save');
          } else if (name.substring(0, 2) === 'on') {
            // Event registration relies on property doing a bind
            value = this.stripBraces(value);
            var func = this.property(value, data);
            if (typeof func !== 'function') {
              this.handleError('Expected ' + value +
                ' to resolve to a function, but got ' + typeof func);
            }
            node.removeAttribute(name);
            var capture = node.hasAttribute('capture' + name.substring(2));
            node.addEventListener(name.substring(2), func, capture);
            if (capture) {
              node.removeAttribute('capture' + name.substring(2));
            }
          } else {
            // Replace references in all other attributes
            var self = this;
            var newValue = value.replace(/\$\{[^}]*\}/g, function(path) {
              return self.envEval(path.slice(2, -1), data, value);
            });
            // Remove '_' prefix of attribute names so the DOM won't try
            // to use them before we've processed the template
            if (name.charAt(0) === '_') {
              node.removeAttribute(name);
              node.setAttribute(name.substring(1), newValue);
            } else if (value !== newValue) {
              attrs[i].value = newValue;
            }
          }
        } finally {
          this.stack.pop();
        }
      }
    }

    // Loop through our children calling processNode. First clone them, so the
    // set of nodes that we visit will be unaffected by additions or removals.
    var childNodes = Array.prototype.slice.call(node.childNodes);
    for (var j = 0; j < childNodes.length; j++) {
      this.processNode(childNodes[j], data);
    }

    if (node.nodeType === 3 /*Node.TEXT_NODE*/) {
      this.processTextNode(node, data);
    }
  } finally {
    this.stack.pop();
  }
};

/**
 * Handle <x if="${...}">
 * @param node An element with an 'if' attribute
 * @param data The data to use with envEval
 * @returns true if processing should continue, false otherwise
 */
Templater.prototype._processIf = function(node, data) {
  this.stack.push('if');
  try {
    var originalValue = node.getAttribute('if');
    var value = this.stripBraces(originalValue);
    var recurse = true;
    try {
      var reply = this.envEval(value, data, originalValue);
      recurse = !!reply;
    } catch (ex) {
      this.handleError('Error with \'' + value + '\'', ex);
      recurse = false;
    }
    if (!recurse) {
      node.parentNode.removeChild(node);
    }
    node.removeAttribute('if');
    return recurse;
  } finally {
    this.stack.pop();
  }
};

/**
 * Handle <x foreach="param in ${array}"> and the special case of
 * <loop foreach="param in ${array}">.
 * This function is responsible for extracting what it has to do from the
 * attributes, and getting the data to work on (including resolving promises
 * in getting the array). It delegates to _processForEachLoop to actually
 * unroll the data.
 * @param node An element with a 'foreach' attribute
 * @param data The data to use with envEval
 */
Templater.prototype._processForEach = function(node, data) {
  this.stack.push('foreach');
  try {
    var originalValue = node.getAttribute('foreach');
    var value = originalValue;

    var paramName = 'param';
    if (value.charAt(0) === '$') {
      // No custom loop variable name. Use the default: 'param'
      value = this.stripBraces(value);
    } else {
      // Extract the loop variable name from 'NAME in ${ARRAY}'
      var nameArr = value.split(' in ');
      paramName = nameArr[0].trim();
      value = this.stripBraces(nameArr[1].trim());
    }
    node.removeAttribute('foreach');
    try {
      var evaled = this.envEval(value, data, originalValue);
      if (typeof evaled.then === 'function') {
        // Placeholder element to be replaced once we have the real data
        var tempNode = node.ownerDocument.createElement('span');
        node.parentNode.insertBefore(tempNode, node);
        evaled.then(function(delayed) {
          this._processForEachLoop(delayed, node, tempNode, data, paramName);
          tempNode.parentNode.removeChild(tempNode);
        }.bind(this));
      }
      else {
        this._processForEachLoop(evaled, node, node, data, paramName);
      }
      node.parentNode.removeChild(node);
    } catch (ex) {
      this.handleError('Error with \'' + value + '\'', ex);
    }
  } finally {
    this.stack.pop();
  }
};

/**
 * Called by _processForEach to handle looping over the data in a foreach loop.
 * This works with both arrays and objects.
 * Calls _processForEachMember() for each member of 'set'
 * @param set The object containing the data to loop over
 * @param template The node to copy for each set member
 * @param sibling The sibling node to which we add things
 * @param data the data to use for node processing
 * @param paramName foreach loops have a name for the parameter currently being
 * processed. The default is 'param'. e.g. <loop foreach="param in ${x}">...
 */
Templater.prototype._processForEachLoop = function(set, template, sibling, data, paramName) {
  if (Array.isArray(set)) {
    set.forEach(function(member, i) {
      this._processForEachMember(member, template, sibling, data, paramName, '' + i);
    }, this);
  } else {
    for (var member in set) {
      if (set.hasOwnProperty(member)) {
        this._processForEachMember(member, template, sibling, data, paramName, member);
      }
    }
  }
};

/**
 * Called by _processForEachLoop() to resolve any promises in the array (the
 * array itself can also be a promise, but that is resolved by
 * _processForEach()). This calls _processForEachInner() with the actual data
 * once we have it.
 * @param member The data item to use in templating
 * @param template The node to copy for each set member
 * @param sibling The parent node to which we add things
 * @param data the data to use for node processing
 * @param paramName The name given to 'member' by the foreach attribute
 * @param frame A name to push on the stack for debugging
 */
Templater.prototype._processForEachMember = function(member, template, sibling, data, paramName, frame) {
  this.stack.push(frame);
  try {
    if (typeof member.then === 'function') {
      // Placeholder element to be replaced once we have the real data
      var tempNode = sibling.ownerDocument.createElement('span');
      sibling.parentNode.insertBefore(tempNode, sibling);
      member.then(function(delayed) {
        data[paramName] = delayed;
        this._processForEachInner(template, tempNode, data);
        delete data[paramName];
        tempNode.parentNode.removeChild(tempNode);
      }.bind(this));
    }
    else {
      data[paramName] = member;
      this._processForEachInner(template, sibling, data);
      delete data[paramName];
    }
  } finally {
    this.stack.pop();
  }
};

/**
 * Called by _processForEachMember() to handle <LOOP> elements (which are taken
 * out of the DOM tree), clone the template, and pass the processing back
 * to processNode().
 * @param template The node to copy for each set member
 * @param sibling The parent node to which we add things
 * @param data the data to use for node processing
 */
Templater.prototype._processForEachInner = function(template, sibling, data) {
  if (sibling.nodeName === 'LOOP') {
    for (var i = 0; i < sibling.childNodes.length; i++) {
      var clone = sibling.childNodes[i].cloneNode(true);
      sibling.parentNode.insertBefore(clone, sibling);
      this.processNode(clone, data);
    }
  } else {
    var clone = template.cloneNode(true);
    clone.removeAttribute('foreach');
    sibling.parentNode.insertBefore(clone, sibling);
    this.processNode(clone, data);
  }
};

/**
 * Take a text node and replace it with another text node with the ${...}
 * sections parsed out. We replace the node by altering node.parentNode but
 * we could probably use a DOM Text API to achieve the same thing.
 * @param node The Text node to work on
 * @param data the data to use for node processing
 */
Templater.prototype.processTextNode = function(node, data) {
  // Replace references in other attributes
  var value = node.data;
  // We can't use the string.replace() with function trick (see generic
  // attribute processing in processNode()) because we need to support
  // functions that return DOM nodes, so we can't have the conversion to a
  // string.
  // Instead we process the string as an array of parts. In order to split
  // the string up, we first replace '${' with '\uF001$' and '}' with '\uF002'
  // We can then split using \uF001 or \uF002 to get an array of strings
  // where scripts are prefixed with $.
  // \uF001 and \uF002 are just unicode chars reserved for private use.
  value = value.replace(/\$\{([^}]*)\}/g, '\uF001$$$1\uF002');
  var parts = value.split(/\uF001|\uF002/);
  if (parts.length > 1) {
    parts.forEach(function(part) {
      if (part === null || part === undefined || part === '') {
        return;
      }
      if (part.charAt(0) === '$') {
        part = this.envEval(part.slice(1), data, node.data);
      }
      if (typeof part.then === 'function') {
        // Placeholder element to be replaced once we have the real data
        var tempNode = node.ownerDocument.createElement('span');
        node.parentNode.insertBefore(tempNode, node);
        part.then(function(reply) {
          reply = this.toNode(reply, tempNode.ownerDocument);
          tempNode.parentNode.insertBefore(reply, tempNode);
          tempNode.parentNode.removeChild(tempNode);
        }.bind(this));
        part = tempNode;
      }
      part = this.toNode(part, node.ownerDocument);
      node.parentNode.insertBefore(part, node);
    }, this);
    node.parentNode.removeChild(node);
  }
};

/**
 * Helper to convert a 'thing' to a DOM Node.
 * This is (obviously) a no-op for DOM Elements (which are detected using
 * 'typeof thing.cloneNode !== "function"' (is there a better way that will
 * work in all environments, including a .jsm?)
 * Non DOM elements are converted to a string and wrapped in a TextNode.
 */
Templater.prototype.toNode = function(thing, document) {
  if (thing == null) {
    thing = '' + thing;
  }
  // if (isDOMElement(reply)) { ... }
  if (typeof thing.cloneNode !== 'function') {
    thing = document.createTextNode(thing.toString());
  }
  return thing;
};

/**
 * Warn of string does not begin '${' and end '}'
 * @param str the string to check.
 * @return The string stripped of ${ and }, or untouched if it does not match
 */
Templater.prototype.stripBraces = function(str) {
  if (!str.match(/\$\{.*\}/g)) {
    this.handleError('Expected ' + str + ' to match ${...}');
    return str;
  }
  return str.slice(2, -1);
};

/**
 * Combined getter and setter that works with a path through some data set.
 * For example:
 * <ul>
 * <li>property('a.b', { a: { b: 99 }}); // returns 99
 * <li>property('a', { a: { b: 99 }}); // returns { b: 99 }
 * <li>property('a', { a: { b: 99 }}, 42); // returns 99 and alters the
 * input data to be { a: { b: 42 }}
 * </ul>
 * @param path An array of strings indicating the path through the data, or
 * a string to be cut into an array using <tt>split('.')</tt>
 * @param data the data to use for node processing
 * @param newValue (optional) If defined, this value will replace the
 * original value for the data at the path specified.
 * @return The value pointed to by <tt>path</tt> before any
 * <tt>newValue</tt> is applied.
 */
Templater.prototype.property = function(path, data, newValue) {
  this.stack.push(path);
  try {
    if (typeof path === 'string') {
      path = path.split('.');
    }
    var value = data[path[0]];
    if (path.length === 1) {
      if (newValue !== undefined) {
        data[path[0]] = newValue;
      }
      if (typeof value === 'function') {
        return function() {
          return value.apply(data, arguments);
        };
      }
      return value;
    }
    if (!value) {
      this.handleError('Can\'t find path=' + path);
      return null;
    }
    return this.property(path.slice(1), value, newValue);
  } finally {
    this.stack.pop();
  }
};

/**
 * Like eval, but that creates a context of the variables in <tt>env</tt> in
 * which the script is evaluated.
 * WARNING: This script uses 'with' which is generally regarded to be evil.
 * The alternative is to create a Function at runtime that takes X parameters
 * according to the X keys in the env object, and then call that function using
 * the values in the env object. This is likely to be slow, but workable.
 * @param script The string to be evaluated
 * @param data the data to use for node processing
 * @param frame Optional debugging string in case of failure
 * @return The return value of the script, or the error message if the script
 * execution failed.
 */
Templater.prototype.envEval = function(script, data, frame) {
  with (data) {
    try {
      this.stack.push(frame);
      return eval(script);
    } catch (ex) {
      this.handleError('Template error evaluating \'' + script + '\'' +
          ' environment=' + Object.keys(data).join(', '), ex);
      return script;
    } finally {
      this.stack.pop();
    }
  }
};

/**
 * A generic way of reporting errors, for easy overloading in different
 * environments.
 * @param message the error message to report.
 * @param ex optional associated exception.
 */
Templater.prototype.handleError = function(message, ex) {
  this.logError(message);
  this.logError('In: ' + this.stack.join(' > '));
  if (ex) {
    this.logError(ex);
  }
};


/**
 * A generic way of reporting errors, for easy overloading in different
 * environments.
 * @param message the error message to report.
 */
Templater.prototype.logError = function(message) {
  console.log(message);
};

domtemplate.Templater = Templater;


});
