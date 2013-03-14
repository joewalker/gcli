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

/*
 * A number of DOM manipulation and event handling utilities.
 */

//------------------------------------------------------------------------------

var eventDebug = false;

/**
 * Patch up broken console API from node
 */
if (eventDebug) {
  if (console.group == null) {
    console.group = function() { console.log(arguments); };
  }
  if (console.groupEnd == null) {
    console.groupEnd = function() { console.log(arguments); };
  }
}

/**
 * Useful way to create a name for a handler, used in createEvent()
 */
function nameFunction(handler) {
  var scope = handler.scope ? handler.scope.constructor.name + '.' : '';
  var name = handler.func.name;
  if (name) {
    return scope + name;
  }
  for (var prop in handler.scope) {
    if (handler.scope[prop] === handler.func) {
      return scope + prop;
    }
  }
  return scope + handler.func;
}

/**
 * Create an event.
 * For use as follows:
 *
 *   function Hat() {
 *     this.putOn = createEvent('Hat.putOn');
 *     ...
 *   }
 *   Hat.prototype.adorn = function(person) {
 *     this.putOn({ hat: hat, person: person });
 *     ...
 *   }
 *
 *   var hat = new Hat();
 *   hat.putOn.add(function(ev) {
 *     console.log('The hat ', ev.hat, ' has is worn by ', ev.person);
 *   }, scope);
 *
 * @param name Optional name to help with debugging
 */
exports.createEvent = function(name) {
  var handlers = [];
  var holdFire = false;
  var heldEvents = [];
  var eventCombiner = undefined;

  /**
   * This is how the event is triggered.
   * @param ev The event object to be passed to the event listeners
   */
  var event = function(ev) {
    if (holdFire) {
      heldEvents.push(ev);
      if (eventDebug) {
        console.log('Held fire: ' + name, ev);
      }
      return;
    }

    if (eventDebug) {
      console.group('Fire: ' + name + ' to ' + handlers.length + ' listeners', ev);
    }

    // Use for rather than forEach because it step debugs better, which is
    // important for debugging events
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      if (eventDebug) {
        console.log(nameFunction(handler));
      }
      handler.func.call(handler.scope, ev);
    }

    if (eventDebug) {
      console.groupEnd();
    }
  };

  /**
   * Add a new handler function
   * @param func The function to call when this event is triggered
   * @param scope Optional 'this' object for the function call
   */
  event.add = function(func, scope) {
    if (eventDebug) {
      console.log('Adding listener to ' + name);
    }

    handlers.push({ func: func, scope: scope });
  };

  /**
   * Remove a handler function added through add(). Both func and scope must
   * be strict equals (===) the values used in the call to add()
   * @param func The function to call when this event is triggered
   * @param scope Optional 'this' object for the function call
   */
  event.remove = function(func, scope) {
    if (eventDebug) {
      console.log('Removing listener from ' + name);
    }

    var found = false;
    handlers = handlers.filter(function(test) {
      var match = (test.func === func && test.scope === scope);
      if (match) {
        found = true;
      }
      return !match;
    });
    if (!found) {
      console.warn('Handler not found. Attached to ' + name);
    }
  };

  /**
   * Remove all handlers.
   * Reset the state of this event back to it's post create state
   */
  event.removeAll = function() {
    handlers = [];
  };

  /**
   * Temporarily prevent this event from firing.
   * @see resumeFire(ev)
   */
  event.holdFire = function() {
    if (eventDebug) {
      console.group('Holding fire: ' + name);
    }

    holdFire = true;
  };

  /**
   * Resume firing events.
   * If there are heldEvents, then we fire one event to cover them all. If an
   * event combining function has been provided then we use that to combine the
   * events. Otherwise the last held event is used.
   * @see holdFire()
   */
  event.resumeFire = function() {
    if (eventDebug) {
      console.groupEnd('Resume fire: ' + name);
    }

    if (holdFire !== true) {
      throw new Error('Event not held: ' + name);
    }

    holdFire = false;
    if (heldEvents.length === 0) {
      return;
    }

    if (heldEvents.length === 1) {
      event(heldEvents[0]);
    }
    else {
      var first = heldEvents[0];
      var last = heldEvents[heldEvents.length - 1];
      if (eventCombiner) {
        event(eventCombiner(first, last, heldEvents));
      }
      else {
        event(last);
      }
    }

    heldEvents = [];
  };

  /**
   * When resumeFire has a number of events to combine, by default it just
   * picks the last, however you can provide an eventCombiner which returns a
   * combined event.
   * eventCombiners will be passed 3 parameters:
   * - first The first event to be held
   * - last The last event to be held
   * - all An array containing all the held events
   * The return value from an eventCombiner is expected to be an event object
   */
  Object.defineProperty(event, 'eventCombiner', {
    set: function(newEventCombiner) {
      if (typeof newEventCombiner !== 'function') {
        throw new Error('eventCombiner is not a function');
      }
      eventCombiner = newEventCombiner;
    },

    enumerable: true
  });

  return event;
};

