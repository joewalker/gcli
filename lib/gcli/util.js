/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Joe Walker (jwalker@mozilla.com) (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {

/*
 * This module is a Pilot-Lite. It exports a number of objects that replicate
 * parts of the Pilot project. It aims to be mostly API compatible, while
 * removing the submodule complexity and helping us make things work inside
 * Firefox.
 * The Pilot compatible exports are: console/dom/event
 *
 * In addition it contains a small event library similar to EventEmitter but
 * which makes it harder to mistake the event in use.
 */


//------------------------------------------------------------------------------

exports.console = console;

//------------------------------------------------------------------------------

/**
 * Create an event.
 * For use as follows:
 *   function Hat() {
 *     this.putOn = createEvent();
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
 */
exports.createEvent = function() {
  var handlers = [];

  /**
   * This is how the event is triggered.
   * @param {object} ev The event object to be passed to the event listeners
   */
  var event = function(ev) {
    handlers.forEach(function(handler) {
      handler.func.apply(handler.scope, [ ev ]);
    });
  };

  /**
   * Add a new handler function
   * @param {function} func The function to call when this event is triggered
   * @param {object} scope Optional 'this' object for the function call
   */
  event.add = function(func, scope) {
    handlers.push({ func: func, scope: scope });
  };

  /**
   * Remove a handler function added through add(). Both func and scope must
   * be strict equals (===) the values used in the call to add()
   * @param {function} func The function to call when this event is triggered
   * @param {object} scope Optional 'this' object for the function call
   */
  event.remove = function(func, scope) {
    handlers = handlers.filter(function(test) {
      return test.func !== func && test.scope !== scope;
    });
  };

  /**
   * Remove all handlers.
   * Reset the state of this event back to it's post create state
   */
  event.removeAll = function() {
    handlers = [];
  };

  return event;
};


//------------------------------------------------------------------------------

var dom = {};

var NS_XHTML = "http://www.w3.org/1999/xhtml";
var NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

/**
 * Pass-through to createElement or createElementNS
 * @param {string} tag The name of the tag to create
 * @param {string} ns Custom namespace
 * @param {HTMLDocument} doc The document in which to create the element
 * @returns {HTMLElement} The created element
 */
dom.createElement = function(tag, ns, doc) {
  var doc = doc || document;
  return doc.createElement(tag);
  /*
  return doc.createElementNS ?
         doc.createElementNS(ns || NS_XHTML, tag) :
         doc.createElement(tag);
   */
};

/**
 * Remove all the child nodes from this node
 * @param {HTMLElement} el The element that should have it's children removed
 */
dom.clearElement = function(el) {
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild);
  }
};

if (this.document && !this.document.documentElement.classList) {
  /**
   * Is the given element marked with the given CSS class?
   */
  dom.hasCssClass = function(el, name) {
    var classes = el.className.split(/\s+/g);
    return classes.indexOf(name) !== -1;
  };

  /**
   * Add a CSS class to the list of classes on the given node
   */
  dom.addCssClass = function(el, name) {
    if (!dom.hasCssClass(el, name)) {
      el.className += " " + name;
    }
  };

  /**
   * Remove a CSS class from the list of classes on the given node
   */
  dom.removeCssClass = function(el, name) {
    var classes = el.className.split(/\s+/g);
    while (true) {
      var index = classes.indexOf(name);
      if (index == -1) {
        break;
      }
      classes.splice(index, 1);
    }
    el.className = classes.join(" ");
  };

  /**
   * Add the named CSS class from the element if it is not already present or
   * remove it if is present.
   */
  dom.toggleCssClass = function(el, name) {
    var classes = el.className.split(/\s+/g), add = true;
    while (true) {
      var index = classes.indexOf(name);
      if (index == -1) {
        break;
      }
      add = false;
      classes.splice(index, 1);
    }
    if (add) {
      classes.push(name);
    }

    el.className = classes.join(" ");
    return add;
  };
} else {
  /*
   * classList shim versions of methods above.
   * See the functions above for documentation
   */
  dom.hasCssClass = function(el, name) {
    return el.classList.contains(name);
  };

  dom.addCssClass = function(el, name) {
    el.classList.add(name);
  };

  dom.removeCssClass = function(el, name) {
    el.classList.remove(name);
  };

  dom.toggleCssClass = function(el, name) {
    return el.classList.toggle(name);
  };
}