//------------------------------------------------------------------------------

var Promise = require('util/promise');

/**
 * Implementation of 'promised', while we wait for bug 790195 to be fixed.
 * @see Consuming promises in https://addons.mozilla.org/en-US/developers/docs/sdk/latest/modules/sdk/core/promise.html
 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=790195
 * @see https://github.com/mozilla/addon-sdk/blob/master/packages/api-utils/lib/promise.js#L179
 */
exports.promised = (function() {
  // Note: Define shortcuts and utility functions here in order to avoid
  // slower property accesses and unnecessary closure creations on each
  // call of this popular function.

  var call = Function.call;
  var concat = Array.prototype.concat;

  // Utility function that does following:
  // execute([ f, self, args...]) => f.apply(self, args)
  function execute(args) { return call.apply(call, args); }

  // Utility function that takes promise of `a` array and maybe promise `b`
  // as arguments and returns promise for `a.concat(b)`.
  function promisedConcat(promises, unknown) {
    return promises.then(function(values) {
      return Promise.resolve(unknown).then(function(value) {
        return values.concat([ value ]);
      });
    });
  }

  return function promised(f, prototype) {
    /**
    Returns a wrapped `f`, which when called returns a promise that resolves to
    `f(...)` passing all the given arguments to it, which by the way may be
    promises. Optionally second `prototype` argument may be provided to be used
    a prototype for a returned promise.

    ## Example

    var promise = promised(Array)(1, promise(2), promise(3))
    promise.then(console.log) // => [ 1, 2, 3 ]
    **/

    return function promised() {
      // create array of [ f, this, args... ]
      return concat.apply([ f, this ], arguments).
          // reduce it via `promisedConcat` to get promised array of fulfillments
          reduce(promisedConcat, Promise.resolve([], prototype)).
          // finally map that to promise of `f.apply(this, args...)`
          then(execute);
    };
  };
})();

/**
 * Convert an array of promises to a single promise, which is resolved (with an
 * array containing resolved values) only when all the component promises are
 * resolved.
 */
exports.all = exports.promised(Array);

/**
 * Utility to convert a resolved promise to a concrete value.
 * Warning: This is something of an experiment. The alternative of mixing
 * concrete/promise return values could be better.
 */
exports.synchronize = function(promise) {
  if (promise == null || typeof promise.then !== 'function') {
    return promise;
  }
  var failure = undefined;
  var reply = undefined;
  var onDone = function(value) {
    failure = false;
    reply = value;
  };
  var onError = function (value) {
    failure = true;
    reply = value;
  };
  promise.then(onDone, onError);
  if (failure === undefined) {
    throw new Error('non synchronizable promise');
  }
  if (failure) {
    throw reply;
  }
  return reply;
};

/**
 * promiseMap is roughly like Array.map except that the action is taken to be
 * something that completes asynchronously, returning a promise.
 * @param array An array of objects to enumerate
 * @param action A function to call for each member of the array
 * @param scope Optional object to use as 'this' for the function calls
 * @return A promise which is resolved (with an array of resolution values)
 * when all the array members have been passed to the action function, and
 * rejected as soon as any of the action function calls fails 
 */
exports.promiseEach = function(array, action, scope) {
  if (array.length === 0) {
    return Promise.resolve([]);
  }

  var deferred = Promise.defer();

  var callNext = function(index) {
    var replies = [];
    var promiseReply = action.call(scope, array[index]);
    Promise.resolve(promiseReply).then(function(reply) {
      replies[index] = reply;

      var nextIndex = index + 1;
      if (nextIndex >= array.length) {
        deferred.resolve(replies);
      }
      else {
        callNext(nextIndex);
      }
    }).then(null, function(ex) {
      deferred.reject(ex);
    });
  };

  callNext(0);
  return deferred.promise;
};


//------------------------------------------------------------------------------

/**
 * XHTML namespace
 */
exports.NS_XHTML = 'http://www.w3.org/1999/xhtml';

/**
 * XUL namespace
 */
exports.NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

/**
 * Create an HTML or XHTML element depending on whether the document is HTML
 * or XML based. Where HTML/XHTML elements are distinguished by whether they
 * are created using doc.createElementNS('http://www.w3.org/1999/xhtml', tag)
 * or doc.createElement(tag)
 * If you want to create a XUL element then you don't have a problem knowing
 * what namespace you want.
 * @param doc The document in which to create the element
 * @param tag The name of the tag to create
 * @returns The created element
 */
exports.createElement = function(doc, tag) {
  if (exports.isXmlDocument(doc)) {
    return doc.createElementNS(exports.NS_XHTML, tag);
  }
  else {
    return doc.createElement(tag);
  }
};

/**
 * Remove all the child nodes from this node
 * @param elem The element that should have it's children removed
 */
exports.clearElement = function(elem) {
  while (elem.hasChildNodes()) {
    elem.removeChild(elem.firstChild);
  }
};

var isAllWhitespace = /^\s*$/;

/**
 * Iterate over the children of a node looking for TextNodes that have only
 * whitespace content and remove them.
 * This utility is helpful when you have a template which contains whitespace
 * so it looks nice, but where the whitespace interferes with the rendering of
 * the page
 * @param elem The element which should have blank whitespace trimmed
 * @param deep Should this node removal include child elements
 */
exports.removeWhitespace = function(elem, deep) {
  var i = 0;
  while (i < elem.childNodes.length) {
    var child = elem.childNodes.item(i);
    if (child.nodeType === 3 /*Node.TEXT_NODE*/ &&
        isAllWhitespace.test(child.textContent)) {
      elem.removeChild(child);
    }
    else {
      if (deep && child.nodeType === 1 /*Node.ELEMENT_NODE*/) {
        exports.removeWhitespace(child, deep);
      }
      i++;
    }
  }
};

/**
 * Create a style element in the document head, and add the given CSS text to
 * it.
 * @param cssText The CSS declarations to append
 * @param doc The document element to work from
 * @param id Optional id to assign to the created style tag. If the id already
 * exists on the document, we do not add the CSS again.
 */
exports.importCss = function(cssText, doc, id) {
  if (!cssText) {
    return undefined;
  }

  doc = doc || document;

  if (!id) {
    id = 'hash-' + hash(cssText);
  }

  var found = doc.getElementById(id);
  if (found) {
    if (found.tagName.toLowerCase() !== 'style') {
      console.error('Warning: importCss passed id=' + id +
              ', but that pre-exists (and isn\'t a style tag)');
    }
    return found;
  }

  var style = exports.createElement(doc, 'style');
  style.id = id;
  style.appendChild(doc.createTextNode(cssText));

  var head = doc.getElementsByTagName('head')[0] || doc.documentElement;
  head.appendChild(style);

  return style;
};

/**
 * Simple hash function which happens to match Java's |String.hashCode()|
 * Done like this because I we don't need crypto-security, but do need speed,
 * and I don't want to spend a long time working on it.
 * @see http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 */