/**
 * Add or remove a CSS class from the list of classes on the given node
 * depending on the value of <tt>include</tt>
 */
dom.setCssClass = function(node, className, include) {
  if (include) {
    dom.addCssClass(node, className);
  } else {
    dom.removeCssClass(node, className);
  }
};

/**
 * Create a style element in the document head, and add the given CSS text to
 * it.
 * @param {string} cssText The CSS declarations to append
 * @param {HTMLDocument} doc The document element to work from
 */
dom.importCssString = function(cssText, doc) {
  doc = doc || document;

  if (doc.createStyleSheet) {
    var sheet = doc.createStyleSheet();
    sheet.cssText = cssText;
  }
  else {
    var style = doc.createElementNS ?
        doc.createElementNS(NS_XHTML, "style") :
        doc.createElement("style");

    style.appendChild(doc.createTextNode(cssText));

    var head = doc.getElementsByTagName("head")[0] || doc.documentElement;
    head.appendChild(style);
  }
};

/**
 * Shim for window.getComputedStyle
 */
dom.computedStyle = function(element, style) {
  var win = element.ownerDocument.defaultView;
  if (win.getComputedStyle) {
    var styles = win.getComputedStyle(element, "") || {};
    return styles[style] || "";
  }
  else {
    return element.currentStyle[style];
  }
};

/**
 * Using setInnerHtml(foo) rather than innerHTML = foo allows us to enable
 * tweaks in XHTML documents.
 */
dom.setInnerHtml = function(el, html) {
  if (!this.document || el.namespaceURI === NS_XHTML) {
    try {
      dom.clearElement(el);
      var range = el.ownerDocument.createRange();
      html = "<div xmlns='" + NS_XHTML + "'>" + html + "</div>";
      el.appendChild(range.createContextualFragment(html));
    }
    catch (ex) {
      el.innerHTML = html;
    }
  }
  else {
    el.innerHTML = html;
  }
};

/**
 * Shim to textarea.selectionStart
 */
dom.getSelectionStart = function(textarea) {
  try {
    return textarea.selectionStart || 0;
  }
  catch (e) {
    return 0;
  }
};

/**
 * Shim to textarea.selectionStart
 */
dom.setSelectionStart = function(textarea, start) {
  return textarea.selectionStart = start;
};

/**
 * Shim to textarea.selectionEnd
 */
dom.getSelectionEnd = function(textarea) {
  try {
    return textarea.selectionEnd || 0;
  } catch (e) {
    return 0;
  }
};

/**
 * Shim to textarea.selectionEnd
 */
dom.setSelectionEnd = function(textarea, end) {
  return textarea.selectionEnd = end;
};

exports.dom = dom;


//------------------------------------------------------------------------------

/**
 * Various event utilities
 */
var event = {};

/**
 * Shim for lack of addEventListener on old IE.
 */
event.addListener = function(elem, type, callback) {
  if (elem.addEventListener) {
    return elem.addEventListener(type, callback, false);
  }
  if (elem.attachEvent) {
    var wrapper = function() {
      callback(window.event);
    };
    callback._wrapper = wrapper;
    elem.attachEvent("on" + type, wrapper);
  }
};

/**
 * Shim for lack of removeEventListener on old IE.
 */
event.removeListener = function(elem, type, callback) {
  if (elem.removeEventListener) {
    return elem.removeEventListener(type, callback, false);
  }
  if (elem.detachEvent) {
    elem.detachEvent("on" + type, callback._wrapper || callback);
  }
};

/**
 * Prevents propagation and clobbers the default action of the passed event
 */
event.stopEvent = function(e) {
  event.stopPropagation(e);
  if (e.preventDefault) {
    e.preventDefault();
  }
  return false;
};

/**
 * Prevents propagation of the event
 */
event.stopPropagation = function(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  else {
    e.cancelBubble = true;
  }
};