function hash(str) {
  var hash = 0;
  if (str.length == 0) {
    return hash;
  }
  for (var i = 0; i < str.length; i++) {
    var character = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + character;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Shortcut for clearElement/createTextNode/appendChild to make up for the lack
 * of standards around textContent/innerText
 */
exports.setTextContent = function(elem, text) {
  exports.clearElement(elem);
  var child = elem.ownerDocument.createTextNode(text);
  elem.appendChild(child);
};

/**
 * There are problems with innerHTML on XML documents, so we need to do a dance
 * using document.createRange().createContextualFragment() when in XML mode
 */
exports.setContents = function(elem, contents) {
  if (typeof HTMLElement !== 'undefined' && contents instanceof HTMLElement) {
    exports.clearElement(elem);
    elem.appendChild(contents);
    return;
  }

  if ('innerHTML' in elem) {
    elem.innerHTML = contents;
  }
  else {
    try {
      var ns = elem.ownerDocument.documentElement.namespaceURI;
      if (!ns) {
        ns = exports.NS_XHTML;
      }
      exports.clearElement(elem);
      contents = '<div xmlns="' + ns + '">' + contents + '</div>';
      var range = elem.ownerDocument.createRange();
      var child = range.createContextualFragment(contents).firstChild;
      while (child.hasChildNodes()) {
        elem.appendChild(child.firstChild);
      }
    }
    catch (ex) {
      console.error('Bad XHTML', ex);
      console.trace();
      throw ex;
    }
  }
};

/**
 * Load some HTML into the given document and return a DOM element.
 * This utility assumes that the html has a single root (other than whitespace)
 */
exports.toDom = function(document, html) {
  var div = exports.createElement(document, 'div');
  exports.setContents(div, html);
  return div.children[0];
};

/**
 * How to detect if we're in an XML document.
 * In a Mozilla we check that document.xmlVersion = null, however in Chrome
 * we use document.contentType = undefined.
 * @param doc The document element to work from (defaulted to the global
 * 'document' if missing
 */
exports.isXmlDocument = function(doc) {
  doc = doc || document;
  // Best test for Firefox
  if (doc.contentType && doc.contentType != 'text/html') {
    return true;
  }
  // Best test for Chrome
  if (doc.xmlVersion != null) {
    return true;
  }
  return false;
};

/**
 * Find the position of [element] in [nodeList].
 * @returns an index of the match, or -1 if there is no match
 */
function positionInNodeList(element, nodeList) {
  for (var i = 0; i < nodeList.length; i++) {
    if (element === nodeList[i]) {
      return i;
    }
  }
  return -1;
}

/**
 * Find a unique CSS selector for a given element
 * @returns a string such that ele.ownerDocument.querySelector(reply) === ele
 * and ele.ownerDocument.querySelectorAll(reply).length === 1
 */
exports.findCssSelector = function(ele) {
  var document = ele.ownerDocument;
  if (ele.id && document.getElementById(ele.id) === ele) {
    return '#' + ele.id;
  }

  // Inherently unique by tag name
  var tagName = ele.tagName.toLowerCase();
  if (tagName === 'html') {
    return 'html';
  }
  if (tagName === 'head') {
    return 'head';
  }
  if (tagName === 'body') {
    return 'body';
  }

  if (ele.parentNode == null) {
    console.log('danger: ' + tagName);
  }

  // We might be able to find a unique class name
  var selector, index, matches;
  if (ele.classList.length > 0) {
    for (var i = 0; i < ele.classList.length; i++) {
      // Is this className unique by itself?
      selector = '.' + ele.classList.item(i);
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
      // Maybe it's unique with a tag name?
      selector = tagName + selector;
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
      // Maybe it's unique using a tag name and nth-child
      index = positionInNodeList(ele, ele.parentNode.children) + 1;
      selector = selector + ':nth-child(' + index + ')';
      matches = document.querySelectorAll(selector);
      if (matches.length === 1) {
        return selector;
      }
    }
  }

  // So we can be unique w.r.t. our parent, and use recursion
  index = positionInNodeList(ele, ele.parentNode.children) + 1;
  selector = exports.findCssSelector(ele.parentNode) + ' > ' +
          tagName + ':nth-child(' + index + ')';

  return selector;
};

/**
 * Work out the path for images.
 */
exports.createUrlLookup = function(callingModule) {
  return function imageUrl(path) {
    try {
      return require('text!gcli/ui/' + path);
    }
    catch (ex) {
      // Under node/unamd callingModule is provided by node. This code isn't
      // the right answer but it's enough to pass all the unit tests and get
      // test coverage information, which is all we actually care about here.
      if (callingModule.filename) {
        return callingModule.filename + path;
      }

      var filename = callingModule.id.split('/').pop() + '.js';

      if (callingModule.uri.substr(-filename.length) !== filename) {
        console.error('Can\'t work out path from module.uri/module.id');
        return path;
      }

      if (callingModule.uri) {
        var end = callingModule.uri.length - filename.length - 1;
        return callingModule.uri.substr(0, end) + '/' + path;
      }

      return filename + '/' + path;
    }
  };
};

/**
 * Helper to find the 'data-command' attribute and call some action on it.
 * @see |updateCommand()| and |executeCommand()|
 */
function withCommand(element, action) {
  var command = element.getAttribute('data-command');
  if (!command) {
    command = element.querySelector('*[data-command]')
            .getAttribute('data-command');
  }

  if (command) {
    action(command);
  }
  else {
    console.warn('Missing data-command for ' + util.findCssSelector(element));
  }
}

/**
 * Update the requisition to contain the text of the clicked element
 * @param element The clicked element, containing either a data-command
 * attribute directly or in a nested element, from which we get the command
 * to be executed.
 * @param context Either a Requisition or an ExecutionContext or another object
 * that contains an |update()| function that follows a similar contract.
 */
exports.updateCommand = function(element, context) {
  withCommand(element, function(command) {
    context.update(command);
  });
};

/**
 * Execute the text contained in the element that was clicked
 * @param element The clicked element, containing either a data-command
 * attribute directly or in a nested element, from which we get the command
 * to be executed.
 * @param context Either a Requisition or an ExecutionContext or another object
 * that contains an |update()| function that follows a similar contract.
 */
exports.executeCommand = function(element, context) {
  withCommand(element, function(command) {
    context.exec({
      visible: true,
      typed: command
    });
  });
};


//------------------------------------------------------------------------------

/**
 * Keyboard handling is a mess. http://unixpapa.com/js/key.html
 * It would be good to use DOM L3 Keyboard events,
 * http://www.w3.org/TR/2010/WD-DOM-Level-3-Events-20100907/#events-keyboardevents
 * however only Webkit supports them, and there isn't a shim on Monernizr:
 * https://github.com/Modernizr/Modernizr/wiki/HTML5-Cross-browser-Polyfills
 * and when the code that uses this KeyEvent was written, nothing was clear,
 * so instead, we're using this unmodern shim:
 * http://stackoverflow.com/questions/5681146/chrome-10-keyevent-or-something-similar-to-firefoxs-keyevent
 * See BUG 664991: GCLI's keyboard handling should be updated to use DOM-L3
 * https://bugzilla.mozilla.org/show_bug.cgi?id=664991
 */
if (typeof 'KeyEvent' === 'undefined') {
  exports.KeyEvent = this.KeyEvent;
}
else {
  exports.KeyEvent = {
    DOM_VK_CANCEL: 3,
    DOM_VK_HELP: 6,
    DOM_VK_BACK_SPACE: 8,
    DOM_VK_TAB: 9,
    DOM_VK_CLEAR: 12,
    DOM_VK_RETURN: 13,
    DOM_VK_ENTER: 14,
    DOM_VK_SHIFT: 16,
    DOM_VK_CONTROL: 17,
    DOM_VK_ALT: 18,
    DOM_VK_PAUSE: 19,
    DOM_VK_CAPS_LOCK: 20,
    DOM_VK_ESCAPE: 27,
    DOM_VK_SPACE: 32,
    DOM_VK_PAGE_UP: 33,
    DOM_VK_PAGE_DOWN: 34,
    DOM_VK_END: 35,
    DOM_VK_HOME: 36,
    DOM_VK_LEFT: 37,
    DOM_VK_UP: 38,
    DOM_VK_RIGHT: 39,
    DOM_VK_DOWN: 40,
    DOM_VK_PRINTSCREEN: 44,
    DOM_VK_INSERT: 45,
    DOM_VK_DELETE: 46,
    DOM_VK_0: 48,
    DOM_VK_1: 49,
    DOM_VK_2: 50,
    DOM_VK_3: 51,
    DOM_VK_4: 52,
    DOM_VK_5: 53,
    DOM_VK_6: 54,
    DOM_VK_7: 55,
    DOM_VK_8: 56,
    DOM_VK_9: 57,
    DOM_VK_SEMICOLON: 59,
    DOM_VK_EQUALS: 61,
    DOM_VK_A: 65,
    DOM_VK_B: 66,
    DOM_VK_C: 67,
    DOM_VK_D: 68,
    DOM_VK_E: 69,
    DOM_VK_F: 70,
    DOM_VK_G: 71,
    DOM_VK_H: 72,
    DOM_VK_I: 73,
    DOM_VK_J: 74,
    DOM_VK_K: 75,
    DOM_VK_L: 76,
    DOM_VK_M: 77,
    DOM_VK_N: 78,
    DOM_VK_O: 79,
    DOM_VK_P: 80,
    DOM_VK_Q: 81,
    DOM_VK_R: 82,
    DOM_VK_S: 83,
    DOM_VK_T: 84,
    DOM_VK_U: 85,
    DOM_VK_V: 86,
    DOM_VK_W: 87,
    DOM_VK_X: 88,
    DOM_VK_Y: 89,
    DOM_VK_Z: 90,
    DOM_VK_CONTEXT_MENU: 93,
    DOM_VK_NUMPAD0: 96,
    DOM_VK_NUMPAD1: 97,
    DOM_VK_NUMPAD2: 98,
    DOM_VK_NUMPAD3: 99,
    DOM_VK_NUMPAD4: 100,
    DOM_VK_NUMPAD5: 101,
    DOM_VK_NUMPAD6: 102,
    DOM_VK_NUMPAD7: 103,
    DOM_VK_NUMPAD8: 104,
    DOM_VK_NUMPAD9: 105,
    DOM_VK_MULTIPLY: 106,
    DOM_VK_ADD: 107,
    DOM_VK_SEPARATOR: 108,
    DOM_VK_SUBTRACT: 109,
    DOM_VK_DECIMAL: 110,
    DOM_VK_DIVIDE: 111,
    DOM_VK_F1: 112,
    DOM_VK_F2: 113,
    DOM_VK_F3: 114,
    DOM_VK_F4: 115,
    DOM_VK_F5: 116,
    DOM_VK_F6: 117,
    DOM_VK_F7: 118,
    DOM_VK_F8: 119,
    DOM_VK_F9: 120,
    DOM_VK_F10: 121,
    DOM_VK_F11: 122,
    DOM_VK_F12: 123,
    DOM_VK_F13: 124,
    DOM_VK_F14: 125,
    DOM_VK_F15: 126,
    DOM_VK_F16: 127,
    DOM_VK_F17: 128,
    DOM_VK_F18: 129,
    DOM_VK_F19: 130,
    DOM_VK_F20: 131,
    DOM_VK_F21: 132,
    DOM_VK_F22: 133,
    DOM_VK_F23: 134,
    DOM_VK_F24: 135,
    DOM_VK_NUM_LOCK: 144,
    DOM_VK_SCROLL_LOCK: 145,
    DOM_VK_COMMA: 188,
    DOM_VK_PERIOD: 190,
    DOM_VK_SLASH: 191,
    DOM_VK_BACK_QUOTE: 192,
    DOM_VK_OPEN_BRACKET: 219,
    DOM_VK_BACK_SLASH: 220,
    DOM_VK_CLOSE_BRACKET: 221,
    DOM_VK_QUOTE: 222,
    DOM_VK_META: 224
  };
}


});