/**
 * Browser detection. Used only for places where feature detection doesn't make
 * sense.
 */
var isOldGecko = false;
var isOperaMac = false;
if (this.navigator) {
    // oldGecko == rev < 2.0
    isOldGecko = window.controllers && window.navigator.product === "Gecko" &&
        /rv\:1/.test(navigator.userAgent);
    // Is the user using a browser that identifies itself as Opera on Mac OS
    isOperaMac = (navigator.platform.match(/mac/i) === "mac") && window.opera &&
        Object.prototype.toString.call(window.opera) == "[object Opera]";
}

var MODIFIER_KEYS = { 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 224: 'Meta' };
var FUNCTION_KEYS = {
    8: "Backspace", 9: "Tab", 13: "Return", 19: "Pause", 27: "Esc",
    32: "Space", 33: "PageUp", 34: "PageDown", 35: "End", 36: "Home",
    37: "Left", 38: "Up", 39: "Right", 40: "Down",
    44: "Print", 45: "Insert", 46: "Delete",
    112: "F1", 113: "F2", 114: "F3", 115: "F4", 116: "F5", 117: "F6",
    118: "F7", 119: "F8", 120: "F9", 121: "F10", 122: "F11", 123: "F12",
    144: "Numlock", 145: "Scrolllock"
};

function normalizeCommandKeys(callback, ev, keyCode) {
    var hashId = 0;
    if (isOperaMac) {
        hashId = 0 | (ev.metaKey ? 1 : 0) | (ev.altKey ? 2 : 0)
            | (ev.shiftKey ? 4 : 0) | (ev.ctrlKey ? 8 : 0);
    } else {
        hashId = 0 | (ev.ctrlKey ? 1 : 0) | (ev.altKey ? 2 : 0)
            | (ev.shiftKey ? 4 : 0) | (ev.metaKey ? 8 : 0);
    }

    if (keyCode in MODIFIER_KEYS) {
        switch (MODIFIER_KEYS[keyCode]) {
            case "Alt":
                hashId = 2;
                break;
            case "Shift":
                hashId = 4;
                break;
            case "Ctrl":
                hashId = 1;
                break;
            default:
                hashId = 8;
                break;
        }
        keyCode = 0;
    }

    if (hashId & 8 && (keyCode == 91 || keyCode == 93)) {
        keyCode = 0;
    }

    // If there is no hashID and the keyCode is not a function key, then
    // we don't call the callback as we don't handle a command key here
    // (it's a normal key/character input).
    if (hashId == 0 && !(keyCode in FUNCTION_KEYS)) {
        return false;
    }

    return callback(ev, hashId, keyCode);
}

/**
 * Shim to fix bugs in old Firefox and Mac/Opera
 */
event.addCommandKeyListener = function(el, callback) {
    var addListener = event.addListener;
    if (isOldGecko) {
        // Old versions of Gecko aka. Firefox < 4.0 didn't repeat the keydown
        // event if the user pressed the key for a longer time. Instead, the
        // keydown event was fired once and later on only the keypress event.
        // To emulate the 'right' keydown behavior, the keyCode of the initial
        // keyDown event is stored and in the following keypress events the
        // stores keyCode is used to emulate a keyDown event.
        var lastKeyDownKeyCode = null;
        addListener(el, "keydown", function(e) {
            lastKeyDownKeyCode = e.keyCode;
        });
        addListener(el, "keypress", function(e) {
            return normalizeCommandKeys(callback, e, lastKeyDownKeyCode);
        });
    } else {
        var lastDown = null;

        addListener(el, "keydown", function(e) {
            lastDown = e.keyIdentifier || e.keyCode;
            return normalizeCommandKeys(callback, e, e.keyCode);
        });

        // repeated keys are fired as keypress and not keydown events
        if (isOperaMac) {
            addListener(el, "keypress", function(e) {
                var keyId = e.keyIdentifier || e.keyCode;
                if (lastDown !== keyId) {
                    return normalizeCommandKeys(callback, e, e.keyCode);
                } else {
                    lastDown = null;
                }
            });
        }
    }
};

exports.event = event;


});
