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

/**
 * Define a module along with a payload.
 * @param moduleName Name for the payload
 * @param deps Ignored. For compatibility with CommonJS AMD Spec
 * @param payload Function with (require, exports, module) params
 */
function define(moduleName, deps, payload) {
  if (typeof moduleName != "string") {
    throw new Error("Error: Module name is not a string");
  }

  if (arguments.length == 2) {
    payload = deps;
  }
  else {
    payload.deps = deps;
  }

  if (define.debugDependencies) {
    console.log("define: " + moduleName + " -> " + payload.toString()
        .slice(0, 40).replace(/\n/, '\\n').replace(/\r/, '\\r') + "...");
  }

  if (moduleName in define.modules) {
    throw new Error("Error: Redefining module: " + moduleName);
  }

  // Mark the payload so we know we need to call it to get the real module
  payload.__uncompiled = true;
  define.modules[moduleName] = payload;
}

/**
 * The global store of un-instantiated modules
 */
define.modules = {};

/**
 * Should we console.log on module definition/instantiation/requirement?
 */
define.debugDependencies = false;


(function() {

/**
 * We invoke require() in the context of a Domain so we can have multiple
 * sets of modules running separate from each other.
 * This contrasts with JSMs which are singletons, Domains allows us to
 * optionally load a CommonJS module twice with separate data each time.
 * Perhaps you want 2 command lines with a different set of commands in each,
 * for example.
 */
function Domain() {
  this.modules = {};

  if (define.debugDependencies) {
    this.depth = "";
  }
}

/**
 * Lookup module names and resolve them by calling the definition function if
 * needed.
 * There are 2 ways to call this, either with an array of dependencies and a
 * callback to call when the dependencies are found (which can happen
 * asynchronously in an in-page context) or with a single string an no
 * callback where the dependency is resolved synchronously and returned.
 * The API is designed to be compatible with the CommonJS AMD spec and
 * RequireJS.
 * @param deps A name, or array of names for the payload
 * @param callback Function to call when the dependencies are resolved
 * @return The module required or undefined for array/callback method
 */
Domain.prototype.require = function(config, deps, callback) {
  if (arguments.length <= 2) {
    callback = deps;
    deps = config;
    config = undefined;
  }

  if (Array.isArray(deps)) {
    var params = deps.map(function(dep) {
      return this.lookup(dep);
    }, this);
    if (callback) {
      callback.apply(null, params);
    }
    return undefined;
  }
  else {
    return this.lookup(deps);
  }
};

/**
 * Lookup module names and resolve them by calling the definition function if
 * needed.
 * @param moduleName A name for the payload to lookup
 * @return The module specified by aModuleName or null if not found
 */
Domain.prototype.lookup = function(moduleName) {
  if (moduleName in this.modules) {
    var module = this.modules[moduleName];
    if (define.debugDependencies) {
      console.log(this.depth + " Using module: " + moduleName);
    }
    return module;
  }

  if (!(moduleName in define.modules)) {
    throw new Error("Missing module: " + moduleName);
  }

  var module = define.modules[moduleName];

  if (define.debugDependencies) {
    console.log(this.depth + " Compiling module: " + moduleName);
  }

  if (module.__uncompiled) {
    if (define.debugDependencies) {
      this.depth += ".";
    }

    var exports = {};
    try {
      var params = module.deps.map(function(dep) {
        if (dep === "require") {
          return this.require.bind(this);
        }
        if (dep === "exports") {
          return exports;
        }
        if (dep === "module") {
          return { id: moduleName, uri: "" };
        }
        return this.lookup(dep);
      }.bind(this));

      var reply = module.apply(null, params);
      module = (reply !== undefined) ? reply : exports;
    }
    catch (ex) {
      console.error("Error using module: " + moduleName, ex);
      throw ex;
    }

    if (define.debugDependencies) {
      this.depth = this.depth.slice(0, -1);
    }
  }

  // cache the resulting module object for next time
  this.modules[moduleName] = module;

  return module;
};

/**
 * Expose the Domain constructor and a global domain (on the define function
 * to avoid exporting more than we need. This is a common pattern with
 * require systems)
 */
define.Domain = Domain;
define.globalDomain = new Domain();

})();

/**
 * Expose a default require function which is the require of the global
 * sandbox to make it easy to use.
 */
var require = define.globalDomain.require.bind(define.globalDomain);
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

define('gcli/index', ['require', 'exports', 'module' , 'util/legacy', 'gcli/settings', 'gcli/api', 'gcli/types/selection', 'gcli/types/delegate', 'gcli/types/array', 'gcli/types/boolean', 'gcli/types/command', 'gcli/types/date', 'gcli/types/file', 'gcli/types/javascript', 'gcli/types/node', 'gcli/types/number', 'gcli/types/resource', 'gcli/types/setting', 'gcli/types/string', 'gcli/converters', 'gcli/converters/basic', 'gcli/converters/html', 'gcli/converters/terminal', 'gcli/ui/intro', 'gcli/ui/focus', 'gcli/ui/fields/basic', 'gcli/ui/fields/javascript', 'gcli/ui/fields/selection', 'gcli/cli'], function(require, exports, module) {

'use strict';

// Patch-up IE9
require('util/legacy');

require('gcli/settings').startup();

var api = require('gcli/api');
api.populateApi(exports);

exports.addItems(require('gcli/types/selection').items);
exports.addItems(require('gcli/types/delegate').items);

exports.addItems(require('gcli/types/array').items);
exports.addItems(require('gcli/types/boolean').items);
exports.addItems(require('gcli/types/command').items);
exports.addItems(require('gcli/types/date').items);
exports.addItems(require('gcli/types/file').items);
exports.addItems(require('gcli/types/javascript').items);
exports.addItems(require('gcli/types/node').items);
exports.addItems(require('gcli/types/number').items);
exports.addItems(require('gcli/types/resource').items);
exports.addItems(require('gcli/types/setting').items);
exports.addItems(require('gcli/types/string').items);

exports.addItems(require('gcli/converters').items);
exports.addItems(require('gcli/converters/basic').items);
exports.addItems(require('gcli/converters/html').items);
exports.addItems(require('gcli/converters/terminal').items);

exports.addItems(require('gcli/ui/intro').items);
exports.addItems(require('gcli/ui/focus').items);

exports.addItems(require('gcli/ui/fields/basic').items);
exports.addItems(require('gcli/ui/fields/javascript').items);
exports.addItems(require('gcli/ui/fields/selection').items);

exports.addItems(require('gcli/cli').items);


});
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

define('util/legacy', ['require', 'exports', 'module' ], function(require, exports, module) {

  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  /**
   * Fake a console for IE9
   */
  if (window.console == null) {
    window.console = {};
  }
  'debug,log,warn,error,trace,group,groupEnd'.split(',').forEach(function(f) {
    if (!window.console[f]) {
      window.console[f] = function() {};
    }
  });

  /**
   * Fake Element.classList for IE9
   * Based on https://gist.github.com/1381839 by Devon Govett
   */
  if (!('classList' in document.documentElement) && Object.defineProperty &&
          typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function() {
        var self = this;
        function update(fn) {
          return function(value) {
            var classes = self.className.split(/\s+/);
            var index = classes.indexOf(value);
            fn(classes, index, value);
            self.className = classes.join(' ');
          };
        }

        var ret = {
          add: update(function(classes, index, value) {
            ~index || classes.push(value);
          }),
          remove: update(function(classes, index) {
            ~index && classes.splice(index, 1);
          }),
          toggle: update(function(classes, index, value) {
            ~index ? classes.splice(index, 1) : classes.push(value);
          }),
          contains: function(value) {
            return !!~self.className.split(/\s+/).indexOf(value);
          },
          item: function(i) {
            return self.className.split(/\s+/)[i] || null;
          }
        };

        Object.defineProperty(ret, 'length', {
          get: function() {
            return self.className.split(/\s+/).length;
          }
        });

        return ret;
      }
    });
  }

  /**
   * String.prototype.trimLeft is non-standard, but it works in Firefox,
   * Chrome and Opera. It's easiest to create a shim here.
   */
  if (!String.prototype.trimLeft) {
    String.prototype.trimLeft = function() {
      return String(this).replace(/\s*$/, '');
    };
  }

  /**
   * Polyfil taken from
   * https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind
   */
  if (!Function.prototype.bind) {
    Function.prototype.bind = function(oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5 internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
                                   ? this
                                   : oThis,
                                 aArgs.concat(Array.prototype.slice.call(arguments)));
          };

      fNOP.prototype = this.prototype;
      fBound.prototype = new fNOP();
      return fBound;
    };
  }
});
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

define('gcli/settings', ['require', 'exports', 'module' , 'util/util', 'gcli/types'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var types = require('gcli/types');


/**
 * Where we store the settings that we've created
 */
var settings = {};

/**
 * Where the values for the settings are stored while in use.
 */
var settingValues = {};

/**
 * Where the values for the settings are persisted for next use.
 */
var settingStorage;

/**
 * Allow a system to setup a different set of defaults from what GCLI provides
 */
exports.setDefaults = function(newValues) {
  Object.keys(newValues).forEach(function(name) {
    if (settingValues[name] === undefined) {
      settingValues[name] = newValues[name];
    }
  });
};

/**
 * Initialize the settingValues store from localStorage
 */
exports.startup = function() {
  settingStorage = new LocalSettingStorage();
  settingStorage.load(settingValues);
};

exports.shutdown = function() {
};

/**
 * 'static' function to get an array containing all known Settings
 */
exports.getAll = function(filter) {
  var all = [];
  Object.keys(settings).forEach(function(name) {
    if (filter == null || name.indexOf(filter) !== -1) {
      all.push(settings[name]);
    }
  }.bind(this));
  all.sort(function(s1, s2) {
    return s1.name.localeCompare(s2.name);
  }.bind(this));
  return all;
};

/**
 * Add a new setting
 * @return The new Setting object
 */
exports.addSetting = function(prefSpec) {
  var type = types.createType(prefSpec.type);
  var setting = new Setting(prefSpec.name, type, prefSpec.description,
                            prefSpec.defaultValue);
  settings[setting.name] = setting;
  exports.onChange({ added: setting.name });
  return setting;
};

/**
 * Getter for an existing setting. Generally use of this function should be
 * avoided. Systems that define a setting should export it if they wish it to
 * be available to the outside, or not otherwise. Use of this function breaks
 * that boundary and also hides dependencies. Acceptable uses include testing
 * and embedded uses of GCLI that pre-define all settings (e.g. Firefox)
 * @param name The name of the setting to fetch
 * @return The found Setting object, or undefined if the setting was not found
 */
exports.getSetting = function(name) {
  return settings[name];
};

/**
 * Remove a setting
 */
exports.removeSetting = function(nameOrSpec) {
  var name = typeof nameOrSpec === 'string' ? nameOrSpec : nameOrSpec.name;
  delete settings[name];
  exports.onChange({ removed: name });
};

/**
 * Event for use to detect when the list of settings changes
 */
exports.onChange = util.createEvent('Settings.onChange');

/**
 * Implement the load() and save() functions to write a JSON string blob to
 * localStorage
 */
function LocalSettingStorage() {
}

LocalSettingStorage.prototype.load = function(values) {
  if (typeof localStorage === 'undefined') {
    return;
  }

  var gcliSettings = localStorage.getItem('gcli-settings');
  if (gcliSettings != null) {
    var parsed = JSON.parse(gcliSettings);
    Object.keys(parsed).forEach(function(name) {
      values[name] = parsed[name];
    });
  }
};

LocalSettingStorage.prototype.save = function(values) {
  if (typeof localStorage !== 'undefined') {
    var json = JSON.stringify(values);
    localStorage.setItem('gcli-settings', json);
  }
};

exports.LocalSettingStorage = LocalSettingStorage;


/**
 * A class to wrap up the properties of a Setting.
 * @see toolkit/components/viewconfig/content/config.js
 */
function Setting(name, type, description, defaultValue) {
  this.name = name;
  this.type = type;
  this.description = description;
  this._defaultValue = defaultValue;

  this.onChange = util.createEvent('Setting.onChange');
  this.setDefault();
}

/**
 * Reset this setting to it's initial default value
 */
Setting.prototype.setDefault = function() {
  this.value = this._defaultValue;
};

/**
 * All settings 'value's are saved in the settingValues object
 */
Object.defineProperty(Setting.prototype, 'value', {
  get: function() {
    return settingValues[this.name];
  },

  set: function(value) {
    settingValues[this.name] = value;
    settingStorage.save(settingValues);
    this.onChange({ setting: this, value: value });
  },

  enumerable: true
});


});
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

define('util/util', ['require', 'exports', 'module' , 'util/promise'], function(require, exports, module) {

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
  var fireHoldCount = 0;
  var heldEvents = [];
  var eventCombiner;

  /**
   * This is how the event is triggered.
   * @param ev The event object to be passed to the event listeners
   */
  var event = function(ev) {
    if (fireHoldCount > 0) {
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

    fireHoldCount++;
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

    if (fireHoldCount === 0) {
      throw new Error('fireHoldCount === 0 during resumeFire on ' + name);
    }

    fireHoldCount--;
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

var promise = require('util/promise');

/**
 * Utility to convert a resolved promise to a concrete value.
 * Warning: This is something of an experiment. The alternative of mixing
 * concrete/promise return values could be better.
 */
exports.synchronize = function(p) {
  if (p == null || typeof p.then !== 'function') {
    return p;
  }
  var failure;
  var reply;
  var onDone = function(value) {
    failure = false;
    reply = value;
  };
  var onError = function (value) {
    failure = true;
    reply = value;
  };
  p.then(onDone, onError);
  if (failure === undefined) {
    throw new Error('non synchronizable promise');
  }
  if (failure) {
    throw reply;
  }
  return reply;
};

/**
 * promiseEach is roughly like Array.forEach except that the action is taken to
 * be something that completes asynchronously, returning a promise, so we wait
 * for the action to complete for each array element before moving onto the
 * next.
 * @param array An array of objects to enumerate
 * @param action A function to call for each member of the array
 * @param scope Optional object to use as 'this' for the function calls
 * @return A promise which is resolved (with an array of resolution values)
 * when all the array members have been passed to the action function, and
 * rejected as soon as any of the action function calls fails 
 */
exports.promiseEach = function(array, action, scope) {
  if (array.length === 0) {
    return promise.resolve([]);
  }

  var deferred = promise.defer();
  var replies = [];

  var callNext = function(index) {
    var onSuccess = function(reply) {
      replies[index] = reply;

      if (index + 1 >= array.length) {
        deferred.resolve(replies);
      }
      else {
        callNext(index + 1);
      }
    };

    var onFailure = function(ex) {
      deferred.reject(ex);
    };

    var reply = action.call(scope, array[index], index, array);
    promise.resolve(reply).then(onSuccess).then(null, onFailure);
  };

  callNext(0);
  return deferred.promise;
};

/**
 * Catching errors from promises isn't as simple as:
 *   promise.then(handler, console.error);
 * for a number of reasons:
 * - chrome's console doesn't have bound functions (why?)
 * - we don't get stack traces out from console.error(ex);
 */
exports.errorHandler = function(ex) {
  if (ex instanceof Error) {
    // V8 weirdly includes the exception message in the stack
    if (ex.stack.indexOf(ex.message) !== -1) {
      console.error(ex.stack);
    }
    else {
      console.error('' + ex);
      console.error(ex.stack);
    }
  }
  else {
    console.error(ex);
  }
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
  var h = 0;
  if (str.length === 0) {
    return h;
  }
  for (var i = 0; i < str.length; i++) {
    var character = str.charCodeAt(i);
    h = ((h << 5) - h) + character;
    h = h & h; // Convert to 32bit integer
  }
  return h;
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
 * Utility to find elements with href attributes and add a target=_blank
 * attribute to make sure that opened links will open in a new window.
 */
exports.linksToNewTab = function(element) {
  var links = element.ownerDocument.querySelectorAll('*[href]');
  for (var i = 0; i < links.length; i++) {
    links[i].setAttribute('target', '_blank');
  }
  return element;
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
 * We'd really like to be able to do 'new NodeList()'
 */
exports.createEmptyNodeList = function(doc) {
  if (doc.createDocumentFragment) {
    return doc.createDocumentFragment().childNodes;
  }
  return doc.querySelectorAll('x>:root');
};

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

define('util/promise', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

/**
 * This is a copy of util.errorHandler to avoid dependency loops
 */
var util = {
  errorHandler: function(ex) {
    if (ex instanceof Error) {
      // V8 weirdly includes the exception message in the stack
      if (ex.stack.indexOf(ex.message) !== -1) {
        console.error(ex.stack);
      }
      else {
        console.error('' + ex);
        console.error(ex.stack);
      }
    }
    else {
      console.error(ex);
    }
  }
};

/**
 * Internal utility: Wraps given `value` into simplified promise, successfully
 * fulfilled to a given `value`. Note the result is not a complete promise
 * implementation, as its method `then` does not returns anything.
 */
function fulfilled(value) {
  return { then: function then(fulfill) { fulfill(value); } };
}

/**
 * Internal utility: Wraps given input into simplified promise, pre-rejected
 * with a given `reason`. Note the result is not a complete promise
 * implementation, as its method `then` does not returns anything.
 */
function rejected(reason) {
  return { then: function then(fulfill, reject) { reject(reason); } };
}

/**
 * Internal utility: Returns `true` if given `value` is a promise. Value is
 * assumed to be a promise if it implements method `then`.
 */
function isPromise(value) {
  return value && typeof(value.then) === 'function';
}

/**
 * Creates deferred object containing fresh promise & methods to either resolve
 * or reject it. The result is an object with the following properties:
 * - `promise` Eventual value representation implementing CommonJS [Promises/A]
 *   (http://wiki.commonjs.org/wiki/Promises/A) API.
 * - `resolve` Single shot function that resolves enclosed `promise` with a
 *   given `value`.
 * - `reject` Single shot function that rejects enclosed `promise` with a given
 *   `reason`.
 *
 * An optional `prototype` argument is used as a prototype of the returned
 * `promise` allowing one to implement additional API. If prototype is not
 * passed then it falls back to `Object.prototype`.
 *
 *  ## Example
 *
 *  function fetchURI(uri, type) {
 *    var deferred = defer();
 *    var request = new XMLHttpRequest();
 *    request.open("GET", uri, true);
 *    request.responseType = type;
 *    request.onload = function onload() {
 *      deferred.resolve(request.response);
 *    }
 *    request.onerror = function(event) {
 *     deferred.reject(event);
 *    }
 *    request.send();
 *
 *    return deferred.promise;
 *  }
 */
function defer(prototype) {
  // Define FIFO queue of observer pairs. Once promise is resolved & all queued
  // observers are forwarded to `result` and variable is set to `null`.
  var observers = [];

  // Promise `result`, which will be assigned a resolution value once promise
  // is resolved. Note that result will always be assigned promise (or alike)
  // object to take care of propagation through promise chains. If result is
  // `null` promise is not resolved yet.
  var result = null;

  prototype = (prototype || prototype === null) ? prototype : Object.prototype;

  // Create an object implementing promise API.
  var promise = Object.create(prototype, {
    then: { value: function then(onFulfill, onError) {
      var deferred = defer(prototype);

      function resolve(value) {
        // If `onFulfill` handler is provided resolve `deferred.promise` with
        // result of invoking it with a resolution value. If handler is not
        // provided propagate value through.
        try {
          deferred.resolve(onFulfill ? onFulfill(value) : value);
        }
        // `onFulfill` may throw exception in which case resulting promise
        // is rejected with thrown exception.
        catch(error) {
          if (exports._reportErrors && typeof(console) === 'object') {
            util.errorHandler(error);
          }
          // Note: Following is equivalent of `deferred.reject(error)`,
          // we use this shortcut to reduce a stack.
          deferred.resolve(rejected(error));
        }
      }

      function reject(reason) {
        try {
          if (onError) { deferred.resolve(onError(reason)); }
          else { deferred.resolve(rejected(reason)); }
        }
        catch(error) {
          if (exports._reportErrors && typeof(console) === 'object') {
            util.errorHandler(error);
          }
          deferred.resolve(rejected(error));
        }
      }

      // If enclosed promise (`this.promise`) observers queue is still alive
      // enqueue a new observer pair into it. Note that this does not
      // necessary means that promise is pending, it may already be resolved,
      // but we still have to queue observers to guarantee an order of
      // propagation.
      if (observers) {
        observers.push({ resolve: resolve, reject: reject });
      }
      // Otherwise just forward observer pair right to a `result` promise.
      else {
        result.then(resolve, reject);
      }

      return deferred.promise;
    }}
  });

  var deferred = {
    promise: promise,
    /**
     * Resolves associated `promise` to a given `value`, unless it's already
     * resolved or rejected. Note that resolved promise is not necessary a
     * successfully fulfilled. Promise may be resolved with a promise `value`
     * in which case `value` promise's fulfillment / rejection will propagate
     * up to a promise resolved with `value`.
     */
    resolve: function resolve(value) {
      if (!result) {
        // Store resolution `value` in a `result` as a promise, so that all
        // the subsequent handlers can be simply forwarded to it. Since
        // `result` will be a promise all the value / error propagation will
        // be uniformly taken care of.
        result = isPromise(value) ? value : fulfilled(value);

        // Forward already registered observers to a `result` promise in the
        // order they were registered. Note that we intentionally dequeue
        // observer at a time until queue is exhausted. This makes sure that
        // handlers registered as side effect of observer forwarding are
        // queued instead of being invoked immediately, guaranteeing FIFO
        // order.
        while (observers.length) {
          var observer = observers.shift();
          result.then(observer.resolve, observer.reject);
        }

        // Once `observers` queue is exhausted we `null`-ify it, so that
        // new handlers are forwarded straight to the `result`.
        observers = null;
      }
    },
    /**
     * Rejects associated `promise` with a given `reason`, unless it's already
     * resolved / rejected. This is just a (better performing) convenience
     * shortcut for `deferred.resolve(reject(reason))`.
     */
    reject: function reject(reason) {
      // Note that if promise is resolved that does not necessary means that it
      // is successfully fulfilled. Resolution value may be a promise in which
      // case its result propagates. In other words if promise `a` is resolved
      // with promise `b`, `a` is either fulfilled or rejected depending
      // on weather `b` is fulfilled or rejected. Here `deferred.promise` is
      // resolved with a promise pre-rejected with a given `reason`, there for
      // `deferred.promise` is rejected with a given `reason`. This may feel
      // little awkward first, but doing it this way greatly simplifies
      // propagation through promise chains.
      deferred.resolve(rejected(reason));
    }
  };

  return deferred;
}
exports.defer = defer;

/**
 * Returns a promise resolved to a given `value`. Optionally a second
 * `prototype` argument may be provided to be used as a prototype for the
 * returned promise.
 */
function resolve(value, prototype) {
  var deferred = defer(prototype);
  deferred.resolve(value);
  return deferred.promise;
}
exports.resolve = resolve;

/**
 * Returns a promise rejected with a given `reason`. Optionally a second
 * `prototype` argument may be provided to be used as a prototype for the
 * returned promise.
 */
function reject(reason, prototype) {
  var deferred = defer(prototype);
  deferred.reject(reason);
  return deferred.promise;
}
exports.reject = reject;

var promised = (function() {
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
      return resolve(unknown).then(function(value) {
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
        reduce(promisedConcat, resolve([], prototype)).
        // finally map that to promise of `f.apply(this, args...)`
        then(execute);
    };
  };
})();
exports.promised = promised;

var all = promised(Array);
exports.all = all;

});
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

define('gcli/types', ['require', 'exports', 'module' , 'util/util', 'util/promise', 'gcli/argument'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var promise = require('util/promise');
var Argument = require('gcli/argument').Argument;
var BlankArgument = require('gcli/argument').BlankArgument;


/**
 * Some types can detect validity, that is to say they can distinguish between
 * valid and invalid values.
 * We might want to change these constants to be numbers for better performance
 */
var Status = {
  /**
   * The conversion process worked without any problem, and the value is
   * valid. There are a number of failure states, so the best way to check
   * for failure is (x !== Status.VALID)
   */
  VALID: {
    toString: function() { return 'VALID'; },
    valueOf: function() { return 0; }
  },

  /**
   * A conversion process failed, however it was noted that the string
   * provided to 'parse()' could be VALID by the addition of more characters,
   * so the typing may not be actually incorrect yet, just unfinished.
   * @see Status.ERROR
   */
  INCOMPLETE: {
    toString: function() { return 'INCOMPLETE'; },
    valueOf: function() { return 1; }
  },

  /**
   * The conversion process did not work, the value should be null and a
   * reason for failure should have been provided. In addition some
   * completion values may be available.
   * @see Status.INCOMPLETE
   */
  ERROR: {
    toString: function() { return 'ERROR'; },
    valueOf: function() { return 2; }
  },

  /**
   * A combined status is the worser of the provided statuses. The statuses
   * can be provided either as a set of arguments or a single array
   */
  combine: function() {
    var combined = Status.VALID;
    for (var i = 0; i < arguments.length; i++) {
      var status = arguments[i];
      if (Array.isArray(status)) {
        status = Status.combine.apply(null, status);
      }
      if (status > combined) {
        combined = status;
      }
    }
    return combined;
  },

  fromString: function(str) {
    switch (str) {
      case Status.VALID.toString():
        return Status.VALID;
      case Status.INCOMPLETE.toString():
        return Status.INCOMPLETE;
      case Status.ERROR.toString():
        return Status.ERROR;
      default:
        throw new Error('\'' + str + '\' is not a status');
    }
  }
};

exports.Status = Status;


/**
 * The type.parse() method converts an Argument into a value, Conversion is
 * a wrapper to that value.
 * Conversion is needed to collect a number of properties related to that
 * conversion in one place, i.e. to handle errors and provide traceability.
 * @param value The result of the conversion
 * @param arg The data from which the conversion was made
 * @param status See the Status values [VALID|INCOMPLETE|ERROR] defined above.
 * The default status is Status.VALID.
 * @param message If status=ERROR, there should be a message to describe the
 * error. A message is not needed unless for other statuses, but could be
 * present for any status including VALID (in the case where we want to note a
 * warning, for example).
 * See BUG 664676: GCLI conversion error messages should be localized
 * @param predictions If status=INCOMPLETE, there could be predictions as to
 * the options available to complete the input.
 * We generally expect there to be about 7 predictions (to match human list
 * comprehension ability) however it is valid to provide up to about 20,
 * or less. It is the job of the predictor to decide a smart cut-off.
 * For example if there are 4 very good matches and 4 very poor ones,
 * probably only the 4 very good matches should be presented.
 * The predictions are presented either as an array of prediction objects or as
 * a function which returns this array when called with no parameters.
 * Each prediction object has the following shape:
 *     {
 *       name: '...',     // textual completion. i.e. what the cli uses
 *       value: { ... },  // value behind the textual completion
 *       incomplete: true // this completion is only partial (optional)
 *     }
 * The 'incomplete' property could be used to denote a valid completion which
 * could have sub-values (e.g. for tree navigation).
 */
function Conversion(value, arg, status, message, predictions) {
  // The result of the conversion process. Will be null if status != VALID
  this.value = value;

  // Allow us to trace where this Conversion came from
  this.arg = arg;
  if (arg == null) {
    throw new Error('Missing arg');
  }

  if (predictions != null) {
    var toCheck = typeof predictions === 'function' ? predictions() : predictions;
    if (typeof toCheck.then !== 'function') {
      throw new Error('predictions is not a promise');
    }
    toCheck.then(function(value) {
      if (!Array.isArray(value)) {
        throw new Error('prediction resolves to non array');
      }
    }, util.errorHandler);
  }

  this._status = status || Status.VALID;
  this.message = message;
  this.predictions = predictions;
}

/**
 * Ensure that all arguments that are part of this conversion know what they
 * are assigned to.
 * @param assignment The Assignment (param/conversion link) to inform the
 * argument about.
 */
Object.defineProperty(Conversion.prototype, 'assignment', {
  get: function() { return this.arg.assignment; },
  set: function(assignment) { this.arg.assignment = assignment; },
  enumerable: true
});

/**
 * Work out if there is information provided in the contained argument.
 */
Conversion.prototype.isDataProvided = function() {
  return this.arg.type !== 'BlankArgument';
};

/**
 * 2 conversions are equal if and only if their args are equal (argEquals) and
 * their values are equal (valueEquals).
 * @param that The conversion object to compare against.
 */
Conversion.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }
  return this.valueEquals(that) && this.argEquals(that);
};

/**
 * Check that the value in this conversion is strict equal to the value in the
 * provided conversion.
 * @param that The conversion to compare values with
 */
Conversion.prototype.valueEquals = function(that) {
  return that != null && this.value === that.value;
};

/**
 * Check that the argument in this conversion is equal to the value in the
 * provided conversion as defined by the argument (i.e. arg.equals).
 * @param that The conversion to compare arguments with
 */
Conversion.prototype.argEquals = function(that) {
  return that == null ? false : this.arg.equals(that.arg);
};

/**
 * Accessor for the status of this conversion
 */
Conversion.prototype.getStatus = function(arg) {
  return this._status;
};

/**
 * Defined by the toString() value provided by the argument
 */
Conversion.prototype.toString = function() {
  return this.arg.toString();
};

/**
 * If status === INCOMPLETE, then we may be able to provide predictions as to
 * how the argument can be completed.
 * @return An array of items, or a promise of an array of items, where each
 * item is an object with the following properties:
 * - name (mandatory): Displayed to the user, and typed in. No whitespace
 * - description (optional): Short string for display in a tool-tip
 * - manual (optional): Longer description which details usage
 * - incomplete (optional): Indicates that the prediction if used should not
 *   be considered necessarily sufficient, which typically will mean that the
 *   UI should not append a space to the completion
 * - value (optional): If a value property is present, this will be used as the
 *   value of the conversion, otherwise the item itself will be used.
 */
Conversion.prototype.getPredictions = function() {
  if (typeof this.predictions === 'function') {
    return this.predictions();
  }
  return promise.resolve(this.predictions || []);
};

/**
 * Return a promise of an index constrained by the available predictions.
 * i.e. (index % predicitons.length)
 */
Conversion.prototype.constrainPredictionIndex = function(index) {
  if (index == null) {
    return promise.resolve();
  }

  return this.getPredictions().then(function(value) {
    if (value.length === 0) {
      return undefined;
    }

    index = index % value.length;
    if (index < 0) {
      index = value.length + index;
    }
    return index;
  }.bind(this));
};

/**
 * Constant to allow everyone to agree on the maximum number of predictions
 * that should be provided. We actually display 1 less than this number.
 */
Conversion.maxPredictions = 11;

exports.Conversion = Conversion;


/**
 * ArrayConversion is a special Conversion, needed because arrays are converted
 * member by member rather then as a whole, which means we can track the
 * conversion if individual array elements. So an ArrayConversion acts like a
 * normal Conversion (which is needed as Assignment requires a Conversion) but
 * it can also be devolved into a set of Conversions for each array member.
 */
function ArrayConversion(conversions, arg) {
  this.arg = arg;
  this.conversions = conversions;
  this.value = conversions.map(function(conversion) {
    return conversion.value;
  }, this);

  this._status = Status.combine(conversions.map(function(conversion) {
    return conversion.getStatus();
  }));

  // This message is just for reporting errors like "not enough values"
  // rather that for problems with individual values.
  this.message = '';

  // Predictions are generally provided by individual values
  this.predictions = [];
}

ArrayConversion.prototype = Object.create(Conversion.prototype);

Object.defineProperty(ArrayConversion.prototype, 'assignment', {
  get: function() { return this._assignment; },
  set: function(assignment) {
    this._assignment = assignment;

    this.conversions.forEach(function(conversion) {
      conversion.assignment = assignment;
    }, this);
  },
  enumerable: true
});

ArrayConversion.prototype.getStatus = function(arg) {
  if (arg && arg.conversion) {
    return arg.conversion.getStatus();
  }
  return this._status;
};

ArrayConversion.prototype.isDataProvided = function() {
  return this.conversions.length > 0;
};

ArrayConversion.prototype.valueEquals = function(that) {
  if (that == null) {
    return false;
  }

  if (!(that instanceof ArrayConversion)) {
    throw new Error('Can\'t compare values with non ArrayConversion');
  }

  if (this.value === that.value) {
    return true;
  }

  if (this.value.length !== that.value.length) {
    return false;
  }

  for (var i = 0; i < this.conversions.length; i++) {
    if (!this.conversions[i].valueEquals(that.conversions[i])) {
      return false;
    }
  }

  return true;
};

ArrayConversion.prototype.toString = function() {
  return '[ ' + this.conversions.map(function(conversion) {
    return conversion.toString();
  }, this).join(', ') + ' ]';
};

exports.ArrayConversion = ArrayConversion;


/**
 * Most of our types are 'static' e.g. there is only one type of 'string',
 * however some types like 'selection' and 'delegate' are customizable.
 * The basic Type type isn't useful, but does provide documentation about what
 * types do.
 */
function Type() {
}

/**
 * Convert the given <tt>value</tt> to a string representation.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 * @param value The object to convert into a string
 * @param context An ExecutionContext to allow basic Requisition access
 */
Type.prototype.stringify = function(value, context) {
  throw new Error('Not implemented');
};

/**
 * Convert the given <tt>arg</tt> to an instance of this type.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 * @param arg An instance of <tt>Argument</tt> to convert.
 * @param context An ExecutionContext to allow basic Requisition access
 * @return Conversion
 */
Type.prototype.parse = function(arg, context) {
  throw new Error('Not implemented');
};

/**
 * A convenience method for times when you don't have an argument to parse
 * but instead have a string.
 * @see #parse(arg)
 */
Type.prototype.parseString = function(str, context) {
  return this.parse(new Argument(str), context);
};

/**
 * The plug-in system, and other things need to know what this type is
 * called. The name alone is not enough to fully specify a type. Types like
 * 'selection' and 'delegate' need extra data, however this function returns
 * only the name, not the extra data.
 */
Type.prototype.name = undefined;

/**
 * If there is some concept of a higher value, return it,
 * otherwise return undefined.
 */
Type.prototype.increment = function(value, context) {
  return undefined;
};

/**
 * If there is some concept of a lower value, return it,
 * otherwise return undefined.
 */
Type.prototype.decrement = function(value, context) {
  return undefined;
};

/**
 * The 'blank value' of most types is 'undefined', but there are exceptions;
 * This allows types to specify a better conversion from empty string than
 * 'undefined'.
 * 2 known examples of this are boolean -> false and array -> []
 */
Type.prototype.getBlank = function(context) {
  return new Conversion(undefined, new BlankArgument(), Status.INCOMPLETE, '');
};

/**
 * This is something of a hack for the benefit of DelegateType which needs to
 * be able to lie about it's type for fields to accept it as one of their own.
 * Sub-types can ignore this unless they're DelegateType.
 * @param context An ExecutionContext to allow basic Requisition access
 */
Type.prototype.getType = function(context) {
  return this;
};

/**
 * addItems allows registrations of a number of things. This allows it to know
 * what type of item, and how it should be registered.
 */
Type.prototype.item = 'type';

exports.Type = Type;

/**
 * Private registry of types
 * Invariant: types[name] = type.name
 */
var registeredTypes = {};

exports.getTypeNames = function() {
  return Object.keys(registeredTypes);
};

/**
 * Add a new type to the list available to the system.
 * You can pass 2 things to this function - either an instance of Type, in
 * which case we return this instance when #getType() is called with a 'name'
 * that matches type.name.
 * Also you can pass in a constructor (i.e. function) in which case when
 * #getType() is called with a 'name' that matches Type.prototype.name we will
 * pass the typeSpec into this constructor.
 */
exports.addType = function(type) {
  if (typeof type === 'object') {
    if (!type.name) {
      throw new Error('All registered types must have a name');
    }

    if (type instanceof Type) {
      registeredTypes[type.name] = type;
    }
    else {
      var name = type.name;
      var parent = type.parent;
      type.name = parent;
      delete type.parent;

      registeredTypes[name] = exports.createType(type);

      type.name = name;
      type.parent = parent;
    }
  }
  else if (typeof type === 'function') {
    if (!type.prototype.name) {
      throw new Error('All registered types must have a name');
    }
    registeredTypes[type.prototype.name] = type;
  }
  else {
    throw new Error('Unknown type: ' + type);
  }
};

/**
 * Remove a type from the list available to the system
 */
exports.removeType = function(type) {
  delete registeredTypes[type.name];
};

/**
 * Find a type, previously registered using #addType()
 */
exports.createType = function(typeSpec) {
  if (typeof typeSpec === 'string') {
    typeSpec = { name: typeSpec };
  }

  if (typeof typeSpec !== 'object') {
    throw new Error('Can\'t extract type from ' + typeSpec);
  }

  var type, newType;
  if (typeSpec.name == null || typeSpec.name == 'type') {
    type = Type;
  }
  else {
    type = registeredTypes[typeSpec.name];
  }

  if (!type) {
    console.error('Known types: ' + Object.keys(registeredTypes).join(', '));
    throw new Error('Unknown type: \'' + typeSpec.name + '\'');
  }

  if (typeof type === 'function') {
    newType = new type(typeSpec);
  }
  else {
    // clone 'type'
    newType = {};
    copyProperties(type, newType);
  }

  // Copy the properties of typeSpec onto the new type
  copyProperties(typeSpec, newType);

  if (typeof type !== 'function') {
    if (typeof newType.constructor === 'function') {
      newType.constructor();
    }
  }

  return newType;
};

function copyProperties(src, dest) {
  for (var key in src) {
    var descriptor;
    var obj = src;
    while (true) {
      descriptor = Object.getOwnPropertyDescriptor(obj, key);
      if (descriptor != null) {
        break;
      }
      obj = Object.getPrototypeOf(obj);
      if (obj == null) {
        throw new Error('Can\'t find descriptor of ' + key);
      }
    }

    if ('value' in descriptor) {
      dest[key] = src[key];
    }
    else if ('get' in descriptor) {
      Object.defineProperty(dest, key, {
        get: descriptor.get,
        set: descriptor.set,
        enumerable: descriptor.enumerable
      });
    }
    else {
      throw new Error('Don\'t know how to copy ' + key + ' property.');
    }
  }
}


});
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

define('gcli/argument', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

/**
 * Thinking out loud here:
 * Arguments are an area where we could probably refactor things a bit better.
 * The split process in Requisition creates a set of Arguments, which are then
 * assigned. The assign process sometimes converts them into subtypes of
 * Argument. We might consider that what gets assigned is _always_ one of the
 * subtypes (or actually a different type hierarchy entirely) and that we
 * don't manipulate the prefix/text/suffix but just use the 'subtypes' as
 * filters which present a view of the underlying original Argument.
 */

/**
 * We record where in the input string an argument comes so we can report
 * errors against those string positions.
 * @param text The string (trimmed) that contains the argument
 * @param prefix Knowledge of quotation marks and whitespace used prior to the
 * text in the input string allows us to re-generate the original input from
 * the arguments.
 * @param suffix Any quotation marks and whitespace used after the text.
 * Whitespace is normally placed in the prefix to the succeeding argument, but
 * can be used here when this is the last argument.
 * @constructor
 */
function Argument(text, prefix, suffix) {
  if (text === undefined) {
    this.text = '';
    this.prefix = '';
    this.suffix = '';
  }
  else {
    this.text = text;
    this.prefix = prefix !== undefined ? prefix : '';
    this.suffix = suffix !== undefined ? suffix : '';
  }
}

Argument.prototype.type = 'Argument';

/**
 * Return the result of merging these arguments.
 * case and some of the arguments are in quotation marks?
 */
Argument.prototype.merge = function(following) {
  // Is it possible that this gets called when we're merging arguments
  // for the single string?
  return new Argument(
    this.text + this.suffix + following.prefix + following.text,
    this.prefix, following.suffix);
};

/**
 * Returns a new Argument like this one but with various items changed.
 * @param options Values to use in creating a new Argument.
 * Warning: some implementations of beget make additions to the options
 * argument. You should be aware of this in the unlikely event that you want to
 * reuse 'options' arguments.
 * Properties:
 * - text: The new text value
 * - prefixSpace: Should the prefix be altered to begin with a space?
 * - prefixPostSpace: Should the prefix be altered to end with a space?
 * - suffixSpace: Should the suffix be altered to end with a space?
 * - type: Constructor to use in creating new instances. Default: Argument
 * - dontQuote: Should we avoid adding prefix/suffix quotes when the text value
 *   has a space? Needed when we're completing a sub-command.
 */
Argument.prototype.beget = function(options) {
  var text = this.text;
  var prefix = this.prefix;
  var suffix = this.suffix;

  if (options.text != null) {
    text = options.text;

    // We need to add quotes when the replacement string has spaces or is empty
    if (!options.dontQuote) {
      var needsQuote = text.indexOf(' ') >= 0 || text.length === 0;
      var hasQuote = /['"]$/.test(prefix);
      if (needsQuote && !hasQuote) {
        prefix = prefix + '\'';
        suffix = '\'' + suffix;
      }
    }
  }

  if (options.prefixSpace && prefix.charAt(0) !== ' ') {
    prefix = ' ' + prefix;
  }

  if (options.prefixPostSpace && prefix.charAt(prefix.length - 1) !== ' ') {
    prefix = prefix + ' ';
  }

  if (options.suffixSpace && suffix.charAt(suffix.length - 1) !== ' ') {
    suffix = suffix + ' ';
  }

  if (text === this.text && suffix === this.suffix && prefix === this.prefix) {
    return this;
  }

  var type = options.type || Argument;
  return new type(text, prefix, suffix);
};

/**
 * We need to keep track of which assignment we've been assigned to
 */
Object.defineProperty(Argument.prototype, 'assignment', {
  get: function() { return this._assignment; },
  set: function(assignment) { this._assignment = assignment; },
  enumerable: true
});

/**
 * Sub-classes of Argument are collections of arguments, getArgs() gets access
 * to the members of the collection in order to do things like re-create input
 * command lines. For the simple Argument case it's just an array containing
 * only this.
 */
Argument.prototype.getArgs = function() {
  return [ this ];
};

/**
 * We define equals to mean all arg properties are strict equals.
 * Used by Conversion.argEquals and Conversion.equals and ultimately
 * Assignment.equals to avoid reporting a change event when a new conversion
 * is assigned.
 */
Argument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof Argument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * Helper when we're putting arguments back together
 */
Argument.prototype.toString = function() {
  // BUG 664207: We should re-escape escaped characters
  // But can we do that reliably?
  return this.prefix + this.text + this.suffix;
};

/**
 * Merge an array of arguments into a single argument.
 * All Arguments in the array are expected to have the same emitter
 */
Argument.merge = function(argArray, start, end) {
  start = (start === undefined) ? 0 : start;
  end = (end === undefined) ? argArray.length : end;

  var joined;
  for (var i = start; i < end; i++) {
    var arg = argArray[i];
    if (!joined) {
      joined = arg;
    }
    else {
      joined = joined.merge(arg);
    }
  }
  return joined;
};

/**
 * For test/debug use only. The output from this function is subject to wanton
 * random change without notice, and should not be relied upon to even exist
 * at some later date.
 */
Object.defineProperty(Argument.prototype, '_summaryJson', {
  get: function() {
    var assignStatus = this.assignment == null ?
            'null' :
            this.assignment.param.name;
    return '<' + this.prefix + ':' + this.text + ':' + this.suffix + '>' +
        ' (a=' + assignStatus + ',' + ' t=' + this.type + ')';
  },
  enumerable: true
});

exports.Argument = Argument;


/**
 * BlankArgument is a marker that the argument wasn't typed but is there to
 * fill a slot. Assignments begin with their arg set to a BlankArgument.
 */
function BlankArgument() {
  this.text = '';
  this.prefix = '';
  this.suffix = '';
}

BlankArgument.prototype = Object.create(Argument.prototype);

BlankArgument.prototype.type = 'BlankArgument';

exports.BlankArgument = BlankArgument;


/**
 * ScriptArgument is a marker that the argument is designed to be Javascript.
 * It also implements the special rules that spaces after the { or before the
 * } are part of the pre/suffix rather than the content, and that they are
 * never 'blank' so they can be used by Requisition._split() and not raise an
 * ERROR status due to being blank.
 */
function ScriptArgument(text, prefix, suffix) {
  this.text = text !== undefined ? text : '';
  this.prefix = prefix !== undefined ? prefix : '';
  this.suffix = suffix !== undefined ? suffix : '';

  ScriptArgument._moveSpaces(this);
}

ScriptArgument.prototype = Object.create(Argument.prototype);

ScriptArgument.prototype.type = 'ScriptArgument';

/**
 * Private/Dangerous: Alters a ScriptArgument to move the spaces at the start
 * or end of the 'text' into the prefix/suffix. With a string, " a " is 3 chars
 * long, but with a ScriptArgument, { a } is only one char long.
 * Arguments are generally supposed to be immutable, so this method should only
 * be called on a ScriptArgument that isn't exposed to the outside world yet.
 */
ScriptArgument._moveSpaces = function(arg) {
  while (arg.text.charAt(0) === ' ') {
    arg.prefix = arg.prefix + ' ';
    arg.text = arg.text.substring(1);
  }

  while (arg.text.charAt(arg.text.length - 1) === ' ') {
    arg.suffix = ' ' + arg.suffix;
    arg.text = arg.text.slice(0, -1);
  }
};

/**
 * As Argument.beget that implements the space rule documented in the ctor.
 */
ScriptArgument.prototype.beget = function(options) {
  options.type = ScriptArgument;
  var begotten = Argument.prototype.beget.call(this, options);
  ScriptArgument._moveSpaces(begotten);
  return begotten;
};

exports.ScriptArgument = ScriptArgument;


/**
 * Commands like 'echo' with a single string argument, and used with the
 * special format like: 'echo a b c' effectively have a number of arguments
 * merged together.
 */
function MergedArgument(args, start, end) {
  if (!Array.isArray(args)) {
    throw new Error('args is not an array of Arguments');
  }

  if (start === undefined) {
    this.args = args;
  }
  else {
    this.args = args.slice(start, end);
  }

  var arg = Argument.merge(this.args);
  this.text = arg.text;
  this.prefix = arg.prefix;
  this.suffix = arg.suffix;
}

MergedArgument.prototype = Object.create(Argument.prototype);

MergedArgument.prototype.type = 'MergedArgument';

/**
 * Keep track of which assignment we've been assigned to, and allow the
 * original args to do the same.
 */
Object.defineProperty(MergedArgument.prototype, 'assignment', {
  get: function() { return this._assignment; },
  set: function(assignment) {
    this._assignment = assignment;

    this.args.forEach(function(arg) {
      arg.assignment = assignment;
    }, this);
  },
  enumerable: true
});

MergedArgument.prototype.getArgs = function() {
  return this.args;
};

MergedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof MergedArgument)) {
    return false;
  }

  // We might need to add a check that args is the same here

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

exports.MergedArgument = MergedArgument;


/**
 * TrueNamedArguments are for when we have an argument like --verbose which
 * has a boolean value, and thus the opposite of '--verbose' is ''.
 */
function TrueNamedArgument(arg) {
  this.arg = arg;
  this.text = arg.text;
  this.prefix = arg.prefix;
  this.suffix = arg.suffix;
}

TrueNamedArgument.prototype = Object.create(Argument.prototype);

TrueNamedArgument.prototype.type = 'TrueNamedArgument';

Object.defineProperty(TrueNamedArgument.prototype, 'assignment', {
  get: function() { return this._assignment; },
  set: function(assignment) {
    this._assignment = assignment;

    if (this.arg) {
      this.arg.assignment = assignment;
    }
  },
  enumerable: true
});

TrueNamedArgument.prototype.getArgs = function() {
  return [ this.arg ];
};

TrueNamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof TrueNamedArgument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * As Argument.beget that rebuilds nameArg and valueArg
 */
TrueNamedArgument.prototype.beget = function(options) {
  if (options.text) {
    console.error('Can\'t change text of a TrueNamedArgument', this, options);
  }

  options.type = TrueNamedArgument;
  var begotten = Argument.prototype.beget.call(this, options);
  begotten.arg = new Argument(begotten.text, begotten.prefix, begotten.suffix);
  return begotten;
};

exports.TrueNamedArgument = TrueNamedArgument;


/**
 * FalseNamedArguments are for when we don't have an argument like --verbose
 * which has a boolean value, and thus the opposite of '' is '--verbose'.
 */
function FalseNamedArgument() {
  this.text = '';
  this.prefix = '';
  this.suffix = '';
}

FalseNamedArgument.prototype = Object.create(Argument.prototype);

FalseNamedArgument.prototype.type = 'FalseNamedArgument';

FalseNamedArgument.prototype.getArgs = function() {
  return [ ];
};

FalseNamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof FalseNamedArgument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

exports.FalseNamedArgument = FalseNamedArgument;


/**
 * A named argument is for cases where we have input in one of the following
 * formats:
 * <ul>
 * <li>--param value
 * <li>-p value
 * </ul>
 * We model this as a normal argument but with a long prefix.
 *
 * There are 2 ways to construct a NamedArgument. One using 2 Arguments which
 * are taken to be the argument for the name (e.g. '--param') and one for the
 * value to assign to that parameter.
 * Alternatively, you can pass in the text/prefix/suffix values in the same
 * way as an Argument is constructed. If you do this then you are expected to
 * assign to nameArg and valueArg before exposing the new NamedArgument.
 */
function NamedArgument() {
  if (typeof arguments[0] === 'string') {
    this.nameArg = null;
    this.valueArg = null;
    this.text = arguments[0];
    this.prefix = arguments[1];
    this.suffix = arguments[2];
  }
  else if (arguments[1] == null) {
    this.nameArg = arguments[0];
    this.valueArg = null;
    this.text = '';
    this.prefix = this.nameArg.toString();
    this.suffix = '';
  }
  else {
    this.nameArg = arguments[0];
    this.valueArg = arguments[1];
    this.text = this.valueArg.text;
    this.prefix = this.nameArg.toString() + this.valueArg.prefix;
    this.suffix = this.valueArg.suffix;
  }
}

NamedArgument.prototype = Object.create(Argument.prototype);

NamedArgument.prototype.type = 'NamedArgument';

Object.defineProperty(NamedArgument.prototype, 'assignment', {
  get: function() { return this._assignment; },
  set: function(assignment) {
    this._assignment = assignment;

    this.nameArg.assignment = assignment;
    if (this.valueArg != null) {
      this.valueArg.assignment = assignment;
    }
  },
  enumerable: true
});

NamedArgument.prototype.getArgs = function() {
  return this.valueArg ? [ this.nameArg, this.valueArg ] : [ this.nameArg ];
};

NamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }

  if (!(that instanceof NamedArgument)) {
    return false;
  }

  // We might need to add a check that nameArg and valueArg are the same

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * As Argument.beget that rebuilds nameArg and valueArg
 */
NamedArgument.prototype.beget = function(options) {
  options.type = NamedArgument;
  var begotten = Argument.prototype.beget.call(this, options);

  // Cut the prefix into |whitespace|non-whitespace|whitespace+quote so we can
  // rebuild nameArg and valueArg from the parts
  var matches = /^([\s]*)([^\s]*)([\s]*['"]?)$/.exec(begotten.prefix);

  if (this.valueArg == null && begotten.text === '') {
    begotten.nameArg = new Argument(matches[2], matches[1], matches[3]);
    begotten.valueArg = null;
  }
  else {
    begotten.nameArg = new Argument(matches[2], matches[1], '');
    begotten.valueArg = new Argument(begotten.text, matches[3], begotten.suffix);
  }

  return begotten;
};

exports.NamedArgument = NamedArgument;


/**
 * An argument the groups together a number of plain arguments together so they
 * can be jointly assigned to a single array parameter
 */
function ArrayArgument() {
  this.args = [];
}

ArrayArgument.prototype = Object.create(Argument.prototype);

ArrayArgument.prototype.type = 'ArrayArgument';

ArrayArgument.prototype.addArgument = function(arg) {
  this.args.push(arg);
};

ArrayArgument.prototype.addArguments = function(args) {
  Array.prototype.push.apply(this.args, args);
};

ArrayArgument.prototype.getArguments = function() {
  return this.args;
};

Object.defineProperty(ArrayArgument.prototype, 'assignment', {
  get: function() { return this._assignment; },
  set: function(assignment) {
    this._assignment = assignment;

    this.args.forEach(function(arg) {
      arg.assignment = assignment;
    }, this);
  },
  enumerable: true
});

ArrayArgument.prototype.getArgs = function() {
  return this.args;
};

ArrayArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }

  if (that.type !== 'ArrayArgument') {
    return false;
  }

  if (this.args.length !== that.args.length) {
    return false;
  }

  for (var i = 0; i < this.args.length; i++) {
    if (!this.args[i].equals(that.args[i])) {
      return false;
    }
  }

  return true;
};

/**
 * Helper when we're putting arguments back together
 */
ArrayArgument.prototype.toString = function() {
  return '{' + this.args.map(function(arg) {
    return arg.toString();
  }, this).join(',') + '}';
};

exports.ArrayArgument = ArrayArgument;


});
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

define('gcli/api', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/converters', 'gcli/types', 'gcli/settings', 'gcli/cli', 'gcli/ui/fields', 'gcli/ui/intro', 'gcli/ui/terminal'], function(require, exports, module) {

'use strict';

var canon = require('gcli/canon');
var converters = require('gcli/converters');
var types = require('gcli/types');
var settings = require('gcli/settings');
var Requisition = require('gcli/cli').Requisition;

var fields = require('gcli/ui/fields');
var intro = require('gcli/ui/intro');
var Terminal = require('gcli/ui/terminal').Terminal;

/**
 * This is the heart of the API that we expose to the outside
 */
exports.getApi = function() {
  return {
    addCommand: canon.addCommand,
    removeCommand: canon.removeCommand,
    addConverter: converters.addConverter,
    removeConverter: converters.removeConverter,
    addType: types.addType,
    removeType: types.removeType,

    addItems: function(items) {
      items.forEach(function(item) {
        // Some items are registered using the constructor so we need to check
        // the prototype for the the type of the item
        var type = item.item;
        if (type == null && item.prototype) {
            type = item.prototype.item;
        }
        if (type === 'command') {
          canon.addCommand(item);
        }
        else if (type === 'type') {
          types.addType(item);
        }
        else if (type === 'converter') {
          converters.addConverter(item);
        }
        else if (type === 'setting') {
          settings.addSetting(item);
        }
        else if (type === 'field') {
          fields.addField(item);
        }
        else {
          console.error('Error for: ', item);
          throw new Error('item property not found');
        }
      });
    },

    removeItems: function(items) {
      items.forEach(function(item) {
        if (item.item === 'command') {
          canon.removeCommand(item);
        }
        else if (item.item === 'type') {
          types.removeType(item);
        }
        else if (item.item === 'converter') {
          converters.removeConverter(item);
        }
        else if (item.item === 'settings') {
          settings.removeSetting(item);
        }
        else if (item.item === 'field') {
          fields.removeField(item);
        }
        else {
          throw new Error('item property not found');
        }
      });
    },

    /**
     * createDisplay() calls 'new Terminal()' but returns an object which
     * exposes a much restricted set of functions rather than all those exposed
     * by Terminal.
     * This allows for robust testing without exposing too many internals.
     * @param options See Terminal() for a description of the available options
     */
    createDisplay: function(options) {
      options = options || {};
      if (options.settings != null) {
        settings.setDefaults(options.settings);
      }

      var doc = options.document || document;

      var requisition = new Requisition(options.environment || {}, doc);
      var terminal = new Terminal(options, {
        requisition: requisition,
        document: doc
      });

      intro.maybeShowIntro(requisition.commandOutputManager,
                           requisition.conversionContext);

      return {
        /**
         * The exact shape of the object returned by exec is likely to change in
         * the near future. If you do use it, please expect your code to break.
         */
        exec: requisition.exec.bind(requisition),
        update: requisition.update.bind(requisition),
        updateExec: requisition.updateExec.bind(requisition)
      };
    }
  };
};

/**
 * api.getApi() is clean, but generally we want to add the functions to the
 * 'exports' object. So this is a quick helper.
 */
exports.populateApi = function(obj) {
  var exportable = exports.getApi();
  Object.keys(exportable).forEach(function(key) {
    obj[key] = exportable[key];
  });
};

});
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

define('gcli/canon', ['require', 'exports', 'module' , 'util/util', 'util/l10n', 'gcli/types'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var l10n = require('util/l10n');

var types = require('gcli/types');
var Status = require('gcli/types').Status;

/**
 * Implement the localization algorithm for any documentation objects (i.e.
 * description and manual) in a command.
 * @param data The data assigned to a description or manual property
 * @param onUndefined If data == null, should we return the data untouched or
 * lookup a 'we don't know' key in it's place.
 */
function lookup(data, onUndefined) {
  if (data == null) {
    if (onUndefined) {
      return l10n.lookup(onUndefined);
    }

    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object') {
    if (data.key) {
      return l10n.lookup(data.key);
    }

    var locales = l10n.getPreferredLocales();
    var translated;
    locales.some(function(locale) {
      translated = data[locale];
      return translated != null;
    });
    if (translated != null) {
      return translated;
    }

    console.error('Can\'t find locale in descriptions: ' +
            'locales=' + JSON.stringify(locales) + ', ' +
            'description=' + JSON.stringify(data));
    return '(No description)';
  }

  return l10n.lookup(onUndefined);
}


/**
 * The command object is mostly just setup around a commandSpec (as passed to
 * #addCommand()).
 */
function Command(commandSpec) {
  Object.keys(commandSpec).forEach(function(key) {
    this[key] = commandSpec[key];
  }, this);

  if (!this.name) {
    throw new Error('All registered commands must have a name');
  }

  if (this.params == null) {
    this.params = [];
  }
  if (!Array.isArray(this.params)) {
    throw new Error('command.params must be an array in ' + this.name);
  }

  this.hasNamedParameters = false;
  this.description = 'description' in this ? this.description : undefined;
  this.description = lookup(this.description, 'canonDescNone');
  this.manual = 'manual' in this ? this.manual : undefined;
  this.manual = lookup(this.manual);

  // At this point this.params has nested param groups. We want to flatten it
  // out and replace the param object literals with Parameter objects
  var paramSpecs = this.params;
  this.params = [];
  this.paramGroups = {};
  this._shortParams = {};

  var addParam = function(param) {
    var groupName = param.groupName || Parameter.DEFAULT_GROUP_NAME;
    this.params.push(param);
    if (!this.paramGroups.hasOwnProperty(groupName)) {
      this.paramGroups[groupName] = [];
    }
    this.paramGroups[groupName].push(param);
  }.bind(this);

  // Track if the user is trying to mix default params and param groups.
  // All the non-grouped parameters must come before all the param groups
  // because non-grouped parameters can be assigned positionally, so their
  // index is important. We don't want 'holes' in the order caused by
  // parameter groups.
  var usingGroups = false;

  // In theory this could easily be made recursive, so param groups could
  // contain nested param groups. Current thinking is that the added
  // complexity for the UI probably isn't worth it, so this implementation
  // prevents nesting.
  paramSpecs.forEach(function(spec) {
    if (!spec.group) {
      var param = new Parameter(spec, this, null);
      addParam(param);

      if (!param.isPositionalAllowed) {
        this.hasNamedParameters = true;
      }

      if (usingGroups && param.groupName == null) {
        throw new Error('Parameters can\'t come after param groups.' +
                        ' Ignoring ' + this.name + '/' + spec.name);
      }

      if (param.groupName != null) {
        usingGroups = true;
      }
    }
    else {
      spec.params.forEach(function(ispec) {
        var param = new Parameter(ispec, this, spec.group);
        addParam(param);

        if (!param.isPositionalAllowed) {
          this.hasNamedParameters = true;
        }
      }, this);

      usingGroups = true;
    }
  }, this);

  this.params.forEach(function(param) {
    if (param.short != null) {
      if (this._shortParams[param.short] != null) {
        throw new Error('Multiple params using short name ' + param.short);
      }
      this._shortParams[param.short] = param;
    }
  }, this);
}

/**
 * JSON serializer that avoids non-serializable data
 */
Object.defineProperty(Command.prototype, 'json', {
  get: function() {
    return {
      name: this.name,
      description: this.description,
      manual: this.manual,
      params: this.params.map(function(param) { return param.json; }),
      returnType: this.returnType,
      isParent: (this.exec == null)
    };
  },
  enumerable: true
});

/**
 * Easy way to lookup parameters by short name
 */
Command.prototype.getParameterByShortName = function(short) {
  return this._shortParams[short];
};

exports.Command = Command;


/**
 * A wrapper for a paramSpec so we can sort out shortened versions names for
 * option switches
 */
function Parameter(paramSpec, command, groupName) {
  this.command = command || { name: 'unnamed' };
  this.paramSpec = paramSpec;
  this.name = this.paramSpec.name;
  this.type = this.paramSpec.type;
  this.short = this.paramSpec.short;

  if (this.short != null && !/[0-9A-Za-z]/.test(this.short)) {
    throw new Error('\'short\' value must be a single alphanumeric digit.');
  }

  this.groupName = groupName;
  if (this.groupName != null) {
    if (this.paramSpec.option != null) {
      throw new Error('Can\'t have a "option" property in a nested parameter');
    }
  }
  else {
    if (this.paramSpec.option != null) {
      this.groupName = this.paramSpec.option === true ?
              Parameter.DEFAULT_GROUP_NAME :
              '' + this.paramSpec.option;
    }
  }

  if (!this.name) {
    throw new Error('In ' + this.command.name +
                    ': all params must have a name');
  }

  var typeSpec = this.type;
  this.type = types.createType(typeSpec);
  if (this.type == null) {
    console.error('Known types: ' + types.getTypeNames().join(', '));
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': can\'t find type for: ' + JSON.stringify(typeSpec));
  }

  // boolean parameters have an implicit defaultValue:false, which should
  // not be changed. See the docs.
  if (this.type.name === 'boolean' &&
      this.paramSpec.defaultValue !== undefined) {
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': boolean parameters can not have a defaultValue.' +
                    ' Ignoring');
  }

  // Check the defaultValue for validity.
  // Both undefined and null get a pass on this test. undefined is used when
  // there is no defaultValue, and null is used when the parameter is
  // optional, neither are required to parse and stringify.
  if (this._defaultValue != null) {
    try {
      // Passing null in for a context is bound to get us into trouble some day
      // in which case we'll need to mock one up in some way
      var context = null;
      var defaultText = this.type.stringify(this.paramSpec.defaultValue, context);
      var parsed = this.type.parseString(defaultText, context);
      parsed.then(function(defaultConversion) {
        if (defaultConversion.getStatus() !== Status.VALID) {
          console.error('In ' + this.command.name + '/' + this.name +
                        ': Error round tripping defaultValue. status = ' +
                        defaultConversion.getStatus());
        }
      }.bind(this), util.errorHandler);
    }
    catch (ex) {
      throw new Error('In ' + this.command.name + '/' + this.name + ': ' + ex);
    }
  }

  // All parameters that can only be set via a named parameter must have a
  // non-undefined default value
  if (!this.isPositionalAllowed && this.paramSpec.defaultValue === undefined &&
      this.type.getBlank == null && this.type.name !== 'boolean') {
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': Missing defaultValue for optional parameter.');
  }
}

/**
 * The default group name, when none is given explicitly
 */
Parameter.DEFAULT_GROUP_NAME = l10n.lookup('canonDefaultGroupName');

/**
 * type.getBlank can be expensive, so we delay execution where we can
 */
Object.defineProperty(Parameter.prototype, 'defaultValue', {
  get: function() {
    if (!('_defaultValue' in this)) {
      this._defaultValue = (this.paramSpec.defaultValue !== undefined) ?
          this.paramSpec.defaultValue :
          this.type.getBlank().value;
    }

    return this._defaultValue;
  },
  enumerable : true
});

/**
 * Does the given name uniquely identify this param (among the other params
 * in this command)
 * @param name The name to check
 */
Parameter.prototype.isKnownAs = function(name) {
  return (name === '--' + this.name) || (name === '-' + this.short);
};

/**
 * Resolve the manual for this parameter, by looking in the paramSpec
 * and doing a l10n lookup
 */
Object.defineProperty(Parameter.prototype, 'manual', {
  get: function() {
    return lookup(this.paramSpec.manual || undefined);
  },
  enumerable: true
});

/**
 * Resolve the description for this parameter, by looking in the paramSpec
 * and doing a l10n lookup
 */
Object.defineProperty(Parameter.prototype, 'description', {
  get: function() {
    return lookup(this.paramSpec.description || undefined, 'canonDescNone');
  },
  enumerable: true
});

/**
 * Is the user required to enter data for this parameter? (i.e. has
 * defaultValue been set to something other than undefined)
 */
Object.defineProperty(Parameter.prototype, 'isDataRequired', {
  get: function() {
    return this.defaultValue === undefined;
  },
  enumerable: true
});

/**
 * Reflect the paramSpec 'hidden' property (dynamically so it can change)
 */
Object.defineProperty(Parameter.prototype, 'hidden', {
  get: function() {
    return this.paramSpec.hidden;
  },
  enumerable: true
});

/**
 * Are we allowed to assign data to this parameter using positional
 * parameters?
 */
Object.defineProperty(Parameter.prototype, 'isPositionalAllowed', {
  get: function() {
    return this.groupName == null;
  },
  enumerable: true
});

/**
 * JSON serializer that avoids non-serializable data
 */
Object.defineProperty(Parameter.prototype, 'json', {
  get: function() {
    var json = {
      name: this.name,
      type: this.paramSpec.type,
      description: this.description
    };
    if (this.defaultValue !== undefined && json.type !== 'boolean') {
      json.defaultValue = this.defaultValue;
    }
    if (this.option !== undefined) {
      json.option = this.option;
    }
    if (this.short !== undefined) {
      json.short = this.short;
    }
    return json;
  },
  enumerable: true
});

exports.Parameter = Parameter;


/**
 * A canon is a store for a list of commands
 */
function Canon() {
  // A lookup hash of our registered commands
  this._commands = {};
  // A sorted list of command names, we regularly want them in order, so pre-sort
  this._commandNames = [];
  // A lookup of the original commandSpecs by command name
  this._commandSpecs = {};

  // Enable people to be notified of changes to the list of commands
  this.onCanonChange = util.createEvent('canon.onCanonChange');
}

/**
 * Add a command to the canon of known commands.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * @param commandSpec The command and its metadata.
 * @return The new command
 */
Canon.prototype.addCommand = function(commandSpec) {
  if (this._commands[commandSpec.name] != null) {
    // Roughly canon.removeCommand() without the event call, which we do later
    delete this._commands[commandSpec.name];
    this._commandNames = this._commandNames.filter(function(test) {
      return test !== commandSpec.name;
    });
  }

  var command = new Command(commandSpec);
  this._commands[commandSpec.name] = command;
  this._commandNames.push(commandSpec.name);
  this._commandNames.sort();

  this._commandSpecs[commandSpec.name] = commandSpec;

  this.onCanonChange();
  return command;
};

/**
 * Remove an individual command. The opposite of #addCommand().
 * Removing a non-existent command is a no-op.
 * @param commandOrName Either a command name or the command itself.
 * @return true if a command was removed, false otherwise.
 */
Canon.prototype.removeCommand = function(commandOrName) {
  var name = typeof commandOrName === 'string' ?
          commandOrName :
          commandOrName.name;

  if (!this._commands[name]) {
    return false;
  }

  // See start of canon.addCommand if changing this code
  delete this._commands[name];
  delete this._commandSpecs[name];
  this._commandNames = this._commandNames.filter(function(test) {
    return test !== name;
  });

  this.onCanonChange();
  return true;
};

/**
 * Retrieve a command by name
 * @param name The name of the command to retrieve
 */
Canon.prototype.getCommand = function(name) {
  // '|| undefined' is to silence 'reference to undefined property' warnings
  return this._commands[name] || undefined;
};

/**
 * Get an array of all the registered commands.
 */
Canon.prototype.getCommands = function() {
  return Object.keys(this._commands).map(function(name) {
    return this._commands[name];
  }, this);
};

/**
 * Get an array containing the names of the registered commands.
 */
Canon.prototype.getCommandNames = function() {
  return this._commandNames.slice(0);
};

/**
 * Get access to the stored commandMetaDatas (i.e. before they were made into
 * instances of Command/Parameters) so we can remote them.
 */
Canon.prototype.getCommandSpecs = function() {
  var specs = {};

  Object.keys(this._commands).forEach(function(name) {
    var command = this._commands[name];
    if (!command.noRemote) {
      specs[name] = command.json;
    }
  }.bind(this));

  return specs;
};

/**
 * Add a set of commands that are executed somewhere else.
 * @param prefix The name prefix that we assign to all command names
 * @param commandSpecs Presumably as obtained from getCommandSpecs on remote
 * @param remoter Function to call on exec of a new remote command. This is
 * defined just like an exec function (i.e. that takes args/context as params
 * and returns a promise) with one extra feature, that the context includes a
 * 'commandName' property that contains the original command name.
 * @param to URL-like string that describes where the commands are executed.
 * This is to complete the parent command description.
 */
Canon.prototype.addProxyCommands = function(prefix, commandSpecs, remoter, to) {
  var names = Object.keys(commandSpecs);

  if (this._commands[prefix] != null) {
    throw new Error(l10n.lookupFormat('canonProxyExists', [ prefix ]));
  }

  // We need to add the parent command so all the commands from the other
  // system have a parent
  this.addCommand({
    name: prefix,
    isProxy: true,
    description: l10n.lookupFormat('canonProxyDesc', [ to ]),
    manual: l10n.lookupFormat('canonProxyManual', [ to ])
  });

  names.forEach(function(name) {
    var commandSpec = commandSpecs[name];

    if (commandSpec.noRemote) {
      return;
    }

    if (!commandSpec.isParent) {
      commandSpec.exec = function(args, context) {
        context.commandName = name;
        return remoter(args, context);
      }.bind(this);
    }

    commandSpec.name = prefix + ' ' + commandSpec.name;
    commandSpec.isProxy = true;
    this.addCommand(commandSpec);
  }.bind(this));
};

/**
 * Remove a set of commands added with addProxyCommands.
 * @param prefix The name prefix that we assign to all command names
 */
Canon.prototype.removeProxyCommands = function(prefix) {
  var toRemove = [];
  Object.keys(this._commandSpecs).forEach(function(name) {
    if (name.indexOf(prefix) === 0) {
      toRemove.push(name);
    }
  }.bind(this));

  var removed = [];
  toRemove.forEach(function(name) {
    var command = this.getCommand(name);
    if (command.isProxy) {
      this.removeCommand(name);
      removed.push(name);
    }
    else {
      console.error('Skipping removal of \'' + name +
                    '\' because it is not a proxy command.');
    }
  }.bind(this));

  return removed;
};

var canon = new Canon();

exports.Canon = Canon;
exports.addCommand = canon.addCommand.bind(canon);
exports.removeCommand = canon.removeCommand.bind(canon);
exports.onCanonChange = canon.onCanonChange;
exports.getCommands = canon.getCommands.bind(canon);
exports.getCommand = canon.getCommand.bind(canon);
exports.getCommandNames = canon.getCommandNames.bind(canon);
exports.getCommandSpecs = canon.getCommandSpecs.bind(canon);
exports.addProxyCommands = canon.addProxyCommands.bind(canon);
exports.removeProxyCommands = canon.removeProxyCommands.bind(canon);

/**
 * CommandOutputManager stores the output objects generated by executed
 * commands.
 *
 * CommandOutputManager is exposed to the the outside world and could (but
 * shouldn't) be used before gcli.startup() has been called.
 * This could should be defensive to that where possible, and we should
 * certainly document if the use of it or similar will fail if used too soon.
 */
function CommandOutputManager() {
  this.onOutput = util.createEvent('CommandOutputManager.onOutput');
}

exports.CommandOutputManager = CommandOutputManager;


});
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

define('util/l10n', ['require', 'exports', 'module' , 'gcli/nls/strings'], function(require, exports, module) {

'use strict';

var strings = {};

/**
 * Add a CommonJS module to the list of places in which we look for
 * localizations. Before calling this function, it's important to make a call
 * to require(modulePath) to ensure that the dependency system (either require
 * or dryice) knows to make the module ready.
 * @param modulePath A CommonJS module (as used in calls to require). Don't
 * add the 'i18n!' prefix used by requirejs.
 * @see unregisterStringsSource()
 */
exports.registerStringsSource = function(modulePath) {
  //  Bug 683844: Should be require('i18n!' + module);
  var additions = require(modulePath).root;
  Object.keys(additions).forEach(function(key) {
    if (strings[key]) {
      console.error('Key \'' + key + '\' (loaded from ' + modulePath + ') ' +
          'already exists. Ignoring.');
      return;
    }
    strings[key] = additions[key];
  }, this);
};

/**
 * The main GCLI strings source is always required.
 * We have to load it early on in the process (in the require phase) so that
 * we can define settingSpecs and commandSpecs at the top level too.
 */
require('gcli/nls/strings');
exports.registerStringsSource('gcli/nls/strings');

/**
 * Undo the effects of registerStringsSource().
 * @param modulePath A CommonJS module (as used in calls to require).
 * @see registerStringsSource()
 */
exports.unregisterStringsSource = function(modulePath) {
  //  Bug 683844: Should be require('i18n!' + module);
  var additions = require(modulePath).root;
  Object.keys(additions).forEach(function(key) {
    delete strings[key];
  }, this);
};

/**
 * Finds the preferred locales of the user as an array of RFC 4646 strings
 * (e.g. 'pt-br').
 * . There is considerable confusion as to the correct value
 * since there are a number of places the information can be stored:
 * - In the OS (IE:navigator.userLanguage, IE:navigator.systemLanguage)
 * - In the browser (navigator.language, IE:navigator.browserLanguage)
 * - By GEO-IP
 * - By website specific settings
 * This implementation uses navigator.language || navigator.userLanguage as
 * this is compatible with requirejs.
 * See http://tools.ietf.org/html/rfc4646
 * See http://stackoverflow.com/questions/1043339/javascript-for-detecting-browser-language-preference
 * See http://msdn.microsoft.com/en-us/library/ms534713.aspx
 * @return The current locale as an RFC 4646 string
 */
exports.getPreferredLocales = function() {
  var language = typeof navigator !== 'undefined' ?
      (navigator.language || navigator.userLanguage).toLowerCase() :
      'en-us';
  var parts = language.split('-');
  var reply = parts.map(function(part, index) {
    return parts.slice(0, parts.length - index).join('-');
  });
  reply.push('root');
  return reply;
};

/**
 * Lookup a key in our strings file using localized versions if possible,
 * throwing an error if that string does not exist.
 * @param key The string to lookup
 * This should generally be in the general form 'filenameExportIssue' where
 * filename is the name of the module (all lowercase without underscores) and
 * export is the name of a top level thing in which the message is used and
 * issue is a short string indicating the issue.
 * The point of a 'standard' like this is to keep strings fairly short whilst
 * still allowing users to have an idea where they come from, and preventing
 * name clashes.
 * @return The string resolved from the correct locale
 */
exports.lookup = function(key) {
  var str = strings[key];
  if (str == null) {
    throw new Error('No i18n key: ' + key);
  }
  return str;
};

/**
 * An alternative to lookup().
 * <tt>l10n.lookup('x') === l10n.propertyLookup.x</tt>
 * We should go easy on this method until we are sure that we don't have too
 * many 'old-browser' problems. However this works particularly well with the
 * templater because you can pass this in to a template that does not do
 * <tt>{ allowEval: true }</tt>
 */
if (typeof Proxy !== 'undefined') {
  exports.propertyLookup = Proxy.create({
    get: function(rcvr, name) {
      return exports.lookup(name);
    }
  });
}
else {
  exports.propertyLookup = strings;
}

/**
 * Helper function to process swaps.
 * For example:
 *   swap('the {subject} {verb} {preposition} the {object}', {
 *     subject: 'cat', verb: 'sat', preposition: 'on', object: 'mat'
 *   });
 * Returns 'the cat sat on the mat'.
 * @param str The string containing parts delimited by { and } to be replaced
 * @param swaps Lookup map containing the replacement strings
 */
function swap(str, swaps) {
  return str.replace(/\{[^}]*\}/g, function(name) {
    name = name.slice(1, -1);
    if (swaps == null) {
      console.log('Missing swaps while looking up \'' + name + '\'');
      return '';
    }
    var replacement = swaps[name];
    if (replacement == null) {
      console.log('Can\'t find \'' + name + '\' in ' + JSON.stringify(swaps));
      replacement = '';
    }
    return replacement;
  });
}

/**
 * Lookup a key in our strings file using localized versions if possible,
 * and perform string interpolation to inject runtime values into the string.
 * l10n lookup is required for user visible strings, but not required for
 * console messages and throw strings.
 * lookupSwap() is virtually identical in function to lookupFormat(), except
 * that lookupSwap() is easier to use, however lookupFormat() is required if
 * your code is to work with Mozilla's i10n system.
 * @param key The string to lookup
 * This should generally be in the general form 'filename_export_issue' where
 * filename is the name of the module (all lowercase without underscores) and
 * export is the name of a top level thing in which the message is used and
 * issue is a short string indicating the issue.
 * The point of a 'standard' like this is to keep strings fairly short whilst
 * still allowing users to have an idea where they come from, and preventing
 * name clashes.
 * The value looked up may contain {variables} to be exchanged using swaps
 * @param swaps A map of variable values to be swapped.
 * @return A looked-up and interpolated message for display to the user.
 * @see lookupFormat()
 */
exports.lookupSwap = function(key, swaps) {
  var str = exports.lookup(key);
  return swap(str, swaps);
};

/**
 * Perform the string swapping required by format().
 * @see format() for details of the swaps performed.
 */
function format(str, swaps) {
  // First replace the %S strings
  var index = 0;
  str = str.replace(/%S/g, function() {
    return swaps[index++];
  });
  // Then %n$S style strings
  str = str.replace(/%([0-9])\$S/g, function(match, idx) {
    return swaps[idx - 1];
  });
  return str;
}

/**
 * Lookup a key in our strings file using localized versions if possible,
 * and perform string interpolation to inject runtime values into the string.
 * l10n lookup is required for user visible strings, but not required for
 * console messages and throw strings.
 * lookupFormat() is virtually identical in function to lookupSwap(), except
 * that lookupFormat() works with strings held in the mozilla repo in addition
 * to files held outside.
 * @param key Looks up the format string for the given key in the string bundle
 * and returns a formatted copy where each occurrence of %S (uppercase) is
 * replaced by each successive element in the supplied array.
 * Alternatively, numbered indices of the format %n$S (e.g. %1$S, %2$S, etc.)
 * can be used to specify the position of the corresponding parameter
 * explicitly.
 * The mozilla version performs more advances formatting than these simple
 * cases, however these cases are not supported so far, mostly because they are
 * not well documented.
 * @param swaps An array of strings to be swapped.
 * @return A looked-up and interpolated message for display to the user.
 * @see https://developer.mozilla.org/en/XUL/Method/getFormattedString
 */
exports.lookupFormat = function(key, swaps) {
  var str = exports.lookup(key);
  return format(str, swaps);
};

/**
 * Lookup the correct pluralization of a word/string.
 * The first ``key`` and ``swaps`` parameters of lookupPlural() are the same
 * as for lookupSwap(), however there is an extra ``ord`` parameter which indicates
 * the plural ordinal to use.
 * For example, in looking up the string '39 steps', the ordinal would be 39.
 *
 * More detailed example:
 * French has 2 plural forms: the first for 0 and 1, the second for everything
 * else. English also has 2, but the first only covers 1. Zero is lumped into
 * the 'everything else' category. Vietnamese has only 1 plural form - so it
 * uses the same noun form however many of them there are.
 * The following localization strings describe how to pluralize the phrase
 * '1 minute':
 *   'en-us': { demo_plural_time: [ '{ord} minute', '{ord} minutes' ] },
 *   'fr-fr': { demo_plural_time: [ '{ord} minute', '{ord} minutes' ] },
 *   'vi-vn': { demo_plural_time: [ '{ord} phut' ] },
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 minutes' in 'en-us'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 minute' in 'en-us'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 minutes' in 'en-us'
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 minute' in 'fr-fr'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 minute' in 'fr-fr'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 minutes' in 'fr-fr'
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 phut' in 'vi-vn'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 phut' in 'vi-vn'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 phut' in 'vi-vn'
 *
 * The
 * Note that the localization strings are (correctly) the same (since both
 * the English and the French words have the same etymology)
 * @param key The string to lookup in gcli/nls/strings.js
 * @param ord The number to use in plural lookup
 * @param swaps A map of variable values to be swapped.
 */
exports.lookupPlural = function(key, ord, swaps) {
  var index = getPluralRule().get(ord);
  var words = exports.lookup(key);
  var str = words[index];

  swaps = swaps || {};
  swaps.ord = ord;

  return swap(str, swaps);
};

/**
 * Find the correct plural rule for the current locale
 * @return a plural rule with a 'get()' function
 */
function getPluralRule() {
  if (!pluralRule) {
    var lang = navigator.language || navigator.userLanguage;
    // Convert lang to a rule index
    pluralRules.some(function(rule) {
      if (rule.locales.indexOf(lang) !== -1) {
        pluralRule = rule;
        return true;
      }
      return false;
    });

    // Use rule 0 by default, which is no plural forms at all
    if (!pluralRule) {
      console.error('Failed to find plural rule for ' + lang);
      pluralRule = pluralRules[0];
    }
  }

  return pluralRule;
}

/**
 * A plural form is a way to pluralize a noun. There are 2 simple plural forms
 * in English, with (s) and without - e.g. tree and trees. There are many other
 * ways to pluralize (e.g. witches, ladies, teeth, oxen, axes, data, alumini)
 * However they all follow the rule that 1 is 'singular' while everything
 * else is 'plural' (words without a plural form like sheep can be seen as
 * following this rule where the singular and plural forms are the same)
 * <p>Non-English languages have different pluralization rules, for example
 * French uses singular for 0 as well as 1. Japanese has no plurals while
 * Arabic and Russian are very complex.
 *
 * See https://developer.mozilla.org/en/Localization_and_Plurals
 * See https://secure.wikimedia.org/wikipedia/en/wiki/List_of_ISO_639-1_codes
 *
 * Contains code inspired by Mozilla L10n code originally developed by
 *     Edward Lee <edward.lee@engineering.uiuc.edu>
 */
var pluralRules = [
  /**
   * Index 0 - Only one form for all
   * Asian family: Japanese, Vietnamese, Korean
   */
  {
    locales: [
      'fa', 'fa-ir',
      'id',
      'ja', 'ja-jp-mac',
      'ka',
      'ko', 'ko-kr',
      'th', 'th-th',
      'tr', 'tr-tr',
      'zh', 'zh-tw', 'zh-cn'
    ],
    numForms: 1,
    get: function(n) {
      return 0;
    }
  },

  /**
   * Index 1 - Two forms, singular used for one only
   * Germanic family: English, German, Dutch, Swedish, Danish, Norwegian,
   *          Faroese
   * Romanic family: Spanish, Portuguese, Italian, Bulgarian
   * Latin/Greek family: Greek
   * Finno-Ugric family: Finnish, Estonian
   * Semitic family: Hebrew
   * Artificial: Esperanto
   * Finno-Ugric family: Hungarian
   * Turkic/Altaic family: Turkish
   */
  {
    locales: [
      'af', 'af-za',
      'as', 'ast',
      'bg',
      'br',
      'bs', 'bs-ba',
      'ca',
      'cy', 'cy-gb',
      'da',
      'de', 'de-de', 'de-ch',
      'en', 'en-gb', 'en-us', 'en-za',
      'el', 'el-gr',
      'eo',
      'es', 'es-es', 'es-ar', 'es-cl', 'es-mx',
      'et', 'et-ee',
      'eu',
      'fi', 'fi-fi',
      'fy', 'fy-nl',
      'gl', 'gl-gl',
      'he',
     //     'hi-in', Without an unqualified language, looks dodgy
      'hu', 'hu-hu',
      'hy', 'hy-am',
      'it', 'it-it',
      'kk',
      'ku',
      'lg',
      'mai',
     // 'mk', 'mk-mk', Should be 14?
      'ml', 'ml-in',
      'mn',
      'nb', 'nb-no',
      'no', 'no-no',
      'nl',
      'nn', 'nn-no',
      'no', 'no-no',
      'nb', 'nb-no',
      'nso', 'nso-za',
      'pa', 'pa-in',
      'pt', 'pt-pt',
      'rm', 'rm-ch',
     // 'ro', 'ro-ro', Should be 5?
      'si', 'si-lk',
     // 'sl',      Should be 10?
      'son', 'son-ml',
      'sq', 'sq-al',
      'sv', 'sv-se',
      'vi', 'vi-vn',
      'zu', 'zu-za'
    ],
    numForms: 2,
    get: function(n) {
      return n != 1 ?
        1 :
        0;
    }
  },

  /**
   * Index 2 - Two forms, singular used for zero and one
   * Romanic family: Brazilian Portuguese, French
   */
  {
    locales: [
      'ak', 'ak-gh',
      'bn', 'bn-in', 'bn-bd',
      'fr', 'fr-fr',
      'gu', 'gu-in',
      'kn', 'kn-in',
      'mr', 'mr-in',
      'oc', 'oc-oc',
      'or', 'or-in',
            'pt-br',
      'ta', 'ta-in', 'ta-lk',
      'te', 'te-in'
    ],
    numForms: 2,
    get: function(n) {
      return n > 1 ?
        1 :
        0;
    }
  },

  /**
   * Index 3 - Three forms, special case for zero
   * Latvian
   */
  {
    locales: [ 'lv' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        1 :
        n !== 0 ?
          2 :
          0;
    }
  },

  /**
   * Index 4 -
   * Scottish Gaelic
   */
  {
    locales: [ 'gd', 'gd-gb' ],
    numForms: 4,
    get: function(n) {
      return n == 1 || n == 11 ?
        0 :
        n == 2 || n == 12 ?
          1 :
          n > 0 && n < 20 ?
            2 :
            3;
    }
  },

  /**
   * Index 5 - Three forms, special case for numbers ending in 00 or [2-9][0-9]
   * Romanian
   */
  {
    locales: [ 'ro', 'ro-ro' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n === 0 || n % 100 > 0 && n % 100 < 20 ?
          1 :
          2;
    }
  },

  /**
   * Index 6 - Three forms, special case for numbers ending in 1[2-9]
   * Lithuanian
   */
  {
    locales: [ 'lt' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ?
          2 :
          1;
    }
  },

  /**
   * Index 7 - Three forms, special cases for numbers ending in 1 and
   *       2, 3, 4, except those ending in 1[1-4]
   * Slavic family: Russian, Ukrainian, Serbian, Croatian
   */
  {
    locales: [
      'be', 'be-by',
      'hr', 'hr-hr',
      'ru', 'ru-ru',
      'sr', 'sr-rs', 'sr-cs',
      'uk'
    ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ?
          1 :
          2;
    }
  },

  /**
   * Index 8 - Three forms, special cases for 1 and 2, 3, 4
   * Slavic family: Czech, Slovak
   */
  {
    locales: [ 'cs', 'sk' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n >= 2 && n <= 4 ?
          1 :
          2;
    }
  },

  /**
   * Index 9 - Three forms, special case for one and some numbers ending in
   *       2, 3, or 4
   * Polish
   */
  {
    locales: [ 'pl' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ?
          1 :
          2;
    }
  },

  /**
   * Index 10 - Four forms, special case for one and all numbers ending in
   *      02, 03, or 04
   * Slovenian
   */
  {
    locales: [ 'sl' ],
    numForms: 4,
    get: function(n) {
      return n % 100 == 1 ?
        0 :
        n % 100 == 2 ?
          1 :
          n % 100 == 3 || n % 100 == 4 ?
            2 :
            3;
    }
  },

  /**
   * Index 11 -
   * Irish Gaeilge
   */
  {
    locales: [ 'ga-ie', 'ga-ie', 'ga', 'en-ie' ],
    numForms: 5,
    get: function(n) {
      return n == 1 ?
        0 :
        n == 2 ?
          1 :
          n >= 3 && n <= 6 ?
            2 :
            n >= 7 && n <= 10 ?
              3 :
              4;
    }
  },

  /**
   * Index 12 -
   * Arabic
   */
  {
    locales: [ 'ar' ],
    numForms: 6,
    get: function(n) {
      return n === 0 ?
        5 :
        n == 1 ?
          0 :
          n == 2 ?
            1 :
            n % 100 >= 3 && n % 100 <= 10 ?
              2 :
              n % 100 >= 11 && n % 100 <= 99 ?
                3 :
                4;
    }
  },

  /**
   * Index 13 -
   * Maltese
   */
  {
    locales: [ 'mt' ],
    numForms: 4,
    get: function(n) {
      return n == 1 ?
        0 :
        n === 0 || n % 100 > 0 && n % 100 <= 10 ?
          1 :
          n % 100 > 10 && n % 100 < 20 ?
            2 :
            3;
    }
  },

  /**
   * Index 14 -
   * Macedonian
   */
  {
    locales: [ 'mk', 'mk-mk' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 ?
        0 :
        n % 10 == 2 ?
          1 :
          2;
    }
  },

  /**
   * Index 15 -
   * Icelandic
   */
  {
    locales: [ 'is' ],
    numForms: 2,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        1;
    }
  }

  /*
  // Known locales without a known plural rule
  'km', 'ms', 'ne-np', 'ne-np', 'ne', 'nr', 'nr-za', 'rw', 'ss', 'ss-za',
  'st', 'st-za', 'tn', 'tn-za', 'ts', 'ts-za', 've', 've-za', 'xh', 'xh-za'
  */
];

/**
 * The cached plural rule
 */
var pluralRule;

});

define('gcli/nls/strings', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

/**
 * This file has detailed comments as to the usage of these strings so when
 * translators work on these strings separately from the code, (but with the
 * comments) they have something to work on.
 * Each string should be commented using single-line comments.
 */
var i18n = {
  root: {
    // This message is used to describe any command or command parameter when
    // no description has been provided.
    canonDescNone: '(No description)',

    // The default name for a group of parameters.
    canonDefaultGroupName: 'Options',

    // These commands are used to execute commands on a remote system (using a
    // proxy). Parameters: %S is the name of the remote system.
    canonProxyDesc: 'Execute a command on %S',
    canonProxyManual: 'A set of commands that are executed on a remote system. The remote system is reached via %S',

    // This error message is displayed when we try to add a new command (using
    // a proxy) where one already exists with the same name.
    canonProxyExists: 'There is already a command called \'%S\'',

    // This message describes the '{' command, which allows entry of JavaScript
    // like traditional developer tool command lines.
    cliEvalJavascript: 'Enter JavaScript directly',

    // This message is displayed when the command line has more arguments than
    // the current command can understand.
    cliUnusedArg: 'Too many arguments',

    // The title of the dialog which displays the options that are available
    // to the current command.
    cliOptions: 'Available Options',

    // The error message when the user types a command that isn't registered
    cliUnknownCommand: 'Invalid Command',

    // Error message given when a file argument points to a file that does not
    // exist, but should (e.g. for use with File->Open)
    // %1$S is a filename
    fileErrNotExists: '\'%1$S\' doesn\'t exist',

    // Error message given when a file argument points to a file that exists,
    // but should not (e.g. for use with File->Save As)
    // %1$S is a filename
    fileErrExists: '\'%1$S\' already exists',

    // Error message given when a file argument points to a non-file, when a
    // file is needed. %1$S is a filename
    fileErrIsNotFile: '\'%1$S\' is not a file',

    // Error message given when a file argument points to a non-directory,
    // when a directory is needed (e.g. for use with 'cd')
    // %1$S is a filename
    fileErrIsNotDirectory: '\'%1$S\' is not a directory',

    // Error message given when a file argument does not match the specified
    // regular expression
    // %1$S is a filename
    // %2$S is a regular expression
    fileErrDoesntMatch: '\'%1$S\' does not match \'%2$S\'',

    // When a command has a parameter that has a number of pre-defined options
    // the user interface presents these in a drop-down menu, where the first
    // 'option' is an indicator that a selection should be made. This string
    // describes that first option.
    fieldSelectionSelect: 'Select a %S…',

    // When a command has a parameter that can be repeated multiple times (e.g.
    // like the 'cat a.txt b.txt' command) the user interface presents buttons
    // to add and remove arguments. This string is used to add arguments.
    fieldArrayAdd: 'Add',
    fieldArrayDel: 'Delete',

    // When the menu has displayed all the matches that it should (i.e. about
    // 10 items) then we display this to alert the user that more matches are
    // available.
    fieldMenuMore: 'More matches, keep typing',

    // The command line provides completion for JavaScript commands, however
    // there are times when the scope of what we're completing against can't
    // be used. This error message is displayed when this happens.
    jstypeParseScope: 'Scope lost',

    // These error messages are displayed when the command line is doing
    // JavaScript completion and encounters errors.
    jstypeParseMissing: 'Can\'t find property \'%S\'',
    jstypeBeginSyntax: 'Syntax error',
    jstypeBeginUnterm: 'Unterminated string literal',

    // This message is displayed if the system for providing JavaScript
    // completions encounters and error it displays this.
    jstypeParseError: 'Error',

    // These error messages are displayed when the command line is passed a
    // variable which has the wrong format and can't be converted.
    // Parameters: %S is the passed variable.
    typesNumberNan: 'Can\'t convert "%S" to a number.',
    typesNumberNotInt2: 'Can\'t convert "%S" to an integer.',
    typesDateNan: 'Can\'t convert "%S" to a date.',

    // These error messages are displayed when the command line is passed a
    // variable which has a value out of range (number or date).
    // Parameters: %1$S is the passed variable, %2$S is the limit value.
    typesNumberMax: '%1$S is greater than maximum allowed: %2$S.',
    typesNumberMin: '%1$S is smaller than minimum allowed: %2$S.',
    typesDateMax: '%1$S is later than maximum allowed: %2$S.',
    typesDateMin: '%1$S is earlier than minimum allowed: %2$S.',

    // This error message is displayed when the command line is passed an
    // option with a limited number of correct values, but the passed value is
    // not one of them.
    typesSelectionNomatch: 'Can\'t use \'%S\'.',

    // This error message is displayed when the command line is expecting a CSS
    // query string, however the passed string is not valid.
    nodeParseSyntax: 'Syntax error in CSS query',

    // These error messages are displayed when the command line is expecting a
    // CSS string that matches a single node, but more nodes (or none) match.
    nodeParseMultiple: 'Too many matches (%S)',
    nodeParseNone: 'No matches',

    // These strings describe the "help" command, used to display a description
    // of a command (e.g. "help pref"), and its parameter 'search'.
    helpDesc: 'Get help on the available commands',
    helpManual: 'Provide help either on a specific command (if a search string is provided and an exact match is found) or on the available commands (if a search string is not provided, or if no exact match is found).',
    helpSearchDesc: 'Search string',
    helpSearchManual3: 'search string to use in narrowing down the displayed commands. Regular expressions not supported.',

    // These strings are displayed in the help page for a command in the
    // console.
    helpManSynopsis: 'Synopsis',

    // This message is displayed in the help page if the command has no
    // parameters.
    helpManNone: 'None',

    // This message is displayed in response to the 'help' command when used
    // without a filter, just above the list of known commands.
    helpListAll: 'Available Commands:',

    // These messages are displayed in response to the 'help <search>' command
    // (i.e. with a search string), just above the list of matching commands.
    // Parameters: %S is the search string.
    helpListPrefix: 'Commands starting with \'%S\':',
    helpListNone: 'No commands starting with \'%S\'',

    // When the 'help x' command wants to show the manual for the 'x' command,
    // it needs to be able to describe the parameters as either required or
    // optional, or if they have a default value.
    helpManRequired: 'required',
    helpManOptional: 'optional',
    helpManDefault: 'optional, default=%S',

    // Text shown as part of the output of the 'help' command when the command
    // in question has sub-commands, before a list of the matching sub-commands.
    subCommands: 'Sub-Commands',

    // Text shown as part of the output of the 'help' command when the command
    // in question should have sub-commands but in fact has none.
    subCommandsNone: 'None',

    // These strings are used to describe the 'context' command and its
    // 'prefix' parameter. See localization comment for 'connect' for an
    // explanation about 'prefix'.
    contextDesc: 'Concentrate on a group of commands',
    contextManual: 'Setup a default prefix to future commands. For example \'context git\' would allow you to type \'commit\' rather than \'git commit\'.',
    contextPrefixDesc: 'The command prefix',

    // This message message displayed during the processing of the 'context'
    // command, when the found command is not a parent command.
    contextNotParentError: 'Can\'t use \'%S\' as a prefix because it is not a parent command.',

    // These messages are displayed during the processing of the 'context'
    // command, to indicate success or that there is no command prefix.
    contextReply: 'Using %S as a command prefix',
    contextEmptyReply: 'Command prefix is unset',

    // These strings describe the 'connect' command and all its available
    // parameters. A 'prefix' is an  alias for the remote server (think of it
    // as a "connection name"), and it allows to identify a specific server
    // when connected to multiple remote servers.
    connectDesc: 'Proxy commands to server',
    connectManual: 'Connect to the server, creating local versions of the commands on the server. Remote commands initially have a prefix to distinguish them from local commands (but see the context command to get past this)',
    connectPrefixDesc: 'Parent prefix for imported commands',
    connectPortDesc: 'The TCP port to listen on',
    connectHostDesc: 'The hostname to bind to',
    connectDupReply: 'Connection called %S already exists.',

    // The output of the 'connect' command, telling the user what it has done.
    // Parameters: %S is the prefix command. See localization comment for
    // 'connect' for an explanation about 'prefix'.
    connectReply: 'Added %S commands.',

    // These strings describe the 'disconnect' command and all its available
    // parameters. See localization comment for 'connect' for an explanation
    // about 'prefix'.
    disconnectDesc2: 'Disconnect from server',
    disconnectManual2: 'Disconnect from a server currently connected for remote commands execution',
    disconnectPrefixDesc: 'Parent prefix for imported commands',
    disconnectForceDesc: 'Ignore outstanding requests',

    // This is the output of the 'disconnect' command, explaining the user what
    // has been done. Parameters: %S is the number of commands removed.
    disconnectReply: 'Removed %S commands.',

    // This error message is displayed when the user attempts to disconnect
    // before all requests have completed. Parameters: %S is a list of
    // incomplete requests.
    disconnectOutstanding: 'Outstanding requests (%S)',

    // These strings describe the 'cd' command and it's parameters.
    cdDesc: 'Change working directory',
    cdManual: 'Change the current working directory as used by the exec command',
    cdDirectoryDesc: 'The new working directory',
    cdOutput: 'Working directory is now %S',

    // These strings describe the 'exec' command and it's parameters.
    execDesc: 'Execute a system command',
    execManual: '',
    execCommandDesc: 'The command to execute',

    // These strings describe the 'pref' command and all its available
    // sub-commands and parameters.
    prefDesc: 'Commands to control settings',
    prefManual: 'Commands to display and alter preferences both for GCLI and the surrounding environment',
    prefListDesc: 'Display available settings',
    prefListManual: 'Display a list of preferences, optionally filtered when using the \'search\' parameter',
    prefListSearchDesc: 'Filter the list of settings displayed',
    prefListSearchManual: 'Search for the given string in the list of available preferences',
    prefShowDesc: 'Display setting value',
    prefShowManual: 'Display the value of a given preference',
    prefShowSettingDesc: 'Setting to display',
    prefShowSettingManual: 'The name of the setting to display',

    // This message is used to show the preference name and the associated
    // preference value. Parameters: %1$S is the preference name, %2$S is the
    // preference value.
    prefShowSettingValue: '%1$S: %2$S',

    // These strings describe the 'pref set' command and all its parameters.
    prefSetDesc: 'Alter a setting',
    prefSetManual: 'Alter preferences defined by the environment',
    prefSetSettingDesc: 'Setting to alter',
    prefSetSettingManual: 'The name of the setting to alter.',
    prefSetValueDesc: 'New value for setting',
    prefSetValueManual: 'The new value for the specified setting',

    // These strings are displayed to the user the first time they try to alter
    // a setting.
    prefSetCheckHeading: 'This might void your warranty!',
    prefSetCheckBody: 'Changing these advanced settings can be harmful to the stability, security, and performance of this application. You should only continue if you are sure of what you are doing.',
    prefSetCheckGo: 'I\'ll be careful, I promise!',

    // These strings describe the 'pref reset' command and all its parameters.
    prefResetDesc: 'Reset a setting',
    prefResetManual: 'Reset the value of a setting to the system defaults',
    prefResetSettingDesc: 'Setting to reset',
    prefResetSettingManual: 'The name of the setting to reset to the system default value',

    // This string is displayed in the output from the 'pref list' command as a
    // label to an input element that allows the user to filter the results.
    prefOutputFilter: 'Filter',

    // These strings are displayed in the output from the 'pref list' command
    // as table headings.
    prefOutputName: 'Name',
    prefOutputValue: 'Value',

    // These strings describe the 'intro' command. The localization of
    // 'Got it!' should be the same used in introTextGo.
    introDesc: 'Show the opening message',
    introManual: 'Redisplay the message that is shown to new users until they click the \'Got it!\' button',

    // These strings are displayed when the user first opens the developer
    // toolbar to explain the command line, and is shown each time it is
    // opened until the user clicks the 'Got it!' button.
    introTextOpening2: 'GCLI is an experiment to create a highly usable command line for web developers.',
    introTextCommands: 'For a list of commands type',
    introTextKeys2: ', or to show/hide command hints press',
    introTextF1Escape: 'F1/Escape',
    introTextGo: 'Got it!',

    // This is a short description of the 'hideIntro' setting.
    hideIntroDesc: 'Show the initial welcome message',

    // This is a description of the 'eagerHelper' setting. It's displayed when
    // the user asks for help on the settings. eagerHelper allows users to
    // select between showing no tooltips, permanent tooltips, and only
    // important tooltips.
    eagerHelperDesc: 'How eager are the tooltips',

    // This is a short description of the 'allowSetDesc' setting.
    allowSetDesc: 'Has the user enabled the \'pref set\' command?'
  }
};
exports.root = i18n.root;
});
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

define('gcli/converters', ['require', 'exports', 'module' , 'util/promise', 'util/util'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');

// It's probably easiest to read this bottom to top

/**
 * Best guess at creating a DOM element from random data
 */
var fallbackDomConverter = {
  from: '*',
  to: 'dom',
  exec: function(data, conversionContext) {
    return conversionContext.document.createTextNode(data || '');
  }
};

/**
 * Best guess at creating a string from random data
 */
var fallbackStringConverter = {
  from: '*',
  to: 'string',
  exec: function(data, conversionContext) {
    return data == null ? '' : data.toString();
  }
};

/**
 * Convert a view object to a DOM element
 */
var viewDomConverter = {
  item: 'converter',
  from: 'view',
  to: 'dom',
  exec: function(view, conversionContext) {
    if (!view.isView) {
      view = conversionContext.createView(view);
    }
    return view.toDom(conversionContext.document);
  }
};

/**
 * Convert a view object to a string
 */
var viewStringConverter = {
  item: 'converter',
  from: 'view',
  to: 'string',
  exec: function(view, conversionContext) {
    if (!view.isView) {
      view = conversionContext.createView(view);
    }
    return view.toDom(conversionContext.document).textContent;
  }
};

/**
 * Convert a view object to a string
 */
var stringViewStringConverter = {
  item: 'converter',
  from: 'stringView',
  to: 'string',
  exec: function(view, conversionContext) {
    if (!view.isView) {
      view = conversionContext.createView(view);
    }
    return view.toDom(conversionContext.document).textContent;
  }
};

/**
 * Convert an exception to a DOM element
 */
var errorDomConverter = {
  item: 'converter',
  from: 'error',
  to: 'dom',
  exec: function(ex, conversionContext) {
    var node = util.createElement(conversionContext.document, 'p');
    node.className = 'gcli-error';
    node.textContent = ex;
    return node;
  }
};

/**
 * Convert an exception to a string
 */
var errorStringConverter = {
  item: 'converter',
  from: 'error',
  to: 'string',
  exec: function(ex, conversionContext) {
    return '' + ex;
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
    // conversion but for now the only 2 step conversions which we are going to
    // special case are foo->view->dom and foo->stringView->string.
    if (to === 'dom') {
      converter = fromMatch.view;
      if (converter != null) {
        return getChainConverter(converter, viewDomConverter);
      }
    }

    if (to === 'string') {
      converter = fromMatch.stringView;
      if (converter != null) {
        return getChainConverter(converter, stringViewStringConverter);
      }
      converter = fromMatch.view;
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
 * @param conversionContext An execution context (i.e. simplified requisition)
 * which is often required for access to a document, or createView function
 */
exports.convert = function(data, from, to, conversionContext) {
  try {
    if (from === to) {
      return promise.resolve(data);
    }
    return promise.resolve(getConverter(from, to).exec(data, conversionContext));
  }
  catch (ex) {
    return promise.resolve(getConverter('error', to).exec(ex, conversionContext));
  }
};

/**
 * Items for export
 */
exports.items = [
  viewDomConverter, viewStringConverter, stringViewStringConverter,
  errorDomConverter, errorStringConverter
];


});
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

define('gcli/cli', ['require', 'exports', 'module' , 'util/promise', 'util/util', 'util/l10n', 'gcli/ui/view', 'gcli/converters', 'gcli/canon', 'gcli/types', 'gcli/argument'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');
var l10n = require('util/l10n');

var view = require('gcli/ui/view');
var converters = require('gcli/converters');
var canon = require('gcli/canon');
var CommandOutputManager = require('gcli/canon').CommandOutputManager;

var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;

var Argument = require('gcli/argument').Argument;
var ArrayArgument = require('gcli/argument').ArrayArgument;
var NamedArgument = require('gcli/argument').NamedArgument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var MergedArgument = require('gcli/argument').MergedArgument;
var ScriptArgument = require('gcli/argument').ScriptArgument;

/**
 * Some manual intervention is needed in parsing the { command.
 */
function getEvalCommand() {
  if (getEvalCommand._cmd == null) {
    getEvalCommand._cmd = canon.getCommand(evalCmd.name);
  }
  return getEvalCommand._cmd;
}

/**
 * Assignment is a link between a parameter and the data for that parameter.
 * The data for the parameter is available as in the preferred type and as
 * an Argument for the CLI.
 * <p>We also record validity information where applicable.
 * <p>For values, null and undefined have distinct definitions. null means
 * that a value has been provided, undefined means that it has not.
 * Thus, null is a valid default value, and common because it identifies an
 * parameter that is optional. undefined means there is no value from
 * the command line.
 * @constructor
 */
function Assignment(param) {
  // The parameter that we are assigning to
  this.param = param;
  this.conversion = undefined;
}

/**
 * Easy accessor for conversion.arg.
 * This is a read-only property because writes to arg should be done through
 * the 'conversion' property.
 */
Object.defineProperty(Assignment.prototype, 'arg', {
  get: function() {
    return this.conversion == null ? undefined : this.conversion.arg;
  },
  enumerable: true
});

/**
 * Easy accessor for conversion.value.
 * This is a read-only property because writes to value should be done through
 * the 'conversion' property.
 */
Object.defineProperty(Assignment.prototype, 'value', {
  get: function() {
    return this.conversion == null ? undefined : this.conversion.value;
  },
  enumerable: true
});

/**
 * Easy (and safe) accessor for conversion.message
 */
Object.defineProperty(Assignment.prototype, 'message', {
  get: function() {
    return this.conversion == null || !this.conversion.message ?
        '' : this.conversion.message;
  },
  enumerable: true
});

/**
 * Easy (and safe) accessor for conversion.getPredictions()
 * @return An array of objects with name and value elements. For example:
 * [ { name:'bestmatch', value:foo1 }, { name:'next', value:foo2 }, ... ]
 */
Assignment.prototype.getPredictions = function() {
  return this.conversion == null ? [] : this.conversion.getPredictions();
};

/**
 * Accessor for a prediction by index.
 * This is useful above <tt>getPredictions()[index]</tt> because it normalizes
 * index to be within the bounds of the predictions, which means that the UI
 * can maintain an index of which prediction to choose without caring how many
 * predictions there are.
 * @param rank The index of the prediction to choose
 */
Assignment.prototype.getPredictionRanked = function(rank) {
  if (rank == null) {
    rank = 0;
  }

  if (this.isInName()) {
    return promise.resolve(undefined);
  }

  return this.getPredictions().then(function(predictions) {
    if (predictions.length === 0) {
      return undefined;
    }

    rank = rank % predictions.length;
    if (rank < 0) {
      rank = predictions.length + rank;
    }
    return predictions[rank];
  }.bind(this));
};

/**
 * Some places want to take special action if we are in the name part of a
 * named argument (i.e. the '--foo' bit).
 * Currently this does not take actual cursor position into account, it just
 * assumes that the cursor is at the end. In the future we will probably want
 * to take this into account.
 */
Assignment.prototype.isInName = function() {
  return this.conversion.arg.type === 'NamedArgument' &&
         this.conversion.arg.prefix.slice(-1) !== ' ';
};

/**
 * Work out what the status of the current conversion is which involves looking
 * not only at the conversion, but also checking if data has been provided
 * where it should.
 * @param arg For assignments with multiple args (e.g. array assignments) we
 * can narrow the search for status to a single argument.
 */
Assignment.prototype.getStatus = function(arg) {
  if (this.param.isDataRequired && !this.conversion.isDataProvided()) {
    return Status.INCOMPLETE;
  }

  // Selection/Boolean types with a defined range of values will say that
  // '' is INCOMPLETE, but the parameter may be optional, so we don't ask
  // if the user doesn't need to enter something and hasn't done so.
  if (!this.param.isDataRequired && this.arg.type === 'BlankArgument') {
    return Status.VALID;
  }

  return this.conversion.getStatus(arg);
};

/**
 * Helper when we're rebuilding command lines.
 */
Assignment.prototype.toString = function() {
  return this.conversion.toString();
};

/**
 * For test/debug use only. The output from this function is subject to wanton
 * random change without notice, and should not be relied upon to even exist
 * at some later date.
 */
Object.defineProperty(Assignment.prototype, '_summaryJson', {
  get: function() {
    var predictionCount = '<async>';
    this.getPredictions().then(function(predictions) {
      predictionCount = predictions.length;
    }, console.log);
    return {
      param: this.param.name + '/' + this.param.type.name,
      defaultValue: this.param.defaultValue,
      arg: this.conversion.arg._summaryJson,
      value: this.value,
      message: this.message,
      status: this.getStatus().toString(),
      predictionCount: predictionCount
    };
  },
  enumerable: true
});

exports.Assignment = Assignment;


/**
 * How to dynamically execute JavaScript code
 */
var customEval = eval;

/**
 * Setup a function to be called in place of 'eval', generally for security
 * reasons
 */
exports.setEvalFunction = function(newCustomEval) {
  customEval = newCustomEval;
};

/**
 * Remove the binding done by setEvalFunction().
 * We purposely set customEval to undefined rather than to 'eval' because there
 * is an implication of setEvalFunction that we're in a security sensitive
 * situation. What if we can trick GCLI into calling unsetEvalFunction() at the
 * wrong time?
 * So to properly undo the effects of setEvalFunction(), you need to call
 * setEvalFunction(eval) rather than unsetEvalFunction(), however the latter is
 * preferred in most cases.
 */
exports.unsetEvalFunction = function() {
  customEval = undefined;
};

/**
 * 'eval' command
 */
var evalCmd = {
  item: 'command',
  name: '{',
  params: [
    {
      name: 'javascript',
      type: 'javascript',
      description: ''
    }
  ],
  hidden: true,
  returnType: 'object',
  description: { key: 'cliEvalJavascript' },
  exec: function(args, context) {
    return customEval(args.javascript);
  },
  isCommandRegexp: /^\s*{\s*/
};

exports.items = [ evalCmd ];

/**
 * This is a special assignment to reflect the command itself.
 */
function CommandAssignment() {
  var commandParamMetadata = {
    name: '__command',
    type: { name: 'command', allowNonExec: false }
  };
  // This is a hack so that rather than reply with a generic description of the
  // command assignment, we reply with the description of the assigned command,
  // (using a generic term if there is no assigned command)
  var self = this;
  Object.defineProperty(commandParamMetadata, 'description', {
    get: function() {
      var value = self.value;
      return value && value.description ?
          value.description :
          'The command to execute';
    },
    enumerable: true
  });
  this.param = new canon.Parameter(commandParamMetadata);
}

CommandAssignment.prototype = Object.create(Assignment.prototype);

CommandAssignment.prototype.getStatus = function(arg) {
  return Status.combine(
    Assignment.prototype.getStatus.call(this, arg),
    this.conversion.value && this.conversion.value.exec ?
            Status.VALID : Status.INCOMPLETE
  );
};

exports.CommandAssignment = CommandAssignment;


/**
 * Special assignment used when ignoring parameters that don't have a home
 */
function UnassignedAssignment(requisition, arg) {
  this.param = new canon.Parameter({
    name: '__unassigned',
    description: l10n.lookup('cliOptions'),
    type: {
      name: 'param',
      requisition: requisition,
      isIncompleteName: (arg.text.charAt(0) === '-')
    }
  });

  // synchronize is ok because we can be sure that param type is synchronous
  var parsed = this.param.type.parse(arg, requisition.executionContext);
  this.conversion = util.synchronize(parsed);
  this.conversion.assignment = this;
}

UnassignedAssignment.prototype = Object.create(Assignment.prototype);

UnassignedAssignment.prototype.getStatus = function(arg) {
  return this.conversion.getStatus();
};

exports.logErrors = true;

/**
 * A Requisition collects the information needed to execute a command.
 *
 * (For a definition of the term, see http://en.wikipedia.org/wiki/Requisition)
 * This term is used because carries the notion of a work-flow, or process to
 * getting the information to execute a command correct.
 * There is little point in a requisition for parameter-less commands because
 * there is no information to collect. A Requisition is a collection of
 * assignments of values to parameters, each handled by an instance of
 * Assignment.
 *
 * <h2>Events<h2>
 * <p>Requisition publishes the following events:
 * <ul>
 * <li>onTextChange: The text to be mirrored in a command line has changed.
 * </ul>
 *
 * @param environment An optional opaque object passed to commands in the
 * Execution Context.
 * @param doc A DOM Document passed to commands using the Execution Context in
 * order to allow creation of DOM nodes. If missing Requisition will use the
 * global 'document'.
 * @param commandOutputManager A custom commandOutputManager to which output
 * should be sent (optional)
 * @constructor
 */
function Requisition(environment, doc, commandOutputManager) {
  this.environment = environment;
  this.document = doc;
  if (this.document == null) {
    try {
      this.document = document;
    }
    catch (ex) {
      // Ignore
    }
  }

  this.commandOutputManager = commandOutputManager || new CommandOutputManager();
  this.shell = {
    cwd: '/', // Where we store the current working directory
    env: {}   // Where we store the current environment
  };

  this.onTextChange = util.createEvent('Requisition.onTextChange');

  // The command that we are about to execute.
  // @see setCommandConversion()
  this.commandAssignment = new CommandAssignment();
  var assignPromise = this.setAssignment(this.commandAssignment, null,
                                   { internal: true });
  util.synchronize(assignPromise);

  // The object that stores of Assignment objects that we are filling out.
  // The Assignment objects are stored under their param.name for named
  // lookup. Note: We make use of the property of Javascript objects that
  // they are not just hashmaps, but linked-list hashmaps which iterate in
  // insertion order.
  // _assignments excludes the commandAssignment.
  this._assignments = {};

  // The count of assignments. Excludes the commandAssignment
  this.assignmentCount = 0;

  // Used to store cli arguments in the order entered on the cli
  this._args = [];

  // Used to store cli arguments that were not assigned to parameters
  this._unassigned = [];

  // Changes can be asynchronous, when one update starts before another
  // finishes we abandon the former change
  this._nextUpdateId = 0;

  // We can set a prefix to typed commands to make it easier to focus on
  // Allowing us to type "add -a; commit" in place of "git add -a; git commit"
  this.prefix = '';
}

/**
 * Avoid memory leaks
 */
Requisition.prototype.destroy = function() {
  this.document = undefined;
  this.environment = undefined;
};

/**
 * If we're about to make an asynchronous change when other async changes could
 * overtake this one, then we want to be able to bail out if overtaken. The
 * value passed back from beginChange should be passed to endChangeCheckOrder
 * on completion of calculation, before the results are applied in order to
 * check that the calculation has not been overtaken
 */
Requisition.prototype._beginChange = function() {
  this.onTextChange.holdFire();

  var updateId = this._nextUpdateId;
  this._nextUpdateId++;
  return updateId;
};

/**
 * Check to see if another change has started since updateId started.
 * This allows us to bail out of an update.
 * It's hard to make updates atomic because until you've responded to a parse
 * of the command argument, you don't know how to parse the arguments to that
 * command.
 */
Requisition.prototype._isChangeCurrent = function(updateId) {
  return updateId + 1 === this._nextUpdateId;
};

/**
 * See notes on beginChange
 */
Requisition.prototype._endChangeCheckOrder = function(updateId) {
  this.onTextChange.resumeFire();

  if (updateId + 1 !== this._nextUpdateId) {
    // An update that started after we did has already finished, so our
    // changes are out of date. Abandon further work.
    return false;
  }

  return true;
};

var legacy = false;

/**
 * Functions and data related to the execution of a command
 */
Object.defineProperty(Requisition.prototype, 'executionContext', {
  get: function() {
    if (this._executionContext == null) {
      this._executionContext = {
        defer: function() {
          return promise.defer();
        },
        typedData: function(type, data) {
          return {
            isTypedData: true,
            data: data,
            type: type
          };
        },
        getArgsObject: this.getArgsObject.bind(this)
      };

      // Alias requisition so we're clear about what's what
      var requisition = this;
      Object.defineProperty(this._executionContext, 'typed', {
        get: function() { return requisition.toString(); },
        enumerable: true
      });
      Object.defineProperty(this._executionContext, 'environment', {
        get: function() { return requisition.environment; },
        enumerable: true
      });
      Object.defineProperty(this._executionContext, 'shell', {
        get: function() { return requisition.shell; },
        enumerable : true
      });

      /**
       * This is a temporary property that will change and/or be removed.
       * Do not use it
       */
      Object.defineProperty(this._executionContext, '__dlhjshfw', {
        get: function() { return requisition; },
        enumerable: false
      });

      if (legacy) {
        this._executionContext.createView = view.createView;
        this._executionContext.exec = this.exec.bind(this);
        this._executionContext.update = this.update.bind(this);
        this._executionContext.updateExec = this.updateExec.bind(this);

        Object.defineProperty(this._executionContext, 'document', {
          get: function() { return requisition.document; },
          enumerable: true
        });
      }
    }

    return this._executionContext;
  },
  enumerable: true
});

/**
 * Functions and data related to the conversion of the output of a command
 */
Object.defineProperty(Requisition.prototype, 'conversionContext', {
  get: function() {
    if (this._conversionContext == null) {
      this._conversionContext = {
        defer: function() {
          return promise.defer();
        },

        createView: view.createView,
        exec: this.exec.bind(this),
        update: this.update.bind(this),
        updateExec: this.updateExec.bind(this)
      };

      // Alias requisition so we're clear about what's what
      var requisition = this;

      Object.defineProperty(this._conversionContext, 'document', {
        get: function() { return requisition.document; },
        enumerable: true
      });
      Object.defineProperty(this._conversionContext, 'environment', {
        get: function() { return requisition.environment; },
        enumerable: true
      });

      /**
       * This is a temporary property that will change and/or be removed.
       * Do not use it
       */
      Object.defineProperty(this._conversionContext, '__dlhjshfw', {
        get: function() { return requisition; },
        enumerable: false
      });
    }

    return this._conversionContext;
  },
  enumerable: true
});

/**
 * Assignments have an order, so we need to store them in an array.
 * But we also need named access ...
 * @return The found assignment, or undefined, if no match was found
 */
Requisition.prototype.getAssignment = function(nameOrNumber) {
  var name = (typeof nameOrNumber === 'string') ?
    nameOrNumber :
    Object.keys(this._assignments)[nameOrNumber];
  return this._assignments[name] || undefined;
};

/**
 * Where parameter name == assignment names - they are the same
 */
Requisition.prototype.getParameterNames = function() {
  return Object.keys(this._assignments);
};

/**
 * The overall status is the most severe status.
 * There is no such thing as an INCOMPLETE overall status because the
 * definition of INCOMPLETE takes into account the cursor position to say 'this
 * isn't quite ERROR because the user can fix it by typing', however overall,
 * this is still an error status.
 */
Object.defineProperty(Requisition.prototype, 'status', {
  get : function() {
    var status = Status.VALID;
    if (this._unassigned.length !== 0) {
      var isAllIncomplete = true;
      this._unassigned.forEach(function(assignment) {
        if (!assignment.param.type.isIncompleteName) {
          isAllIncomplete = false;
        }
      });
      status = isAllIncomplete ? Status.INCOMPLETE : Status.ERROR;
    }

    this.getAssignments(true).forEach(function(assignment) {
      var assignStatus = assignment.getStatus();
      if (assignStatus > status) {
        status = assignStatus;
      }
    }, this);
    if (status === Status.INCOMPLETE) {
      status = Status.ERROR;
    }
    return status;
  },
  enumerable : true
});

/**
 * If ``requisition.status != VALID`` message then return a string which
 * best describes what is wrong. Generally error messages are delivered by
 * looking at the error associated with the argument at the cursor, but there
 * are times when you just want to say 'tell me the worst'.
 * If ``requisition.status != VALID`` then return ``null``.
 */
Requisition.prototype.getStatusMessage = function() {
  if (this.commandAssignment.getStatus() !== Status.VALID) {
    return l10n.lookup('cliUnknownCommand');
  }

  var assignments = this.getAssignments();
  for (var i = 0; i < assignments.length; i++) {
    if (assignments[i].getStatus() !== Status.VALID) {
      return assignments[i].message;
    }
  }

  if (this._unassigned.length !== 0) {
    return l10n.lookup('cliUnusedArg');
  }

  return null;
};

/**
 * Extract the names and values of all the assignments, and return as
 * an object.
 */
Requisition.prototype.getArgsObject = function() {
  var args = {};
  this.getAssignments().forEach(function(assignment) {
    args[assignment.param.name] = assignment.conversion.isDataProvided() ?
            assignment.value :
            assignment.param.defaultValue;
  }, this);
  return args;
};

/**
 * Access the arguments as an array.
 * @param includeCommand By default only the parameter arguments are
 * returned unless (includeCommand === true), in which case the list is
 * prepended with commandAssignment.arg
 */
Requisition.prototype.getAssignments = function(includeCommand) {
  var assignments = [];
  if (includeCommand === true) {
    assignments.push(this.commandAssignment);
  }
  Object.keys(this._assignments).forEach(function(name) {
    assignments.push(this.getAssignment(name));
  }, this);
  return assignments;
};

/**
 * There are a few places where we need to know what the 'next thing' is. What
 * is the user going to be filling out next (assuming they don't enter a named
 * argument). The next argument is the first in line that is both blank, and
 * that can be filled in positionally.
 * @return The next assignment to be used, or null if all the positional
 * parameters have values.
 */
Requisition.prototype._getFirstBlankPositionalAssignment = function() {
  var reply = null;
  Object.keys(this._assignments).some(function(name) {
    var assignment = this.getAssignment(name);
    if (assignment.arg.type === 'BlankArgument' &&
            assignment.param.isPositionalAllowed) {
      reply = assignment;
      return true; // i.e. break
    }
    return false;
  }, this);
  return reply;
};

/**
 * Look through the arguments attached to our assignments for the assignment
 * at the given position.
 * @param {number} cursor The cursor position to query
 */
Requisition.prototype.getAssignmentAt = function(cursor) {
  if (!this._args) {
    console.trace();
    throw new Error('Missing args');
  }

  // We short circuit this one because we may have no args, or no args with
  // any size and the alg below only finds arguments with size.
  if (cursor === 0) {
    return this.commandAssignment;
  }

  var assignForPos = [];
  var i, j;
  for (i = 0; i < this._args.length; i++) {
    var arg = this._args[i];
    var assignment = arg.assignment;

    // prefix and text are clearly part of the argument
    for (j = 0; j < arg.prefix.length; j++) {
      assignForPos.push(assignment);
    }
    for (j = 0; j < arg.text.length; j++) {
      assignForPos.push(assignment);
    }

    // suffix is part of the argument only if this is a named parameter,
    // otherwise it looks forwards
    if (arg.assignment.arg.type === 'NamedArgument') {
      // leave the argument as it is
    }
    else if (this._args.length > i + 1) {
      // first to the next argument
      assignment = this._args[i + 1].assignment;
    }
    else {
      // then to the first blank positional parameter, leaving 'as is' if none
      var nextAssignment = this._getFirstBlankPositionalAssignment();
      if (nextAssignment != null) {
        assignment = nextAssignment;
      }
    }

    for (j = 0; j < arg.suffix.length; j++) {
      assignForPos.push(assignment);
    }
  }

  // Possible shortcut, we don't really need to go through all the args
  // to work out the solution to this

  var reply = assignForPos[cursor - 1];

  if (!reply) {
    throw new Error('Missing assignment.' +
        ' cursor=' + cursor + ' text=' + this.toString());
  }

  return reply;
};

/**
 * Extract a canonical version of the input
 */
Requisition.prototype.toCanonicalString = function() {
  var line = [];

  var cmd = this.commandAssignment.value ?
      this.commandAssignment.value.name :
      this.commandAssignment.arg.text;
  line.push(cmd);

  Object.keys(this._assignments).forEach(function(name) {
    var assignment = this._assignments[name];
    var type = assignment.param.type;
    // Bug 664377: This will cause problems if there is a non-default value
    // after a default value. Also we need to decide when to use
    // named parameters in place of positional params. Both can wait.
    if (assignment.value !== assignment.param.defaultValue) {
      line.push(' ');
      line.push(type.stringify(assignment.value, this.executionContext));
    }
  }, this);

  // Canonically, if we've opened with a { then we should have a } to close
  if (cmd === '{') {
    if (this.getAssignment(0).arg.suffix.indexOf('}') === -1) {
      line.push(' }');
    }
  }

  return line.join('');
};

/**
 * Reconstitute the input from the args
 */
Requisition.prototype.toString = function() {
  if (this._args) {
    return this._args.map(function(arg) {
      return arg.toString();
    }).join('');
  }

  return this.toCanonicalString();
};

/**
 * For test/debug use only. The output from this function is subject to wanton
 * random change without notice, and should not be relied upon to even exist
 * at some later date.
 */
Object.defineProperty(Requisition.prototype, '_summaryJson', {
  get: function() {
    var summary = {
      $args: this._args.map(function(arg) {
        return arg._summaryJson;
      }),
      _command: this.commandAssignment._summaryJson,
      _unassigned: this._unassigned.forEach(function(assignment) {
        return assignment._summaryJson;
      })
    };

    Object.keys(this._assignments).forEach(function(name) {
      summary[name] = this.getAssignment(name)._summaryJson;
    }.bind(this));

    return summary;
  },
  enumerable: true
});

/**
 * When any assignment changes, we might need to update the _args array to
 * match and inform people of changes to the typed input text.
 */
Requisition.prototype._setAssignmentInternal = function(assignment, conversion) {
  var oldConversion = assignment.conversion;

  assignment.conversion = conversion;
  assignment.conversion.assignment = assignment;

  // Do nothing if the conversion is unchanged
  if (assignment.conversion.equals(oldConversion)) {
    if (assignment === this.commandAssignment) {
      this.setBlankArguments();
    }
    return;
  }

  // When the command changes, we need to keep a bunch of stuff in sync
  if (assignment === this.commandAssignment) {
    this._assignments = {};

    var command = this.commandAssignment.value;
    if (command) {
      for (var i = 0; i < command.params.length; i++) {
        var param = command.params[i];
        var newAssignment = new Assignment(param);
        var assignPromise = this.setAssignment(newAssignment, null, { internal: true });
        util.synchronize(assignPromise);

        this._assignments[param.name] = newAssignment;
      }
    }
    this.assignmentCount = Object.keys(this._assignments).length;
  }

  // For the onTextChange event, we only care about changes to the argument
  if (!assignment.conversion.argEquals(oldConversion)) {
    this.onTextChange();
  }
};

/**
 * Internal function to alter the given assignment using the given arg.
 * @param assignment The assignment to alter
 * @param arg The new value for the assignment. An instance of Argument, or an
 * instance of Conversion, or null to set the blank value.
 * @param options There are a number of ways to customize how the assignment
 * is made, including:
 * - internal: (default:false) External updates are required to do more work,
 *   including adjusting the args in this requisition to stay in sync.
 *   On the other hand non internal changes use beginChange to back out of
 *   changes when overtaken asynchronously.
 *   Setting internal:true effectively means this is being called as part of
 *   the update process.
 * - matchPadding: (default:false) Alter the whitespace on the prefix and
 *   suffix of the new argument to match that of the old argument. This only
 *   makes sense with internal=false
 */
Requisition.prototype.setAssignment = function(assignment, arg, options) {
  options = options || {};
  if (!options.internal) {
    var originalArgs = assignment.arg.getArgs();

    // Update the args array
    var replacementArgs = arg.getArgs();
    var maxLen = Math.max(originalArgs.length, replacementArgs.length);
    for (var i = 0; i < maxLen; i++) {
      // If there are no more original args, or if the original arg was blank
      // (i.e. not typed by the user), we'll just need to add at the end
      if (i >= originalArgs.length || originalArgs[i].type === 'BlankArgument') {
        this._args.push(replacementArgs[i]);
        continue;
      }

      var index = this._args.indexOf(originalArgs[i]);
      if (index === -1) {
        console.error('Couldn\'t find ', originalArgs[i], ' in ', this._args);
        throw new Error('Couldn\'t find ' + originalArgs[i]);
      }

      // If there are no more replacement args, we just remove the original args
      // Otherwise swap original args and replacements
      if (i >= replacementArgs.length) {
        this._args.splice(index, 1);
      }
      else {
        if (options.matchPadding) {
          if (replacementArgs[i].prefix.length === 0 &&
              this._args[index].prefix.length !== 0) {
            replacementArgs[i].prefix = this._args[index].prefix;
          }
          if (replacementArgs[i].suffix.length === 0 &&
              this._args[index].suffix.length !== 0) {
            replacementArgs[i].suffix = this._args[index].suffix;
          }
        }
        this._args[index] = replacementArgs[i];
      }
    }
  }

  var updateId = options.internal ? null : this._beginChange();

  var setAssignmentInternal = function(conversion) {
    if (options.internal || this._endChangeCheckOrder(updateId)) {
      this._setAssignmentInternal(assignment, conversion);
    }

    return promise.resolve(undefined);
  }.bind(this);

  if (arg == null) {
    var blank = assignment.param.type.getBlank(this.executionContext);
    return setAssignmentInternal(blank);
  }

  if (typeof arg.getStatus === 'function') {
    // It's not really an arg, it's a conversion already
    return setAssignmentInternal(arg);
  }

  var parsed = assignment.param.type.parse(arg, this.executionContext);
  return parsed.then(setAssignmentInternal);
};

/**
 * Reset all the assignments to their default values
 */
Requisition.prototype.setBlankArguments = function() {
  this.getAssignments().forEach(function(assignment) {
    var assignPromise = this.setAssignment(assignment, null, { internal: true });
    util.synchronize(assignPromise);
  }, this);
};

/**
 * Input trace gives us an array of Argument tracing objects, one for each
 * character in the typed input, from which we can derive information about how
 * to display this typed input. It's a bit like toString on steroids.
 * <p>
 * The returned object has the following members:<ul>
 * <li>character: The character to which this arg trace refers.
 * <li>arg: The Argument to which this character is assigned.
 * <li>part: One of ['prefix'|'text'|suffix'] - how was this char understood
 * </ul>
 * <p>
 * The Argument objects are as output from tokenize() rather than as applied
 * to Assignments by _assign() (i.e. they are not instances of NamedArgument,
 * ArrayArgument, etc).
 * <p>
 * To get at the arguments applied to the assignments simply call
 * <tt>arg.assignment.arg</tt>. If <tt>arg.assignment.arg !== arg</tt> then
 * the arg applied to the assignment will contain the original arg.
 * See _assign() for details.
 */
Requisition.prototype.createInputArgTrace = function() {
  if (!this._args) {
    throw new Error('createInputMap requires a command line. See source.');
    // If this is a problem then we can fake command line input using
    // something like the code in #toCanonicalString().
  }

  var args = [];
  var i;
  this._args.forEach(function(arg) {
    for (i = 0; i < arg.prefix.length; i++) {
      args.push({ arg: arg, character: arg.prefix[i], part: 'prefix' });
    }
    for (i = 0; i < arg.text.length; i++) {
      args.push({ arg: arg, character: arg.text[i], part: 'text' });
    }
    for (i = 0; i < arg.suffix.length; i++) {
      args.push({ arg: arg, character: arg.suffix[i], part: 'suffix' });
    }
  });

  return args;
};

/**
 * If the last character is whitespace then things that we suggest to add to
 * the end don't need a space prefix.
 * While this is quite a niche function, it has 2 benefits:
 * - it's more correct because we can distinguish between final whitespace that
 *   is part of an unclosed string, and parameter separating whitespace.
 * - also it's faster than toString() the whole thing and checking the end char
 * @return true iff the last character is interpreted as parameter separating
 * whitespace
 */
Requisition.prototype.typedEndsWithSeparator = function() {
  // This is not as easy as doing (this.toString().slice(-1) === ' ')
  // See the doc comments above; We're checking for separators, not spaces
  if (this._args) {
    var lastArg = this._args.slice(-1)[0];
    if (lastArg.suffix.slice(-1) === ' ') {
      return true;
    }
    return lastArg.text === '' && lastArg.suffix === ''
        && lastArg.prefix.slice(-1) === ' ';
  }

  return this.toCanonicalString().slice(-1) === ' ';
};

/**
 * Return an array of Status scores so we can create a marked up
 * version of the command line input.
 * @param cursor We only take a status of INCOMPLETE to be INCOMPLETE when the
 * cursor is actually in the argument. Otherwise it's an error.
 * @return Array of objects each containing <tt>status</tt> property and a
 * <tt>string</tt> property containing the characters to which the status
 * applies. Concatenating the strings in order gives the original input.
 */
Requisition.prototype.getInputStatusMarkup = function(cursor) {
  var argTraces = this.createInputArgTrace();
  // Generally the 'argument at the cursor' is the argument before the cursor
  // unless it is before the first char, in which case we take the first.
  cursor = cursor === 0 ? 0 : cursor - 1;
  var cTrace = argTraces[cursor];

  var markup = [];
  for (var i = 0; i < argTraces.length; i++) {
    var argTrace = argTraces[i];
    var arg = argTrace.arg;
    var status = Status.VALID;
    if (argTrace.part === 'text') {
      status = arg.assignment.getStatus(arg);
      // Promote INCOMPLETE to ERROR  ...
      if (status === Status.INCOMPLETE) {
        // If the cursor is in the prefix or suffix of an argument then we
        // don't consider it in the argument for the purposes of preventing
        // the escalation to ERROR. However if this is a NamedArgument, then we
        // allow the suffix (as space between 2 parts of the argument) to be in.
        // We use arg.assignment.arg not arg because we're looking at the arg
        // that got put into the assignment not as returned by tokenize()
        var isNamed = (cTrace.arg.assignment.arg.type === 'NamedArgument');
        var isInside = cTrace.part === 'text' ||
                        (isNamed && cTrace.part === 'suffix');
        if (arg.assignment !== cTrace.arg.assignment || !isInside) {
          // And if we're not in the command
          if (!(arg.assignment instanceof CommandAssignment)) {
            status = Status.ERROR;
          }
        }
      }
    }

    markup.push({ status: status, string: argTrace.character });
  }

  // De-dupe: merge entries where 2 adjacent have same status
  i = 0;
  while (i < markup.length - 1) {
    if (markup[i].status === markup[i + 1].status) {
      markup[i].string += markup[i + 1].string;
      markup.splice(i + 1, 1);
    }
    else {
      i++;
    }
  }

  return markup;
};

/**
 * Describe the state of the current input in a way that allows display of
 * predictions and completion hints
 * @param start The location of the cursor
 * @param rank The index of the chosen prediction
 * @return A promise of an object containing the following properties:
 * - statusMarkup: An array of Status scores so we can create a marked up
 *   version of the command line input. See getInputStatusMarkup() for details
 * - unclosedJs: Is the entered command a JS command with no closing '}'?
 * - directTabText: A promise of the text that we *add* to the command line
 *   when TAB is pressed, to be displayed directly after the cursor. See also
 *   arrowTabText.
 * - emptyParameters: A promise of the text that describes the arguments that
 *   the user is yet to type.
 * - arrowTabText: A promise of the text that *replaces* the current argument
 *   when TAB is pressed, generally displayed after a "|->" symbol. See also
 *   directTabText.
 */
Requisition.prototype.getStateData = function(start, rank) {
  var typed = this.toString();
  var current = this.getAssignmentAt(start);
  var predictionPromise = (typed.trim().length !== 0) ?
                          current.getPredictionRanked(rank) :
                          promise.resolve(null);

  return predictionPromise.then(function(prediction) {
    // directTabText is for when the current input is a prefix of the completion
    // arrowTabText is for when we need to use an -> to show what will be used
    var directTabText = '';
    var arrowTabText = '';
    var emptyParameters = [];

    if (typed.trim().length !== 0) {
      var cArg = current.arg;

      if (prediction) {
        var tabText = prediction.name;
        var existing = cArg.text;

        // Normally the cursor being just before whitespace means that you are
        // 'in' the previous argument, which means that the prediction is based
        // on that argument, however NamedArguments break this by having 2 parts
        // so we need to prepend the tabText with a space for NamedArguments,
        // but only when there isn't already a space at the end of the prefix
        // (i.e. ' --name' not ' --name ')
        if (current.isInName()) {
          tabText = ' ' + tabText;
        }

        if (existing !== tabText) {
          // Decide to use directTabText or arrowTabText
          // Strip any leading whitespace from the user inputted value because
          // the tabText will never have leading whitespace.
          var inputValue = existing.replace(/^\s*/, '');
          var isStrictCompletion = tabText.indexOf(inputValue) === 0;
          if (isStrictCompletion && start === typed.length) {
            // Display the suffix of the prediction as the completion
            var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;

            directTabText = tabText.slice(existing.length - numLeadingSpaces);
          }
          else {
            // Display the '-> prediction' at the end of the completer element
            // \u21E5 is the JS escape right arrow
            arrowTabText = '\u21E5 ' + tabText;
          }
        }
      }
      else {
        // There's no prediction, but if this is a named argument that needs a
        // value (that is without any) then we need to show that one is needed
        // For example 'git commit --message ', clearly needs some more text
        if (cArg.type === 'NamedArgument' && cArg.valueArg == null) {
          emptyParameters.push('<' + current.param.type.name + '>\u00a0');
        }
      }
    }

    // Add a space between the typed text (+ directTabText) and the hints,
    // making sure we don't add 2 sets of padding
    if (directTabText !== '') {
      directTabText += '\u00a0';
    }
    else if (!this.typedEndsWithSeparator()) {
      emptyParameters.unshift('\u00a0');
    }

    // Calculate the list of parameters to be filled in
    // We generate an array of emptyParameter markers for each positional
    // parameter to the current command.
    // Generally each emptyParameter marker begins with a space to separate it
    // from whatever came before, unless what comes before ends in a space.

    this.getAssignments().forEach(function(assignment) {
      // Named arguments are handled with a group [options] marker
      if (!assignment.param.isPositionalAllowed) {
        return;
      }

      // No hints if we've got content for this parameter
      if (assignment.arg.toString().trim() !== '') {
        return;
      }

      if (directTabText !== '' && current === assignment) {
        return;
      }

      var text = (assignment.param.isDataRequired) ?
          '<' + assignment.param.name + '>\u00a0' :
          '[' + assignment.param.name + ']\u00a0';

      emptyParameters.push(text);
    }.bind(this));

    var command = this.commandAssignment.value;
    var addOptionsMarker = false;

    // We add an '[options]' marker when there are named parameters that are
    // not filled in and not hidden, and we don't have any directTabText
    if (command && command.hasNamedParameters) {
      command.params.forEach(function(param) {
        var arg = this.getAssignment(param.name).arg;
        if (!param.isPositionalAllowed && !param.hidden
                && arg.type === 'BlankArgument') {
          addOptionsMarker = true;
        }
      }, this);
    }

    if (addOptionsMarker) {
      // Add an nbsp if we don't have one at the end of the input or if
      // this isn't the first param we've mentioned
      emptyParameters.push('[options]\u00a0');
    }

    // Is the entered command a JS command with no closing '}'?
    var unclosedJs = command && command.name === '{' &&
                     this.getAssignment(0).arg.suffix.indexOf('}') === -1;

    return {
      statusMarkup: this.getInputStatusMarkup(start),
      unclosedJs: unclosedJs,
      directTabText: directTabText,
      arrowTabText: arrowTabText,
      emptyParameters: emptyParameters
    };
  }.bind(this));
};

/**
 * Pressing TAB sometimes requires that we add a space to denote that we're on
 * to the 'next thing'.
 * @param assignment The assignment to which to append the space
 */
Requisition.prototype._addSpace = function(assignment) {
  var arg = assignment.arg.beget({ suffixSpace: true });
  if (arg !== assignment.arg) {
    return this.setAssignment(assignment, arg);
  }
  else {
    return promise.resolve(undefined);
  }
};

/**
 * Complete the argument at <tt>cursor</tt>.
 * Basically the same as:
 *   assignment = getAssignmentAt(cursor);
 *   assignment.value = assignment.conversion.predictions[0];
 * Except it's done safely, and with particular care to where we place the
 * space, which is complex, and annoying if we get it wrong.
 *
 * WARNING: complete() can happen asynchronously.
 *
 * @param cursor The cursor configuration. Should have start and end properties
 * which should be set to start and end of the selection.
 * @param rank The index of the prediction that we should choose.
 * This number is not bounded by the size of the prediction array, we take the
 * modulus to get it within bounds
 * @return A promise which completes (with undefined) when any outstanding
 * completion tasks are done.
 */
Requisition.prototype.complete = function(cursor, rank) {
  var assignment = this.getAssignmentAt(cursor.start);

  var predictionPromise = assignment.getPredictionRanked(rank);
  return predictionPromise.then(function(prediction) {
    var outstanding = [];
    this.onTextChange.holdFire();

    // Note: Since complete is asynchronous we should perhaps have a system to
    // bail out of making changes if the command line has changed since TAB
    // was pressed. It's not yet clear if this will be a problem.

    if (prediction == null) {
      // No predictions generally means we shouldn't change anything on TAB,
      // but TAB has the connotation of 'next thing' and when we're at the end
      // of a thing that implies that we should add a space. i.e.
      // 'help<TAB>' -> 'help '
      // But we should only do this if the thing that we're 'completing' is
      // valid and doesn't already end in a space.
      if (assignment.arg.suffix.slice(-1) !== ' ' &&
              assignment.getStatus() === Status.VALID) {
        outstanding.push(this._addSpace(assignment));
      }

      // Also add a space if we are in the name part of an assignment, however
      // this time we don't want the 'push the space to the next assignment'
      // logic, so we don't use addSpace
      if (assignment.isInName()) {
        var newArg = assignment.arg.beget({ prefixPostSpace: true });
        outstanding.push(this.setAssignment(assignment, newArg));
      }
    }
    else {
      // Mutate this argument to hold the completion
      var arg = assignment.arg.beget({
        text: prediction.name,
        dontQuote: (assignment === this.commandAssignment)
      });
      var assignPromise = this.setAssignment(assignment, arg);

      if (!prediction.incomplete) {
        assignPromise = assignPromise.then(function() {
          // The prediction is complete, add a space to let the user move-on
          return this._addSpace(assignment).then(function() {
            // Bug 779443 - Remove or explain the re-parse
            if (assignment instanceof UnassignedAssignment) {
              return this.update(this.toString());
            }
          }.bind(this));
        }.bind(this));
      }

      outstanding.push(assignPromise);
    }

    return promise.all(outstanding).then(function() {
      this.onTextChange();
      this.onTextChange.resumeFire();
      return true;
    }.bind(this));
  }.bind(this));
};

/**
 * Replace the current value with the lower value if such a concept exists.
 */
Requisition.prototype.decrement = function(assignment) {
  var replacement = assignment.param.type.decrement(assignment.value,
                                                    this.executionContext);
  if (replacement != null) {
    var str = assignment.param.type.stringify(replacement,
                                              this.executionContext);
    var arg = assignment.arg.beget({ text: str });
    var assignPromise = this.setAssignment(assignment, arg);
    util.synchronize(assignPromise);
  }
};

/**
 * Replace the current value with the higher value if such a concept exists.
 */
Requisition.prototype.increment = function(assignment) {
  var replacement = assignment.param.type.increment(assignment.value,
                                                    this.executionContext);
  if (replacement != null) {
    var str = assignment.param.type.stringify(replacement,
                                              this.executionContext);
    var arg = assignment.arg.beget({ text: str });
    var assignPromise = this.setAssignment(assignment, arg);
    util.synchronize(assignPromise);
  }
};

/**
 * Helper to find the 'data-command' attribute, used by |update()|
 */
function getDataCommandAttribute(element) {
  var command = element.getAttribute('data-command');
  if (!command) {
    command = element.querySelector('*[data-command]')
                     .getAttribute('data-command');
  }
  return command;
}

/**
 * Called by the UI when ever the user interacts with a command line input
 * @param typed The contents of the input field
 */
Requisition.prototype.update = function(typed) {
  if (typeof HTMLElement !== 'undefined' && typed instanceof HTMLElement) {
    typed = getDataCommandAttribute(typed);
  }
  if (typeof Event !== 'undefined' && typed instanceof Event) {
    typed = getDataCommandAttribute(typed.currentTarget);
  }

  var updateId = this._beginChange();

  this._args = exports.tokenize(typed);
  var args = this._args.slice(0); // i.e. clone

  return this._split(args).then(function() {
    if (!this._isChangeCurrent(updateId)) {
      return false;
    }

    return this._assign(args).then(function() {
      if (this._endChangeCheckOrder(updateId)) {
        this.onTextChange();
        return true;
      }

      return false;
    }.bind(this));
  }.bind(this));
};

/**
 * Similar to update('') except that it's guaranteed to execute synchronously
 */
Requisition.prototype.clear = function() {
  this.onTextChange.holdFire();

  var arg = new Argument('', '', '');
  this._args = [ arg ];

  var commandType = this.commandAssignment.param.type;
  var parsePromise = commandType.parse(arg, this.executionContext);
  this.setAssignment(this.commandAssignment,
                     util.synchronize(parsePromise),
                     { internal: true });

  this.onTextChange.resumeFire();
  this.onTextChange();
};

/**
 * tokenize() is a state machine. These are the states.
 */
var In = {
  /**
   * The last character was ' '.
   * Typing a ' ' character will not change the mode
   * Typing one of '"{ will change mode to SINGLE_Q, DOUBLE_Q or SCRIPT.
   * Anything else goes into SIMPLE mode.
   */
  WHITESPACE: 1,

  /**
   * The last character was part of a parameter.
   * Typing ' ' returns to WHITESPACE mode. Any other character
   * (including '"{} which are otherwise special) does not change the mode.
   */
  SIMPLE: 2,

  /**
   * We're inside single quotes: '
   * Typing ' returns to WHITESPACE mode. Other characters do not change mode.
   */
  SINGLE_Q: 3,

  /**
   * We're inside double quotes: "
   * Typing " returns to WHITESPACE mode. Other characters do not change mode.
   */
  DOUBLE_Q: 4,

  /**
   * We're inside { and }
   * Typing } returns to WHITESPACE mode. Other characters do not change mode.
   * SCRIPT mode is slightly different from other modes in that spaces between
   * the {/} delimiters and the actual input are not considered significant.
   * e.g: " x " is a 3 character string, delimited by double quotes, however
   * { x } is a 1 character JavaScript surrounded by whitespace and {}
   * delimiters.
   * In the short term we assume that the JS routines can make sense of the
   * extra whitespace, however at some stage we may need to move the space into
   * the Argument prefix/suffix.
   * Also we don't attempt to handle nested {}. See bug 678961
   */
  SCRIPT: 5
};

/**
 * Split up the input taking into account ', " and {.
 * We don't consider \t or other classical whitespace characters to split
 * arguments apart. For one thing these characters are hard to type, but also
 * if the user has gone to the trouble of pasting a TAB character into the
 * input field (or whatever it takes), they probably mean it.
 */
exports.tokenize = function(typed) {
  // For blank input, place a dummy empty argument into the list
  if (typed == null || typed.length === 0) {
    return [ new Argument('', '', '') ];
  }

  if (isSimple(typed)) {
    return [ new Argument(typed, '', '') ];
  }

  var mode = In.WHITESPACE;

  // First we swap out escaped characters that are special to the tokenizer.
  // So a backslash followed by any of ['"{} ] is turned into a unicode private
  // char so we can swap back later
  typed = typed
      .replace(/\\\\/g, '\uF000')
      .replace(/\\ /g, '\uF001')
      .replace(/\\'/g, '\uF002')
      .replace(/\\"/g, '\uF003')
      .replace(/\\{/g, '\uF004')
      .replace(/\\}/g, '\uF005');

  function unescape2(escaped) {
    return escaped
        .replace(/\uF000/g, '\\\\')
        .replace(/\uF001/g, '\\ ')
        .replace(/\uF002/g, '\\\'')
        .replace(/\uF003/g, '\\\"')
        .replace(/\uF004/g, '\\{')
        .replace(/\uF005/g, '\\}');
  }

  var i = 0;          // The index of the current character
  var start = 0;      // Where did this section start?
  var prefix = '';    // Stuff that comes before the current argument
  var args = [];      // The array that we're creating
  var blockDepth = 0; // For JS with nested {}

  // This is just a state machine. We're going through the string char by char
  // The 'mode' is one of the 'In' states. As we go, we're adding Arguments
  // to the 'args' array.

  while (true) {
    var c = typed[i];
    var str;
    switch (mode) {
      case In.WHITESPACE:
        if (c === '\'') {
          prefix = typed.substring(start, i + 1);
          mode = In.SINGLE_Q;
          start = i + 1;
        }
        else if (c === '"') {
          prefix = typed.substring(start, i + 1);
          mode = In.DOUBLE_Q;
          start = i + 1;
        }
        else if (c === '{') {
          prefix = typed.substring(start, i + 1);
          mode = In.SCRIPT;
          blockDepth++;
          start = i + 1;
        }
        else if (/ /.test(c)) {
          // Still whitespace, do nothing
        }
        else {
          prefix = typed.substring(start, i);
          mode = In.SIMPLE;
          start = i;
        }
        break;

      case In.SIMPLE:
        // There is an edge case of xx'xx which we are assuming to
        // be a single parameter (and same with ")
        if (c === ' ') {
          str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, ''));
          mode = In.WHITESPACE;
          start = i;
          prefix = '';
        }
        break;

      case In.SINGLE_Q:
        if (c === '\'') {
          str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, c));
          mode = In.WHITESPACE;
          start = i + 1;
          prefix = '';
        }
        break;

      case In.DOUBLE_Q:
        if (c === '"') {
          str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, c));
          mode = In.WHITESPACE;
          start = i + 1;
          prefix = '';
        }
        break;

      case In.SCRIPT:
        if (c === '{') {
          blockDepth++;
        }
        else if (c === '}') {
          blockDepth--;
          if (blockDepth === 0) {
            str = unescape2(typed.substring(start, i));
            args.push(new ScriptArgument(str, prefix, c));
            mode = In.WHITESPACE;
            start = i + 1;
            prefix = '';
          }
        }
        break;
    }

    i++;

    if (i >= typed.length) {
      // There is nothing else to read - tidy up
      if (mode === In.WHITESPACE) {
        if (i !== start) {
          // There's whitespace at the end of the typed string. Add it to the
          // last argument's suffix, creating an empty argument if needed.
          var extra = typed.substring(start, i);
          var lastArg = args[args.length - 1];
          if (!lastArg) {
            args.push(new Argument('', extra, ''));
          }
          else {
            lastArg.suffix += extra;
          }
        }
      }
      else if (mode === In.SCRIPT) {
        str = unescape2(typed.substring(start, i + 1));
        args.push(new ScriptArgument(str, prefix, ''));
      }
      else {
        str = unescape2(typed.substring(start, i + 1));
        args.push(new Argument(str, prefix, ''));
      }
      break;
    }
  }

  return args;
};

/**
 * If the input has no spaces, quotes, braces or escapes,
 * we can take the fast track.
 */
function isSimple(typed) {
   for (var i = 0; i < typed.length; i++) {
     var c = typed.charAt(i);
     if (c === ' ' || c === '"' || c === '\'' ||
         c === '{' || c === '}' || c === '\\') {
       return false;
     }
   }
   return true;
}

/**
 * Looks in the canon for a command extension that matches what has been
 * typed at the command line.
 */
Requisition.prototype._split = function(args) {
  // We're processing args, so we don't want the assignments that we make to
  // try to adjust other args assuming this is an external update
  var noArgUp = { internal: true };

  // Handle the special case of the user typing { javascript(); }
  // We use the hidden 'eval' command directly rather than shift()ing one of
  // the parameters, and parse()ing it.
  var conversion;
  if (args[0].type === 'ScriptArgument') {
    // Special case: if the user enters { console.log('foo'); } then we need to
    // use the hidden 'eval' command
    conversion = new Conversion(getEvalCommand(), new ScriptArgument());
    return this.setAssignment(this.commandAssignment, conversion, noArgUp);
  }

  var argsUsed = 1;

  var parsePromise;
  var commandType = this.commandAssignment.param.type;
  while (argsUsed <= args.length) {
    var arg = (argsUsed === 1) ?
              args[0] :
              new MergedArgument(args, 0, argsUsed);

    // Making the commandType.parse() promise as synchronous is OK because we
    // know that commandType is a synchronous type.

    if (this.prefix != null && this.prefix !== '') {
      var prefixArg = new Argument(this.prefix, '', ' ');
      var prefixedArg = new MergedArgument([ prefixArg, arg ]);

      parsePromise = commandType.parse(prefixedArg, this.executionContext);
      conversion = util.synchronize(parsePromise);

      if (conversion.value == null) {
        parsePromise = commandType.parse(arg, this.executionContext);
        conversion = util.synchronize(parsePromise);
      }
    }
    else {
      parsePromise = commandType.parse(arg, this.executionContext);
      conversion = util.synchronize(parsePromise);
    }

    // We only want to carry on if this command is a parent command,
    // which means that there is a commandAssignment, but not one with
    // an exec function.
    if (!conversion.value || conversion.value.exec) {
      break;
    }

    // Previously we needed a way to hide commands depending context.
    // We have not resurrected that feature yet, but if we do we should
    // insert code here to ignore certain commands depending on the
    // context/environment

    argsUsed++;
  }

  // This could probably be re-written to consume args as we go
  for (var i = 0; i < argsUsed; i++) {
    args.shift();
  }

  // Warning: we're returning a promise (from setAssignment) which tells us
  // when we're done setting the current command, but mutating the args array
  // as we go, so we're conflicted on when we're done

  return this.setAssignment(this.commandAssignment, conversion, noArgUp);
};

/**
 * Add all the passed args to the list of unassigned assignments.
 */
Requisition.prototype._addUnassignedArgs = function(args) {
  args.forEach(function(arg) {
    this._unassigned.push(new UnassignedAssignment(this, arg));
  }.bind(this));
};

/**
 * Work out which arguments are applicable to which parameters.
 */
Requisition.prototype._assign = function(args) {
  // See comment in _split. Avoid multiple updates
  var noArgUp = { internal: true };

  this._unassigned = [];
  var outstanding = [];

  if (!this.commandAssignment.value) {
    this._addUnassignedArgs(args);
    return promise.all(outstanding);
  }

  if (args.length === 0) {
    this.setBlankArguments();
    return promise.all(outstanding);
  }

  // Create an error if the command does not take parameters, but we have
  // been given them ...
  if (this.assignmentCount === 0) {
    this._addUnassignedArgs(args);
    return promise.all(outstanding);
  }

  // Special case: if there is only 1 parameter, and that's of type
  // text, then we put all the params into the first param
  if (this.assignmentCount === 1) {
    var assignment = this.getAssignment(0);
    if (assignment.param.type.name === 'string') {
      var arg = (args.length === 1) ? args[0] : new MergedArgument(args);
      outstanding.push(this.setAssignment(assignment, arg, noArgUp));
      return promise.all(outstanding);
    }
  }

  // Positional arguments can still be specified by name, but if they are
  // then we need to ignore them when working them out positionally
  var unassignedParams = this.getParameterNames();

  // We collect the arguments used in arrays here before assigning
  var arrayArgs = {};

  // Extract all the named parameters
  this.getAssignments(false).forEach(function(assignment) {
    // Loop over the arguments
    // Using while rather than loop because we remove args as we go
    var i = 0;
    while (i < args.length) {
      if (assignment.param.isKnownAs(args[i].text)) {
        var arg = args.splice(i, 1)[0];
        unassignedParams = unassignedParams.filter(function(test) {
          return test !== assignment.param.name;
        });

        // boolean parameters don't have values, default to false
        if (assignment.param.type.name === 'boolean') {
          arg = new TrueNamedArgument(arg);
        }
        else {
          var valueArg = null;
          if (i + 1 <= args.length) {
            valueArg = args.splice(i, 1)[0];
          }
          arg = new NamedArgument(arg, valueArg);
        }

        if (assignment.param.type.name === 'array') {
          var arrayArg = arrayArgs[assignment.param.name];
          if (!arrayArg) {
            arrayArg = new ArrayArgument();
            arrayArgs[assignment.param.name] = arrayArg;
          }
          arrayArg.addArgument(arg);
        }
        else {
          if (assignment.arg.type === 'BlankArgument') {
            outstanding.push(this.setAssignment(assignment, arg, noArgUp));
          }
          else {
            this._addUnassignedArgs(arg.getArgs());
          }
        }
      }
      else {
        // Skip this parameter and handle as a positional parameter
        i++;
      }
    }
  }, this);

  // What's left are positional parameters: assign in order
  unassignedParams.forEach(function(name) {
    var assignment = this.getAssignment(name);

    // If not set positionally, and we can't set it non-positionally,
    // we have to default it to prevent previous values surviving
    if (!assignment.param.isPositionalAllowed) {
      outstanding.push(this.setAssignment(assignment, null, noArgUp));
      return;
    }

    // If this is a positional array argument, then it swallows the
    // rest of the arguments.
    if (assignment.param.type.name === 'array') {
      var arrayArg = arrayArgs[assignment.param.name];
      if (!arrayArg) {
        arrayArg = new ArrayArgument();
        arrayArgs[assignment.param.name] = arrayArg;
      }
      arrayArg.addArguments(args);
      args = [];
      // The actual assignment to the array parameter is done below
      return;
    }

    // Set assignment to defaults if there are no more arguments
    if (args.length === 0) {
      outstanding.push(this.setAssignment(assignment, null, noArgUp));
      return;
    }

    var arg = args.splice(0, 1)[0];
    // --foo and -f are named parameters, -4 is a number. So '-' is either
    // the start of a named parameter or a number depending on the context
    var isIncompleteName = assignment.param.type.name === 'number' ?
        /-[-a-zA-Z_]/.test(arg.text) :
        arg.text.charAt(0) === '-';

    if (isIncompleteName) {
      this._unassigned.push(new UnassignedAssignment(this, arg));
    }
    else {
      outstanding.push(this.setAssignment(assignment, arg, noArgUp));
    }
  }, this);

  // Now we need to assign the array argument (if any)
  Object.keys(arrayArgs).forEach(function(name) {
    var assignment = this.getAssignment(name);
    outstanding.push(this.setAssignment(assignment, arrayArgs[name], noArgUp));
  }, this);

  // What's left is can't be assigned, but we need to officially unassign them
  this._addUnassignedArgs(args);

  return promise.all(outstanding);
};

/**
 * Entry point for keyboard accelerators or anything else that wants to execute
 * a command.
 * @param options Object describing how the execution should be handled.
 * (optional). Contains some of the following properties:
 * - hidden (boolean, default=false) Should the output be hidden from the
 *   commandOutputManager for this requisition
 * - command/args A fast shortcut to executing a known command with a known
 *   set of parsed arguments.
 */
Requisition.prototype.exec = function(options) {
  var command = null;
  var args = null;
  var hidden = false;

  if (options) {
    if (options.hidden) {
      hidden = true;
    }

    if (options.command != null) {
      // Fast track by looking up the command directly since passed args
      // means there is no command line to parse.
      command = canon.getCommand(options.command);
      if (!command) {
        console.error('Command not found: ' + options.command);
      }
      args = options.args;
    }
  }

  if (!command) {
    command = this.commandAssignment.value;
    args = this.getArgsObject();
  }

  // Display JavaScript input without the initial { or closing }
  var typed = this.toString();
  if (evalCmd.isCommandRegexp.test(typed)) {
    typed = typed.replace(evalCmd.isCommandRegexp, '');
    // Bug 717763: What if the JavaScript naturally ends with a }?
    typed = typed.replace(/\s*}\s*$/, '');
  }

  var output = new Output({
    command: command,
    args: args,
    typed: typed,
    canonical: this.toCanonicalString(),
    hidden: hidden
  });

  this.commandOutputManager.onOutput({ output: output });

  var onDone = function(data) {
    output.complete(data, false);
    return output;
  };

  var onError = function(ex) {
    if (exports.logErrors) {
      util.errorHandler(ex);
    }

    var data = ex.isTypedData ? ex : {
      isTypedData: true,
      data: ex,
      type: 'error'
    };
    output.complete(data, true);
    return output;
  };

  if (this.status !== Status.VALID) {
    var ex = new Error(this.getStatusMessage());
    return promise.resolve(onError(ex)).then(function(output) {
      this.clear();
      return output;
    }.bind(this));
  }
  else {
    try {
      var reply = command.exec(args, this.executionContext);
      return promise.resolve(reply).then(onDone, onError);
    }
    catch (ex) {
      return promise.resolve(onError(ex));
    }
    finally {
      this.clear();
    }
  }
};

/**
 * A shortcut for calling update, resolving the promise and then exec.
 * @param input The string to execute
 * @param options Passed to exec
 * @return A promise of an output object
 */
Requisition.prototype.updateExec = function(input, options) {
  return this.update(input).then(function() {
    if (this.status === Status.VALID) {
      return this.exec(options);
    }
  }.bind(this));
};

exports.Requisition = Requisition;

/**
 * A simple object to hold information about the output of a command
 */
function Output(options) {
  options = options || {};
  this.command = options.command || '';
  this.args = options.args || {};
  this.typed = options.typed || '';
  this.canonical = options.canonical || '';
  this.hidden = options.hidden === true ? true : false;

  this.type = undefined;
  this.data = undefined;
  this.completed = false;
  this.error = false;
  this.start = new Date();

  this._deferred = promise.defer();
  this.promise = this._deferred.promise;

  this.onClose = util.createEvent('Output.onClose');
}

/**
 * Called when there is data to display, and the command has finished executing
 * See changed() for details on parameters.
 */
Output.prototype.complete = function(data, error) {
  this.end = new Date();
  this.duration = this.end.getTime() - this.start.getTime();
  this.completed = true;
  this.error = error;

  if (data != null && data.isTypedData) {
    this.data = data.data;
    this.type = data.type;
  }
  else {
    this.data = data;
    this.type = this.command.returnType;
    if (this.type == null) {
      this.type = (this.data == null) ? 'undefined' : typeof this.data;
    }
  }

  if (this.type === 'object') {
    throw new Error('No type from output of ' + this.typed);
  }

  this._deferred.resolve();
};

/**
 * Call converters.convert using the data in this Output object
 */
Output.prototype.convert = function(type, conversionContext) {
  return converters.convert(this.data, this.type, type, conversionContext);
};

Output.prototype.toJson = function() {
  return {
    typed: this.typed,
    type: this.type,
    data: this.data,
    error: this.error
  };
};

exports.Output = Output;


});
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

define('gcli/ui/view', ['require', 'exports', 'module' , 'util/util', 'util/domtemplate'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var domtemplate = require('util/domtemplate');


/**
 * We want to avoid commands having to create DOM structures because that's
 * messy and because we're going to need to have command output displayed in
 * different documents. A View is a way to wrap an HTML template (for
 * domtemplate) in with the data and options to render the template, so anyone
 * can later run the template in the context of any document.
 * View also cuts out a chunk of boiler place code.
 * @param options The information needed to create the DOM from HTML. Includes:
 * - html (required): The HTML source, probably from a call to require
 * - options (default={}): The domtemplate options. See domtemplate for details
 * - data (default={}): The data to domtemplate. See domtemplate for details.
 * - css (default=none): Some CSS to be added to the final document. If 'css'
 *   is used, use of cssId is strongly recommended.
 * - cssId (default=none): An ID to prevent multiple CSS additions. See
 *   util.importCss for more details.
 * @return An object containing a single function 'appendTo()' which runs the
 * template adding the result to the specified element. Takes 2 parameters:
 * - element (required): the element to add to
 * - clear (default=false): if clear===true then remove all pre-existing
 *   children of 'element' before appending the results of this template.
 */
exports.createView = function(options) {
  if (options.html == null) {
    throw new Error('options.html is missing');
  }

  return {
    /**
     * RTTI. Yeah.
     */
    isView: true,

    /**
     * Run the template against the document to which element belongs.
     * @param element The element to append the result to
     * @param clear Set clear===true to remove all children of element
     */
    appendTo: function(element, clear) {
      // Strict check on the off-chance that we later think of other options
      // and want to replace 'clear' with an 'options' parameter, but want to
      // support backwards compat.
      if (clear === true) {
        util.clearElement(element);
      }

      element.appendChild(this.toDom(element.ownerDocument));
    },

    /**
     * Actually convert the view data into a DOM suitable to be appended to
     * an element
     * @param document to use in realizing the template
     */
    toDom: function(document) {
      if (options.css) {
        util.importCss(options.css, document, options.cssId);
      }

      var child = util.toDom(document, options.html);
      domtemplate.template(child, options.data || {}, options.options || {});
      return child;
    }
  };
};


});
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

define('util/domtemplate', ['require', 'exports', 'module' ], function(require, exports, module) {
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

// WARNING: do not 'use_strict' without reading the notes in envEval();

/**
 * For full documentation, see:
 * https://github.com/mozilla/domtemplate/blob/master/README.md
 */

/**
 * Begin a new templating process.
 * @param node A DOM element or string referring to an element's id
 * @param data Data to use in filling out the template
 * @param options Options to customize the template processing. One of:
 * - allowEval: boolean (default false) Basic template interpolations are
 *   either property paths (e.g. ${a.b.c.d}), or if allowEval=true then we
 *   allow arbitrary JavaScript
 * - stack: string or array of strings (default empty array) The template
 *   engine maintains a stack of tasks to help debug where it is. This allows
 *   this stack to be prefixed with a template name
 * - blankNullUndefined: By default DOMTemplate exports null and undefined
 *   values using the strings 'null' and 'undefined', which can be helpful for
 *   debugging, but can introduce unnecessary extra logic in a template to
 *   convert null/undefined to ''. By setting blankNullUndefined:true, this
 *   conversion is handled by DOMTemplate
 */
var template = exports.template = function(node, data, options) {
  var state = {
    options: options || {},
    // We keep a track of the nodes that we've passed through so we can keep
    // data.__element pointing to the correct node
    nodes: []
  };

  state.stack = state.options.stack;

  if (!Array.isArray(state.stack)) {
    if (typeof state.stack === 'string') {
      state.stack = [ options.stack ];
    }
    else {
      state.stack = [];
    }
  }

  processNode(state, node, data);
};

function cloneState(state) {
  return {
    options: state.options,
    stack: state.stack.slice(),
    nodes: state.nodes.slice()
  };
}

/**
 * Regex used to find ${...} sections in some text.
 * Performance note: This regex uses ( and ) to capture the 'script' for
 * further processing. Not all of the uses of this regex use this feature so
 * if use of the capturing group is a performance drain then we should split
 * this regex in two.
 */
var TEMPLATE_REGION = /\$\{([^}]*)\}/g;

/**
 * Recursive function to walk the tree processing the attributes as it goes.
 * @param node the node to process. If you pass a string in instead of a DOM
 * element, it is assumed to be an id for use with document.getElementById()
 * @param data the data to use for node processing.
 */
function processNode(state, node, data) {
  if (typeof node === 'string') {
    node = document.getElementById(node);
  }
  if (data == null) {
    data = {};
  }
  state.stack.push(node.nodeName + (node.id ? '#' + node.id : ''));
  var pushedNode = false;
  try {
    // Process attributes
    if (node.attributes && node.attributes.length) {
      // We need to handle 'foreach' and 'if' first because they might stop
      // some types of processing from happening, and foreach must come first
      // because it defines new data on which 'if' might depend.
      if (node.hasAttribute('foreach')) {
        processForEach(state, node, data);
        return;
      }
      if (node.hasAttribute('if')) {
        if (!processIf(state, node, data)) {
          return;
        }
      }
      // Only make the node available once we know it's not going away
      state.nodes.push(data.__element);
      data.__element = node;
      pushedNode = true;
      // It's good to clean up the attributes when we've processed them,
      // but if we do it straight away, we mess up the array index
      var attrs = Array.prototype.slice.call(node.attributes);
      for (var i = 0; i < attrs.length; i++) {
        var value = attrs[i].value;
        var name = attrs[i].name;

        state.stack.push(name);
        try {
          if (name === 'save') {
            // Save attributes are a setter using the node
            value = stripBraces(value);
            property(value, data, node);
            node.removeAttribute('save');
          }
          else if (name.substring(0, 2) === 'on') {
            // If this attribute value contains only an expression
            if (value.substring(0, 2) === '${' && value.slice(-1) === '}' &&
                    value.indexOf('${', 2) === -1) {
              value = stripBraces(value);
              var func = property(value, data);
              if (typeof func === 'function') {
                node.removeAttribute(name);
                var capture = node.hasAttribute('capture' + name.substring(2));
                node.addEventListener(name.substring(2), func, capture);
                if (capture) {
                  node.removeAttribute('capture' + name.substring(2));
                }
              }
              else {
                // Attribute value is not a function - use as a DOM-L0 string
                node.setAttribute(name, func);
              }
            }
            else {
              // Attribute value is not a single expression use as DOM-L0
              node.setAttribute(name, processString(state, value, data));
            }
          }
          else {
            node.removeAttribute(name);
            // Remove '_' prefix of attribute names so the DOM won't try
            // to use them before we've processed the template
            if (name.charAt(0) === '_') {
              name = name.substring(1);
            }

            // Async attributes can only work if the whole attribute is async
            var replacement;
            if (value.indexOf('${') === 0 &&
                value.charAt(value.length - 1) === '}') {
              replacement = envEval(state, value.slice(2, -1), data, value);
              if (replacement && typeof replacement.then === 'function') {
                node.setAttribute(name, '');
                replacement.then(function(newValue) {
                  node.setAttribute(name, newValue);
                }).then(null, console.error);
              }
              else {
                if (state.options.blankNullUndefined && replacement == null) {
                  replacement = '';
                }
                node.setAttribute(name, replacement);
              }
            }
            else {
              node.setAttribute(name, processString(state, value, data));
            }
          }
        }
        finally {
          state.stack.pop();
        }
      }
    }

    // Loop through our children calling processNode. First clone them, so the
    // set of nodes that we visit will be unaffected by additions or removals.
    var childNodes = Array.prototype.slice.call(node.childNodes);
    for (var j = 0; j < childNodes.length; j++) {
      processNode(state, childNodes[j], data);
    }

    if (node.nodeType === 3 /*Node.TEXT_NODE*/) {
      processTextNode(state, node, data);
    }
  }
  finally {
    if (pushedNode) {
      data.__element = state.nodes.pop();
    }
    state.stack.pop();
  }
}

/**
 * Handle attribute values where the output can only be a string
 */
function processString(state, value, data) {
  return value.replace(TEMPLATE_REGION, function(path) {
    var insert = envEval(state, path.slice(2, -1), data, value);
    return state.options.blankNullUndefined && insert == null ? '' : insert;
  });
}

/**
 * Handle <x if="${...}">
 * @param node An element with an 'if' attribute
 * @param data The data to use with envEval()
 * @returns true if processing should continue, false otherwise
 */
function processIf(state, node, data) {
  state.stack.push('if');
  try {
    var originalValue = node.getAttribute('if');
    var value = stripBraces(originalValue);
    var recurse = true;
    try {
      var reply = envEval(state, value, data, originalValue);
      recurse = !!reply;
    }
    catch (ex) {
      handleError(state, 'Error with \'' + value + '\'', ex);
      recurse = false;
    }
    if (!recurse) {
      node.parentNode.removeChild(node);
    }
    node.removeAttribute('if');
    return recurse;
  }
  finally {
    state.stack.pop();
  }
}

/**
 * Handle <x foreach="param in ${array}"> and the special case of
 * <loop foreach="param in ${array}">.
 * This function is responsible for extracting what it has to do from the
 * attributes, and getting the data to work on (including resolving promises
 * in getting the array). It delegates to processForEachLoop to actually
 * unroll the data.
 * @param node An element with a 'foreach' attribute
 * @param data The data to use with envEval()
 */
function processForEach(state, node, data) {
  state.stack.push('foreach');
  try {
    var originalValue = node.getAttribute('foreach');
    var value = originalValue;

    var paramName = 'param';
    if (value.charAt(0) === '$') {
      // No custom loop variable name. Use the default: 'param'
      value = stripBraces(value);
    }
    else {
      // Extract the loop variable name from 'NAME in ${ARRAY}'
      var nameArr = value.split(' in ');
      paramName = nameArr[0].trim();
      value = stripBraces(nameArr[1].trim());
    }
    node.removeAttribute('foreach');
    try {
      var evaled = envEval(state, value, data, originalValue);
      var cState = cloneState(state);
      handleAsync(evaled, node, function(reply, siblingNode) {
        processForEachLoop(cState, reply, node, siblingNode, data, paramName);
      });
      node.parentNode.removeChild(node);
    }
    catch (ex) {
      handleError(state, 'Error with \'' + value + '\'', ex);
    }
  }
  finally {
    state.stack.pop();
  }
}

/**
 * Called by processForEach to handle looping over the data in a foreach loop.
 * This works with both arrays and objects.
 * Calls processForEachMember() for each member of 'set'
 * @param set The object containing the data to loop over
 * @param templNode The node to copy for each set member
 * @param sibling The sibling node to which we add things
 * @param data the data to use for node processing
 * @param paramName foreach loops have a name for the parameter currently being
 * processed. The default is 'param'. e.g. <loop foreach="param in ${x}">...
 */
function processForEachLoop(state, set, templNode, sibling, data, paramName) {
  if (Array.isArray(set)) {
    set.forEach(function(member, i) {
      processForEachMember(state, member, templNode, sibling,
                           data, paramName, '' + i);
    });
  }
  else {
    for (var member in set) {
      if (set.hasOwnProperty(member)) {
        processForEachMember(state, member, templNode, sibling,
                             data, paramName, member);
      }
    }
  }
}

/**
 * Called by processForEachLoop() to resolve any promises in the array (the
 * array itself can also be a promise, but that is resolved by
 * processForEach()). Handle <LOOP> elements (which are taken out of the DOM),
 * clone the template node, and pass the processing on to processNode().
 * @param member The data item to use in templating
 * @param templNode The node to copy for each set member
 * @param siblingNode The parent node to which we add things
 * @param data the data to use for node processing
 * @param paramName The name given to 'member' by the foreach attribute
 * @param frame A name to push on the stack for debugging
 */
function processForEachMember(state, member, templNode, siblingNode, data, paramName, frame) {
  state.stack.push(frame);
  try {
    var cState = cloneState(state);
    handleAsync(member, siblingNode, function(reply, node) {
      data[paramName] = reply;
      if (node.parentNode != null) {
        if (templNode.nodeName.toLowerCase() === 'loop') {
          for (var i = 0; i < templNode.childNodes.length; i++) {
            var clone = templNode.childNodes[i].cloneNode(true);
            node.parentNode.insertBefore(clone, node);
            processNode(cState, clone, data);
          }
        }
        else {
          var clone = templNode.cloneNode(true);
          clone.removeAttribute('foreach');
          node.parentNode.insertBefore(clone, node);
          processNode(cState, clone, data);
        }
      }
      delete data[paramName];
    });
  }
  finally {
    state.stack.pop();
  }
}

/**
 * Take a text node and replace it with another text node with the ${...}
 * sections parsed out. We replace the node by altering node.parentNode but
 * we could probably use a DOM Text API to achieve the same thing.
 * @param node The Text node to work on
 * @param data The data to use in calls to envEval()
 */
function processTextNode(state, node, data) {
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
  value = value.replace(TEMPLATE_REGION, '\uF001$$$1\uF002');
  // Split a string using the unicode chars F001 and F002.
  var parts = value.split(/\uF001|\uF002/);
  if (parts.length > 1) {
    parts.forEach(function(part) {
      if (part === null || part === undefined || part === '') {
        return;
      }
      if (part.charAt(0) === '$') {
        part = envEval(state, part.slice(1), data, node.data);
      }
      var cState = cloneState(state);
      handleAsync(part, node, function(reply, siblingNode) {
        var doc = siblingNode.ownerDocument;
        if (reply == null) {
          reply = cState.options.blankNullUndefined ? '' : '' + reply;
        }
        if (typeof reply.cloneNode === 'function') {
          // i.e. if (reply instanceof Element) { ...
          reply = maybeImportNode(cState, reply, doc);
          siblingNode.parentNode.insertBefore(reply, siblingNode);
        }
        else if (typeof reply.item === 'function' && reply.length) {
          // NodeLists can be live, in which case maybeImportNode can
          // remove them from the document, and thus the NodeList, which in
          // turn breaks iteration. So first we clone the list
          var list = Array.prototype.slice.call(reply, 0);
          list.forEach(function(child) {
            var imported = maybeImportNode(cState, child, doc);
            siblingNode.parentNode.insertBefore(imported, siblingNode);
          });
        }
        else {
          // if thing isn't a DOM element then wrap its string value in one
          reply = doc.createTextNode(reply.toString());
          siblingNode.parentNode.insertBefore(reply, siblingNode);
        }
      });
    });
    node.parentNode.removeChild(node);
  }
}

/**
 * Return node or a import of node, if it's not in the given document
 * @param node The node that we want to be properly owned
 * @param doc The document that the given node should belong to
 * @return A node that belongs to the given document
 */
function maybeImportNode(state, node, doc) {
  return node.ownerDocument === doc ? node : doc.importNode(node, true);
}

/**
 * A function to handle the fact that some nodes can be promises, so we check
 * and resolve if needed using a marker node to keep our place before calling
 * an inserter function.
 * @param thing The object which could be real data or a promise of real data
 * we use it directly if it's not a promise, or resolve it if it is.
 * @param siblingNode The element before which we insert new elements.
 * @param inserter The function to to the insertion. If thing is not a promise
 * then handleAsync() is just 'inserter(thing, siblingNode)'
 */
function handleAsync(thing, siblingNode, inserter) {
  if (thing != null && typeof thing.then === 'function') {
    // Placeholder element to be replaced once we have the real data
    var tempNode = siblingNode.ownerDocument.createElement('span');
    siblingNode.parentNode.insertBefore(tempNode, siblingNode);
    thing.then(function(delayed) {
      inserter(delayed, tempNode);
      if (tempNode.parentNode != null) {
        tempNode.parentNode.removeChild(tempNode);
      }
    }).then(null, function(error) {
      console.error(error.stack);
    });
  }
  else {
    inserter(thing, siblingNode);
  }
}

/**
 * Warn of string does not begin '${' and end '}'
 * @param str the string to check.
 * @return The string stripped of ${ and }, or untouched if it does not match
 */
function stripBraces(str) {
  if (!str.match(TEMPLATE_REGION)) {
    handleError(state, 'Expected ' + str + ' to match ${...}');
    return str;
  }
  return str.slice(2, -1);
}

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
function property(path, data, newValue) {
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
        return value.bind(data);
      }
      return value;
    }
    if (!value) {
      handleError(state, '"' + path[0] + '" is undefined');
      return null;
    }
    return property(path.slice(1), value, newValue);
  }
  catch (ex) {
    handleError(state, 'Path error with \'' + path + '\'', ex);
    return '${' + path + '}';
  }
}

/**
 * Like eval, but that creates a context of the variables in <tt>env</tt> in
 * which the script is evaluated.
 * WARNING: This script uses 'with' which is generally regarded to be evil.
 * The alternative is to create a Function at runtime that takes X parameters
 * according to the X keys in the env object, and then call that function using
 * the values in the env object. This is likely to be slow, but workable.
 * @param script The string to be evaluated.
 * @param data The environment in which to eval the script.
 * @param frame Optional debugging string in case of failure.
 * @return The return value of the script, or the error message if the script
 * execution failed.
 */
function envEval(state, script, data, frame) {
  try {
    state.stack.push(frame.replace(/\s+/g, ' '));
    // Detect if a script is capable of being interpreted using property()
    if (/^[_a-zA-Z0-9.]*$/.test(script)) {
      return property(script, data);
    }
    else {
      if (!state.options.allowEval) {
        handleError(state, 'allowEval is not set, however \'' + script + '\'' +
            ' can not be resolved using a simple property path.');
        return '${' + script + '}';
      }
      with (data) {
        return eval(script);
      }
    }
  }
  catch (ex) {
    handleError(state, 'Template error evaluating \'' + script + '\'', ex);
    return '${' + script + '}';
  }
  finally {
    state.stack.pop();
  }
}

/**
 * A generic way of reporting errors, for easy overloading in different
 * environments.
 * @param message the error message to report.
 * @param ex optional associated exception.
 */
function handleError(state, message, ex) {
  logError(message + ' (In: ' + state.stack.join(' > ') + ')');
  if (ex) {
    logError(ex);
  }
}

/**
 * A generic way of reporting errors, for easy overloading in different
 * environments.
 * @param message the error message to report.
 */
function logError(message) {
  console.log(message);
}

});
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

define('gcli/ui/fields', ['require', 'exports', 'module' , 'util/promise', 'util/util', 'gcli/argument'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');
var KeyEvent = require('util/util').KeyEvent;
var Argument = require('gcli/argument').Argument;

/**
 * A Field is a way to get input for a single parameter.
 * This class is designed to be inherited from. It's important that all
 * subclasses have a similar constructor signature because they are created
 * via getField(...)
 * @param type The type to use in conversions
 * @param options A set of properties to help fields configure themselves:
 * - document: The document we use in calling createElement
 * - named: Is this parameter named? That is to say, are positional
 *         arguments disallowed, if true, then we need to provide updates to
 *         the command line that explicitly name the parameter in use
 *         (e.g. --verbose, or --name Fred rather than just true or Fred)
 * - name: If this parameter is named, what name should we use
 * - requisition: The requisition that we're attached to
 * - required: Boolean to indicate if this is a mandatory field
 */
function Field(type, options) {
  this.type = type;
  this.document = options.document;
  this.requisition = options.requisition;
}

/**
 * Enable registration of fields using addItems
 */
Field.prototype.item = 'field';

/**
 * Subclasses should assign their element with the DOM node that gets added
 * to the 'form'. It doesn't have to be an input node, just something that
 * contains it.
 */
Field.prototype.element = undefined;

/**
 * Indicates that this field should drop any resources that it has created
 */
Field.prototype.destroy = function() {
  this.messageElement = undefined;
};

// Note: We could/should probably change Fields from working with Conversions
// to working with Arguments (Tokens), which makes for less calls to parse()

/**
 * Update this field display with the value from this conversion.
 * Subclasses should provide an implementation of this function.
 */
Field.prototype.setConversion = function(conversion) {
  throw new Error('Field should not be used directly');
};

/**
 * Extract a conversion from the values in this field.
 * Subclasses should provide an implementation of this function.
 */
Field.prototype.getConversion = function() {
  throw new Error('Field should not be used directly');
};

/**
 * Set the element where messages and validation errors will be displayed
 * @see setMessage()
 */
Field.prototype.setMessageElement = function(element) {
  this.messageElement = element;
};

/**
 * Display a validation message in the UI
 */
Field.prototype.setMessage = function(message) {
  if (this.messageElement) {
    util.setTextContent(this.messageElement, message || '');
  }
};

/**
 * Method to be called by subclasses when their input changes, which allows us
 * to properly pass on the onFieldChange event.
 */
Field.prototype.onInputChange = function(ev) {
  promise.resolve(this.getConversion()).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);

    if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
      this.requisition.exec();
    }
  }.bind(this), util.errorHandler);
};

/**
 * Some fields contain information that is more important to the user, for
 * example error messages and completion menus.
 */
Field.prototype.isImportant = false;

/**
 * 'static/abstract' method to allow implementations of Field to lay a claim
 * to a type. This allows claims of various strength to be weighted up.
 * See the Field.*MATCH values.
 */
Field.claim = function(type, context) {
  throw new Error('Field should not be used directly');
};

/**
 * About minimalism - If we're producing a dialog, we want a field for every
 * parameter. If we're providing a quick tooltip, we only want a field when
 * it's really going to help.
 * The getField() function takes an option of 'tooltip: true'. Fields are
 * expected to reply with a TOOLTIP_* constant if they should be shown in the
 * tooltip case.
 */
Field.TOOLTIP_MATCH = 5;   // A best match, that works for a tooltip
Field.TOOLTIP_DEFAULT = 4; // A default match that should show in a tooltip
Field.MATCH = 3;           // Match, but ignorable if we're being minimalist
Field.DEFAULT = 2;         // This is a default (non-minimalist) match
Field.BASIC = 1;           // OK in an emergency. i.e. assume Strings
Field.NO_MATCH = 0;        // This field can't help with the given type

exports.Field = Field;


/**
 * Internal array of known fields
 */
var fieldCtors = [];

/**
 * Add a field definition by field constructor
 * @param fieldCtor Constructor function of new Field
 */
exports.addField = function(fieldCtor) {
  if (typeof fieldCtor !== 'function') {
    console.error('addField erroring on ', fieldCtor);
    throw new Error('addField requires a Field constructor');
  }
  fieldCtors.push(fieldCtor);
};

/**
 * Remove a Field definition
 * @param field A previously registered field, specified either with a field
 * name or from the field name
 */
exports.removeField = function(field) {
  if (typeof field !== 'string') {
    fieldCtors = fieldCtors.filter(function(test) {
      return test !== field;
    });
  }
  else if (field instanceof Field) {
    exports.removeField(field.name);
  }
  else {
    console.error('removeField erroring on ', field);
    throw new Error('removeField requires an instance of Field');
  }
};

/**
 * Find the best possible matching field from the specification of the type
 * of field required.
 * @param type An instance of Type that we will represent
 * @param options A set of properties that we should attempt to match, and use
 * in the construction of the new field object:
 * - document: The document to use in creating new elements
 * - name: The parameter name, (i.e. assignment.param.name)
 * - requisition: The requisition we're monitoring,
 * - required: Is this a required parameter (i.e. param.isDataRequired)
 * - named: Is this a named parameters (i.e. !param.isPositionalAllowed)
 * @return A newly constructed field that best matches the input options
 */
exports.getField = function(type, options) {
  var ctor;
  var highestClaim = -1;
  fieldCtors.forEach(function(fieldCtor) {
    var claim = fieldCtor.claim(type, options.requisition.executionContext);
    if (claim > highestClaim) {
      highestClaim = claim;
      ctor = fieldCtor;
    }
  });

  if (!ctor) {
    console.error('Unknown field type ', type, ' in ', fieldCtors);
    throw new Error('Can\'t find field for ' + type);
  }

  if (options.tooltip && highestClaim < Field.TOOLTIP_DEFAULT) {
    return new BlankField(type, options);
  }

  return new ctor(type, options);
};


/**
 * For use with delegate types that do not yet have anything to resolve to.
 * BlankFields are not for general use.
 */
function BlankField(type, options) {
  Field.call(this, type, options);

  this.element = util.createElement(this.document, 'div');

  this.onFieldChange = util.createEvent('BlankField.onFieldChange');
}

BlankField.prototype = Object.create(Field.prototype);

BlankField.claim = function(type, context) {
  return type.name === 'blank' ? Field.MATCH : Field.NO_MATCH;
};

BlankField.prototype.setConversion = function(conversion) {
  this.setMessage(conversion.message);
};

BlankField.prototype.getConversion = function() {
  return this.type.parse(new Argument(), this.requisition.executionContext);
};

exports.addField(BlankField);


});
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

define('gcli/ui/intro', ['require', 'exports', 'module' , 'util/l10n', 'gcli/settings', 'gcli/ui/view', 'gcli/cli', 'text!gcli/ui/intro.html'], function(require, exports, module) {

'use strict';

var l10n = require('util/l10n');
var settings = require('gcli/settings');
var view = require('gcli/ui/view');
var Output = require('gcli/cli').Output;

/**
 * Record if the user has clicked on 'Got It!'
 */
exports.items = [
  {
    item: 'setting',
    name: 'hideIntro',
    type: 'boolean',
    description: l10n.lookup('hideIntroDesc'),
    defaultValue: false
  }
];

/**
 * Called when the UI is ready to add a welcome message to the output
 */
exports.maybeShowIntro = function(commandOutputManager, conversionContext) {
  var hideIntro = settings.getSetting('hideIntro');
  if (hideIntro.value) {
    return;
  }

  var output = new Output();
  output.type = 'view';
  commandOutputManager.onOutput({ output: output });

  var viewData = this.createView(null, conversionContext, output);

  output.complete({ isTypedData: true, type: 'view', data: viewData });
};

/**
 * Called when the UI is ready to add a welcome message to the output
 */
exports.createView = function(ignore, conversionContext, output) {
  return view.createView({
    html: require('text!gcli/ui/intro.html'),
    options: { stack: 'intro.html' },
    data: {
      l10n: l10n.propertyLookup,
      onclick: conversionContext.update,
      ondblclick: conversionContext.updateExec,
      showHideButton: (output != null),
      onGotIt: function(ev) {
        var hideIntro = settings.getSetting('hideIntro');
        hideIntro.value = true;
        output.onClose();
      }
    }
  });
};

});
define("text!gcli/ui/intro.html", [], "\n" +
  "<div>\n" +
  "  <p>${l10n.introTextOpening2}</p>\n" +
  "\n" +
  "  <p>\n" +
  "    ${l10n.introTextCommands}\n" +
  "    <span class=\"gcli-out-shortcut\" onclick=\"${onclick}\"\n" +
  "        ondblclick=\"${ondblclick}\" data-command=\"help\">help</span>${l10n.introTextKeys2}\n" +
  "    <code>${l10n.introTextF1Escape}</code>.\n" +
  "  </p>\n" +
  "\n" +
  "  <button onclick=\"${onGotIt}\" if=\"${showHideButton}\">${l10n.introTextGo}</button>\n" +
  "</div>\n" +
  "");

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

define('gcli/ui/terminal', ['require', 'exports', 'module' , 'util/promise', 'util/util', 'util/domtemplate', 'gcli/types', 'gcli/history', 'gcli/cli', 'gcli/ui/fields', 'gcli/ui/focus', 'text!gcli/ui/terminal.css', 'text!gcli/ui/terminal.html'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');
var domtemplate = require('util/domtemplate');
var KeyEvent = require('util/util').KeyEvent;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;
var CommandAssignment = require('gcli/cli').CommandAssignment;

var fields = require('gcli/ui/fields');
var FocusManager = require('gcli/ui/focus').FocusManager;

var terminalCss = require('text!gcli/ui/terminal.css');
var terminalHtml = require('text!gcli/ui/terminal.html');

var RESOLVED = promise.resolve(true);

/**
 * A wrapper to take care of the functions concerning an input element
 * @param options Object containing user customization properties, including:
 * - promptWidth (default=22px)
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition
 * - document
 */
function Terminal(options, components) {
  this.requisition = components.requisition;
  this.document = components.document;

  this.onInputChange = util.createEvent('Terminal.onInputChange');

  this.focusManager = new FocusManager(options, {
    document: this.document,
    requisition: this.requisition
  });

  // Configure the UI
  this.rootElement = this.document.getElementById('gcli-root');
  if (!this.rootElement) {
    throw new Error('Missing element, id=gcli-root');
  }

  // terminal.html contains sub-templates which we detach for later processing
  var template = util.toDom(this.document, terminalHtml);

  this.tooltipTemplate = template.querySelector('.gcli-tt');
  this.tooltipTemplate.parentElement.removeChild(this.tooltipTemplate);

  this.completerTemplate = template.querySelector('.gcli-in-complete > div');
  this.completerTemplate.parentElement.removeChild(this.completerTemplate);
  // We want the spans to line up without the spaces in the template
  util.removeWhitespace(this.completerTemplate, true);

  this.outputViewTemplate = template.querySelector('.gcli-display > div');
  this.outputViewTemplate.parentElement.removeChild(this.outputViewTemplate);

  // Now we've detached the sub-templates, load what is left
  // The following elements are stored into 'this' by this template process:
  // displayElement, panelElement, tooltipElement,
  // inputElement, completeElement, promptElement
  domtemplate.template(template, this, { stack: 'terminal.html' });
  while (template.hasChildNodes()) {
    this.rootElement.appendChild(template.firstChild);
  }

  if (terminalCss != null) {
    this.style = util.importCss(terminalCss, this.document, 'gcli-tooltip');
  }

  this.panelElement.classList.add('gcli-panel-hide');

  // Firefox doesn't autofocus with dynamically added elements (Bug 662496)
  this.inputElement.focus();

  // Which of the available completion options is the user considering?
  this.choice = 0;

  // Used to distinguish focus from TAB in CLI. See onKeyUp()
  this.lastTabDownAt = 0;

  // Used to effect caret changes. See _processCaretChange()
  this._caretChange = null;

  // Setup History
  this.history = new History();
  this._scrollingThroughHistory = false;

  // Used when we're selecting which prediction to complete with
  this._choice = null;

  // Initially an asynchronous completion isn't in-progress
  this._completed = RESOLVED;

  // We keep a track of which assignment the cursor is in
  this.assignment = this.requisition.getAssignmentAt(0);

  // Avoid calling requisition.update when the keyUp results in no change
  this._previousValue = undefined;

  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // We also keep track of the last known arg text for the current assignment
  this.lastText = undefined;

  // Bind handlers
  this.focus = this.focus.bind(this);
  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);
  this.onMouseUp = this.onMouseUp.bind(this);
  this.onWindowResize = this.onWindowResize.bind(this);

  this.rootElement.addEventListener('click', this.focus, false);

  // Ensure that TAB/UP/DOWN isn't handled by the browser
  this.inputElement.addEventListener('keydown', this.onKeyDown, false);
  this.inputElement.addEventListener('keyup', this.onKeyUp, false);

  // Cursor position affects hint severity
  this.inputElement.addEventListener('mouseup', this.onMouseUp, false);

  this.focusManager.onVisibilityChange.add(this.visibilityChanged, this);
  this.focusManager.addMonitoredElement(this.tooltipElement, 'tooltip');
  this.focusManager.addMonitoredElement(this.inputElement, 'input');

  this.requisition.onTextChange.add(this.textChanged, this);
  this.requisition.commandOutputManager.onOutput.add(this.outputted, this);

  this.document.defaultView.addEventListener('resize', this.onWindowResize, false);

  this.onInputChange.add(this.updateCompletion, this);

  this.requisition.update(this.inputElement.value || '');
  this.onWindowResize();
  this.updateCompletion();
  this.assignmentChanged({ assignment: this.assignment });
}

/**
 * Avoid memory leaks
 */
Terminal.prototype.destroy = function() {
  this.document.defaultView.removeEventListener('resize', this.onWindowResize, false);

  this.requisition.onTextChange.remove(this.textChanged, this);
  this.requisition.commandOutputManager.onOutput.remove(this.outputted, this);

  this.focusManager.removeMonitoredElement(this.inputElement, 'input');
  this.focusManager.removeMonitoredElement(this.tooltipElement, 'tooltip');
  this.focusManager.onVisibilityChange.remove(this.visibilityChanged, this);

  this.inputElement.removeEventListener('mouseup', this.onMouseUp, false);
  this.inputElement.removeEventListener('keydown', this.onKeyDown, false);
  this.inputElement.removeEventListener('keyup', this.onKeyUp, false);
  this.rootElement.removeEventListener('click', this.focus, false);

  this.history.destroy();
  this.focusManager.destroy();

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    this.style = undefined;
  }

  this.field.onFieldChange.remove(this.fieldChanged, this);
  this.field.destroy();

  this.onInputChange.remove(this.updateCompletion, this);

  this.focus = undefined;
  this.onMouseUp = undefined;
  this.onKeyDown = undefined;
  this.onKeyUp = undefined;
  this.onWindowResize = undefined;

  this.document = undefined;

  this.lastText = undefined;
  this.assignment = undefined;

  this.rootElement = undefined;
  this.inputElement = undefined;
  this.promptElement = undefined;
  this.completeElement = undefined;
  this.tooltipElement = undefined;
  this.panelElement = undefined;
  this.displayElement = undefined;

  this.completerTemplate = undefined;
  this.tooltipTemplate = undefined;
  this.outputViewTemplate = undefined;

  this.errorEle = undefined;
  this.descriptionEle = undefined;
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Terminal.prototype.onWindowResize = function() {
  // Mochitest sometimes causes resize after shutdown. See Bug 743190
  if (!this.inputElement) {
    return;
  }

  // Simplify when jsdom does getBoundingClientRect(). See Bug 717269
  var dimensions = this.getDimensions();
  if (dimensions) {
    // TODO: Remove this if we manage to land this with a pure CSS layout
  }
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Terminal.prototype.getDimensions = function() {
  // Remove this when jsdom does getBoundingClientRect(). See Bug 717269
  if (!this.inputElement.getBoundingClientRect) {
    return undefined;
  }

  var fixedLoc = {};
  var currentElement = this.inputElement.parentNode;
  while (currentElement && currentElement.nodeName !== '#document') {
    var style = this.document.defaultView.getComputedStyle(currentElement, '');
    if (style) {
      var position = style.getPropertyValue('position');
      if (position === 'absolute' || position === 'fixed') {
        var bounds = currentElement.getBoundingClientRect();
        fixedLoc.top = bounds.top;
        fixedLoc.left = bounds.left;
        break;
      }
    }
    currentElement = currentElement.parentNode;
  }

  var rect = this.inputElement.getBoundingClientRect();
  return {
    top: rect.top - (fixedLoc.top || 0) + 1,
    height: rect.bottom - rect.top - 1,
    left: rect.left - (fixedLoc.left || 0) + 2,
    width: rect.right - rect.left
  };
};

/**
 * Handler for the input-element.onMouseUp event
 */
Terminal.prototype.onMouseUp = function(ev) {
  this._checkAssignment();
};

/**
 * Handler for the Requisition.textChanged event
 */
Terminal.prototype.textChanged = function() {
  if (!this.document) {
    return; // This can happen post-destroy()
  }

  if (this._caretChange == null) {
    // We weren't expecting a change so this was requested by the hint system
    // we should move the cursor to the end of the 'changed section', and the
    // best we can do for that right now is the end of the current argument.
    this._caretChange = Caret.TO_ARG_END;
  }

  var newStr = this.requisition.toString();
  var input = this.getInputState();

  input.typed = newStr;
  this._processCaretChange(input);

  if (this.inputElement.value !== newStr) {
    this.inputElement.value = newStr;
  }
  this.onInputChange({ inputState: input });

  // Requisition fires onTextChanged events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change.
  if (this.assignment.arg.text === this.lastText) {
    return;
  }

  this.lastText = this.assignment.arg.text;

  this.field.setConversion(this.assignment.conversion);
  util.setTextContent(this.descriptionEle, this.description);

  this._updatePosition();
};

/**
 * Various ways in which we need to manipulate the caret/selection position.
 * A value of null means we're not expecting a change
 */
var Caret = {
  /**
   * We are expecting changes, but we don't need to move the cursor
   */
  NO_CHANGE: 0,

  /**
   * We want the entire input area to be selected
   */
  SELECT_ALL: 1,

  /**
   * The whole input has changed - push the cursor to the end
   */
  TO_END: 2,

  /**
   * A part of the input has changed - push the cursor to the end of the
   * changed section
   */
  TO_ARG_END: 3
};

/**
 * If this._caretChange === Caret.TO_ARG_END, we alter the input object to move
 * the selection start to the end of the current argument.
 * @param input An object shaped like { typed:'', cursor: { start:0, end:0 }}
 */
Terminal.prototype._processCaretChange = function(input) {
  var start, end;
  switch (this._caretChange) {
    case Caret.SELECT_ALL:
      start = 0;
      end = input.typed.length;
      break;

    case Caret.TO_END:
      start = input.typed.length;
      end = input.typed.length;
      break;

    case Caret.TO_ARG_END:
      // There could be a fancy way to do this involving assignment/arg math
      // but it doesn't seem easy, so we cheat a move the cursor to just before
      // the next space, or the end of the input
      start = input.cursor.start;
      do {
        start++;
      }
      while (start < input.typed.length && input.typed[start - 1] !== ' ');

      end = start;
      break;

    default:
      start = input.cursor.start;
      end = input.cursor.end;
      break;
  }

  start = (start > input.typed.length) ? input.typed.length : start;
  end = (end > input.typed.length) ? input.typed.length : end;

  var newInput = {
    typed: input.typed,
    cursor: { start: start, end: end }
  };

  if (this.inputElement.selectionStart !== start) {
    this.inputElement.selectionStart = start;
  }
  if (this.inputElement.selectionEnd !== end) {
    this.inputElement.selectionEnd = end;
  }

  this._checkAssignment(start);

  this._caretChange = null;
  return newInput;
};

/**
 * To be called internally whenever we think that the current assignment might
 * have changed, typically on mouse-clicks or key presses.
 * @param start Optional - if specified, the cursor position to use in working
 * out the current assignment. This is needed because setting the element
 * selection start is only recognised when the event loop has finished
 */
Terminal.prototype._checkAssignment = function(start) {
  if (start == null) {
    start = this.inputElement.selectionStart;
  }
  var newAssignment = this.requisition.getAssignmentAt(start);
  if (this.assignment !== newAssignment) {
    if (this.assignment.param.type.onLeave) {
      this.assignment.param.type.onLeave(this.assignment);
    }

    // This can be kicked off either by requisition doing an assign or by
    // terminal noticing a cursor movement out of a command, so we should check
    // that this really is a new assignment
    var isNew = (this.assignment !== newAssignment);

    this.assignment = newAssignment;

    this.updateCompletion({ assignment: this.assignment });

    if (isNew) {
      this.assignmentChanged({ assignment: this.assignment });
    }

    if (this.assignment.param.type.onEnter) {
      this.assignment.param.type.onEnter(this.assignment);
    }
  }
  else {
    if (this.assignment && this.assignment.param.type.onChange) {
      this.assignment.param.type.onChange(this.assignment);
    }
  }

  // This is slightly nasty - the focusManager generally relies on people
  // telling it what it needs to know (which makes sense because the event
  // system to do it with events would be unnecessarily complex). However
  // requisition doesn't know about the focusManager either. So either one
  // needs to know about the other, or a third-party needs to break the
  // deadlock. These 2 lines are all we're quibbling about, so for now we hack
  if (this.focusManager) {
    this.focusManager.setError(this.assignment.message);
  }
};

/**
 * Set the input field to a value, for external use.
 * This function updates the data model. It sets the caret to the end of the
 * input. It does not make any similarity checks so calling this function with
 * it's current value resets the cursor position.
 * It does not execute the input or affect the history.
 * This function should not be called internally, by Terminal and never as a
 * result of a keyboard event on this.inputElement or bug 676520 could be
 * triggered.
 */
Terminal.prototype.setInput = function(str) {
  this._caretChange = Caret.TO_END;
  return this.requisition.update(str);
};

/**
 * Counterpart to |setInput| for moving the cursor.
 * @param cursor An object shaped like { start: x, end: y }
 */
Terminal.prototype.setCursor = function(cursor) {
  this._caretChange = Caret.NO_CHANGE;
  this._processCaretChange({ typed: this.inputElement.value, cursor: cursor });
};

/**
 * Focus the input element
 */
Terminal.prototype.focus = function() {
  this.inputElement.focus();
  this._checkAssignment();
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Terminal.prototype.onKeyDown = function(ev) {
  if (ev.keyCode === KeyEvent.DOM_VK_UP || ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    ev.preventDefault();
    return;
  }

  // The following keys do not affect the state of the command line so we avoid
  // informing the focusManager about keyboard events that involve these keys
  if (ev.keyCode === KeyEvent.DOM_VK_F1 ||
      ev.keyCode === KeyEvent.DOM_VK_ESCAPE ||
      ev.keyCode === KeyEvent.DOM_VK_UP ||
      ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    return;
  }

  if (this.focusManager) {
    this.focusManager.onInputChange();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB) {
    this.lastTabDownAt = 0;
    if (!ev.shiftKey) {
      ev.preventDefault();
      // Record the timestamp of this TAB down so onKeyUp can distinguish
      // focus from TAB in the CLI.
      this.lastTabDownAt = ev.timeStamp;
    }
    if (ev.metaKey || ev.altKey || ev.crtlKey) {
      if (this.document.commandDispatcher) {
        this.document.commandDispatcher.advanceFocus();
      }
      else {
        this.inputElement.blur();
      }
    }
  }
};

/**
 * Handler for use with DOM events, which just calls the promise enabled
 * handleKeyUp function but checks the exit state of the promise so we know
 * if something went wrong.
 */
Terminal.prototype.onKeyUp = function(ev) {
  this.handleKeyUp(ev).then(null, util.errorHandler);
};

/**
 * The main keyboard processing loop
 * @return A promise that resolves (to undefined) when the actions kicked off
 * by this handler are completed.
 */
Terminal.prototype.handleKeyUp = function(ev) {
  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_F1) {
    this.focusManager.helpRequest();
    return RESOLVED;
  }

  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_ESCAPE) {
    this.focusManager.removeHelp();
    return RESOLVED;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    return this._handleUpArrow();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    return this._handleDownArrow();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    return this._handleReturn();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB && !ev.shiftKey) {
    return this._handleTab(ev);
  }

  if (this._previousValue === this.inputElement.value) {
    return RESOLVED;
  }

  this._scrollingThroughHistory = false;
  this._caretChange = Caret.NO_CHANGE;

  this._completed = this.requisition.update(this.inputElement.value);
  this._previousValue = this.inputElement.value;

  return this._completed.then(function(updated) {
    // Abort UI changes if this UI update has been overtaken
    if (updated) {
      this._choice = null;
      this.choiceChanged({ choice: this._choice });
    }
  }.bind(this));
};

/**
 * See also _handleDownArrow for some symmetry
 */
Terminal.prototype._handleUpArrow = function() {
  if (this.isMenuShowing) {
    this.changeChoice(-1);
    return RESOLVED;
  }

  if (this.inputElement.value === '' || this._scrollingThroughHistory) {
    this._scrollingThroughHistory = true;
    return this.requisition.update(this.history.backward());
  }

  // If the user is on a valid value, then we increment the value, but if
  // they've typed something that's not right we page through predictions
  if (this.assignment.getStatus() === Status.VALID) {
    this.requisition.increment(this.assignment);
    // See notes on focusManager.onInputChange in onKeyDown
    if (this.focusManager) {
      this.focusManager.onInputChange();
    }
  }
  else {
    this.changeChoice(-1);
  }

  return RESOLVED;
};

/**
 * See also _handleUpArrow for some symmetry
 */
Terminal.prototype._handleDownArrow = function() {
  if (this.isMenuShowing) {
    this.changeChoice(+1);
    return RESOLVED;
  }

  if (this.inputElement.value === '' || this._scrollingThroughHistory) {
    this._scrollingThroughHistory = true;
    return this.requisition.update(this.history.forward());
  }

  // See notes above for the UP key
  if (this.assignment.getStatus() === Status.VALID) {
    this.requisition.decrement(this.assignment,
                               this.requisition.executionContext);
    // See notes on focusManager.onInputChange in onKeyDown
    if (this.focusManager) {
      this.focusManager.onInputChange();
    }
  }
  else {
    this.changeChoice(+1);
  }

  return RESOLVED;
};

/**
 * RETURN checks status and might exec
 */
Terminal.prototype._handleReturn = function() {
  // Deny RETURN unless the command might work
  if (this.requisition.status === Status.VALID) {
    this._scrollingThroughHistory = false;
    this.history.add(this.inputElement.value);
    this.requisition.exec();
  }
  else {
    // If we can't execute the command, but there is a menu choice to use
    // then use it.
    if (!this.selectChoice()) {
      this.focusManager.setError(true);
    }
  }

  this._choice = null;
  return RESOLVED;
};

/**
 * Warning: We get TAB events for more than just the user pressing TAB in our
 * input element.
 */
Terminal.prototype._handleTab = function(ev) {
  // Being able to complete 'nothing' is OK if there is some context, but
  // when there is nothing on the command line it just looks bizarre.
  var hasContents = (this.inputElement.value.length > 0);

  // If the TAB keypress took the cursor from another field to this one,
  // then they get the keydown/keypress, and we get the keyup. In this
  // case we don't want to do any completion.
  // If the time of the keydown/keypress of TAB was close (i.e. within
  // 1 second) to the time of the keyup then we assume that we got them
  // both, and do the completion.
  if (hasContents && this.lastTabDownAt + 1000 > ev.timeStamp) {
    // It's possible for TAB to not change the input, in which case the
    // textChanged event will not fire, and the caret move will not be
    // processed. So we check that this is done first
    this._caretChange = Caret.TO_ARG_END;
    var inputState = this.getInputState();
    this._processCaretChange(inputState);

    if (this._choice == null) {
      this._choice = 0;
    }

    // The changes made by complete may happen asynchronously, so after the
    // the call to complete() we should avoid making changes before the end
    // of the event loop
    this._completed = this.requisition.complete(inputState.cursor,
                                                this._choice);
    this._previousValue = this.inputElement.value;
  }
  this.lastTabDownAt = 0;
  this._scrollingThroughHistory = false;

  return this._completed.then(function(updated) {
    // Abort UI changes if this UI update has been overtaken
    if (updated) {
      this._choice = null;
      this.choiceChanged({ choice: this._choice });
    }
  }.bind(this));
};

/**
 * Used by onKeyUp for UP/DOWN to change the current choice from an options
 * menu.
 */
Terminal.prototype.changeChoice = function(amount) {
  if (this._choice == null) {
    this._choice = 0;
  }
  // There's an annoying up is down thing here, the menu is presented
  // with the zeroth index at the top working down, so the UP arrow needs
  // pick the choice below because we're working down
  this._choice += amount;
  this.choiceChanged({ choice: this._choice });
};

/**
 * Pull together an input object, which may include XUL hacks
 */
Terminal.prototype.getInputState = function() {
  var input = {
    typed: this.inputElement.value,
    cursor: {
      start: this.inputElement.selectionStart,
      end: this.inputElement.selectionEnd
    }
  };

  // Workaround for potential XUL bug 676520 where textbox gives incorrect
  // values for its content
  if (input.typed == null) {
    input = { typed: '', cursor: { start: 0, end: 0 } };
  }

  // Workaround for a Bug 717268 (which is really a jsdom bug)
  if (input.cursor.start == null) {
    input.cursor.start = 0;
  }

  return input;
};

/**
 * Bring the completion element up to date with what the requisition says
 */
Terminal.prototype.updateCompletion = function(ev) {
  this.choice = (ev && ev.choice != null) ? ev.choice : 0;

  this._getCompleterTemplateData().then(function(data) {
    var template = this.completerTemplate.cloneNode(true);
    domtemplate.template(template, data, { stack: 'terminal.html#completer' });

    util.clearElement(this.completeElement);
    while (template.hasChildNodes()) {
      this.completeElement.appendChild(template.firstChild);
    }
  }.bind(this));
};

/**
 * Calculate the properties required by the template process for completer.html
 */
Terminal.prototype._getCompleterTemplateData = function() {
  var input = this.getInputState();
  var start = input.cursor.start;

  return this.requisition.getStateData(start, this.choice).then(function(data) {
    // Calculate the statusMarkup required to show wavy lines underneath the
    // input text (like that of an inline spell-checker) which used by the
    // template process for completer.html
    // i.e. s/space/&nbsp/g in the string (for HTML display) and status to an
    // appropriate class name (i.e. lower cased, prefixed with gcli-in-)
    data.statusMarkup.forEach(function(member) {
      member.string = member.string.replace(/ /g, '\u00a0'); // i.e. &nbsp;
      member.className = 'gcli-in-' + member.status.toString().toLowerCase();
    }, this);

    return data;
  });
};

/**
 * The terminal acts on UP/DOWN if there is a menu showing
 */
Object.defineProperty(Terminal.prototype, 'isMenuShowing', {
  get: function() {
    return this.focusManager.isTooltipVisible &&
           this.field != null &&
           this.field.menu != null;
  },
  enumerable: true
});

/**
 * Called whenever the assignment that we're providing help with changes
 */
Terminal.prototype.assignmentChanged = function(ev) {
  this.lastText = this.assignment.arg.text;

  if (this.field) {
    this.field.onFieldChange.remove(this.fieldChanged, this);
    this.field.destroy();
  }

  this.field = fields.getField(this.assignment.param.type, {
    document: this.document,
    name: this.assignment.param.name,
    requisition: this.requisition,
    required: this.assignment.param.isDataRequired,
    named: !this.assignment.param.isPositionalAllowed,
    tooltip: true
  });

  this.focusManager.setImportantFieldFlag(this.field.isImportant);

  this.field.onFieldChange.add(this.fieldChanged, this);
  this.field.setConversion(this.assignment.conversion);

  // Filled in by the template process
  this.errorEle = undefined;
  this.descriptionEle = undefined;

  var contents = this.tooltipTemplate.cloneNode(true);
  domtemplate.template(contents, this, {
    blankNullUndefined: true,
    stack: 'terminal.html#tooltip'
  });

  util.clearElement(this.tooltipElement);
  this.tooltipElement.appendChild(contents);
  this.tooltipElement.style.display = 'block';

  this.field.setMessageElement(this.errorEle);

  this._updatePosition();
};

/**
 * Forward the event to the current field
 */
Terminal.prototype.choiceChanged = function(ev) {
  this.updateCompletion(ev);

  if (this.field && this.field.setChoiceIndex) {
    var conversion = this.assignment.conversion;
    conversion.constrainPredictionIndex(ev.choice).then(function(choice) {
      this.field.setChoiceIndex(choice);
    }.bind(this)).then(null, util.errorHandler);
  }
};

/**
 * Allow the terminal to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if there was a selection to use, false otherwise
 */
Terminal.prototype.selectChoice = function(ev) {
  if (this.field && this.field.selectChoice) {
    return this.field.selectChoice();
  }
  return false;
};

/**
 * Called by the onFieldChange event on the current Field
 */
Terminal.prototype.fieldChanged = function(ev) {
  this.requisition.setAssignment(this.assignment, ev.conversion.arg,
                                 { matchPadding: true });

  var isError = ev.conversion.message != null && ev.conversion.message !== '';
  this.focusManager.setError(isError);

  // Nasty hack, the terminal won't know about the text change yet, so it will
  // get it's calculations wrong. We need to wait until the current set of
  // changes has had a chance to propagate
  this.document.defaultView.setTimeout(function() {
    this.focus();
  }.bind(this), 10);
};

/**
 * Called to move the tooltip to the correct horizontal position
 */
Terminal.prototype._updatePosition = function() {
  var dimensions = this.getDimensionsOfAssignment();

  // 7px is roughly the width of a char
  if (this.panelElement) {
    this.panelElement.style.marginLeft = (dimensions.start * 7 + 15) + 'px';
  }

  this.focusManager.updatePosition(dimensions);
};

/**
 * Returns a object containing 'start' and 'end' properties which identify the
 * number of pixels from the left hand edge of the input element that represent
 * the text portion of the current assignment.
 */
Terminal.prototype.getDimensionsOfAssignment = function() {
  var before = '';
  var assignments = this.requisition.getAssignments(true);
  for (var i = 0; i < assignments.length; i++) {
    if (assignments[i] === this.assignment) {
      break;
    }
    before += assignments[i].toString();
  }
  before += this.assignment.arg.prefix;

  var startChar = before.length;
  before += this.assignment.arg.text;
  var endChar = before.length;

  return { start: startChar, end: endChar };
};

/**
 * The description (displayed at the top of the hint area) should be blank if
 * we're entering the CommandAssignment (because it's obvious) otherwise it's
 * the parameter description.
 */
Object.defineProperty(Terminal.prototype, 'description', {
  get: function() {
    if (this.assignment instanceof CommandAssignment &&
        this.assignment.value == null) {
      return '';
    }

    return this.assignment.param.manual || this.assignment.param.description;
  },
  enumerable: true
});

/**
 * Tweak CSS to show/hide the output
 */
Terminal.prototype.visibilityChanged = function(ev) {
  if (!this.panelElement) {
    return;
  }

  if (ev.tooltipVisible) {
    this.panelElement.classList.remove('gcli-panel-hide');
  }
  else {
    this.panelElement.classList.add('gcli-panel-hide');
  }
  this.scrollToBottom();
};

/**
 * Monitor for new command executions
 */
Terminal.prototype.outputted = function(ev) {
  if (ev.output.hidden) {
    return;
  }

  var view = new OutputView(ev.output, this);
  ev.output.view = view;

  this.displayElement.insertBefore(view.elems.rowin, this.inputElement.parentElement);
  this.displayElement.insertBefore(view.elems.rowout, this.inputElement.parentElement);

  this.scrollToBottom();
};

Terminal.prototype.scrollToBottom = function() {
  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.displayElement.scrollHeight,
                              this.displayElement.clientHeight);
  this.displayElement.scrollTop =
                      scrollHeight - this.displayElement.clientHeight;
};

exports.Terminal = Terminal;


/**
 * Adds a row to the CLI output display
 */
function OutputView(output, terminal) {
  this.output = output;
  this.terminal = terminal;

  this._outputted = this._outputted.bind(this);
  this.url = util.createUrlLookup(module);

  // Elements attached to this by template().
  this.elems = {
    rowin: null,
    rowout: null,
    hide: null,
    show: null,
    duration: null,
    throb: null,
    prompt: null
  };

  // Handle clicks and double clicks to copy and exec commands
  var context = this.terminal.requisition.conversionContext;
  this.onclick = context.update;
  this.ondblclick = context.updateExec;

  var template = this.terminal.outputViewTemplate.cloneNode(true);
  domtemplate.template(template, this, {
    allowEval: true,
    stack: 'terminal.html#outputView'
  });

  this.output.onClose.add(this.closed, this);
  this.output.promise.then(this._outputted);
}

OutputView.prototype.destroy = function() {
  this.output.onClose.remove(this.closed, this);

  this.terminal.displayElement.removeChild(this.elems.rowin);
  this.terminal.displayElement.removeChild(this.elems.rowout);

  this.output = undefined;
  this.terminal = undefined;
  this.url = undefined;
  this.elems = undefined;
};

/**
 * Only display a prompt if there is a command, otherwise, leave blank
 */
Object.defineProperty(OutputView.prototype, 'prompt', {
  get: function() {
    return this.output.canonical ? '\u00bb' : '';
  },
  enumerable: true
});

OutputView.prototype.hideOutput = function(ev) {
  this.elems.rowout.style.display = 'none';
  this.elems.hide.classList.add('cmd_hidden');
  this.elems.show.classList.remove('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.showOutput = function(ev) {
  this.elems.rowout.style.display = 'block';
  this.elems.hide.classList.remove('cmd_hidden');
  this.elems.show.classList.add('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.closed = function(ev) {
  this.destroy();
};

OutputView.prototype._outputted = function() {
  var document = this.elems.rowout.ownerDocument;
  var duration = this.output.duration != null ?
          'completed in ' + (this.output.duration / 1000) + ' sec ' :
          '';
  duration = document.createTextNode(duration);
  this.elems.duration.appendChild(duration);

  if (this.output.completed) {
    this.elems.prompt.classList.add('gcli-row-complete');
  }
  if (this.output.error) {
    this.elems.prompt.classList.add('gcli-row-error');
  }

  util.clearElement(this.elems.rowout);
  var context = this.terminal.requisition.conversionContext;
  this.output.convert('dom', context).then(function(node) {
    util.linksToNewTab(node);
    this.elems.rowout.appendChild(node);

    this.terminal.scrollToBottom();

    this.elems.throb.style.display = this.output.completed ? 'none' : 'block';
  }.bind(this));
};

exports.OutputView = OutputView;


});
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

define('gcli/history', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

/**
 * A History object remembers commands that have been entered in the past and
 * provides an API for accessing them again.
 * See Bug 681340: Search through history (like C-r in bash)?
 */
function History() {
  // This is the actual buffer where previous commands are kept.
  // 'this._buffer[0]' should always be equal the empty string. This is so
  // that when you try to go in to the "future", you will just get an empty
  // command.
  this._buffer = [''];

  // This is an index in to the history buffer which points to where we
  // currently are in the history.
  this._current = 0;
}

/**
 * Avoid memory leaks
 */
History.prototype.destroy = function() {
  this._buffer = undefined;
};

/**
 * Record and save a new command in the history.
 */
History.prototype.add = function(command) {
  this._buffer.splice(1, 0, command);
  this._current = 0;
};

/**
 * Get the next (newer) command from history.
 */
History.prototype.forward = function() {
  if (this._current > 0 ) {
    this._current--;
  }
  return this._buffer[this._current];
};

/**
 * Get the previous (older) item from history.
 */
History.prototype.backward = function() {
  if (this._current < this._buffer.length - 1) {
    this._current++;
  }
  return this._buffer[this._current];
};

exports.History = History;

});
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

define('gcli/ui/focus', ['require', 'exports', 'module' , 'util/util', 'util/l10n', 'gcli/settings'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var l10n = require('util/l10n');
var settings = require('gcli/settings');

/**
 * Record how much help the user wants from the tooltip
 */
var Eagerness = {
  NEVER: 1,
  SOMETIMES: 2,
  ALWAYS: 3
};

/**
 * Export the eagerHelper setting
 */
exports.items = [
  {
    item: 'setting',
    name: 'eagerHelper',
    type: {
      name: 'selection',
      lookup: [
        { name: 'never', value: Eagerness.NEVER },
        { name: 'sometimes', value: Eagerness.SOMETIMES },
        { name: 'always', value: Eagerness.ALWAYS }
      ]
    },
    defaultValue: Eagerness.SOMETIMES,
    description: l10n.lookup('eagerHelperDesc'),
    ignoreTypeDifference: true
  }
];

/**
 * FocusManager solves the problem of tracking focus among a set of nodes.
 * The specific problem we are solving is when the hint element must be visible
 * if either the command line or any of the inputs in the hint element has the
 * focus, and invisible at other times, without hiding and showing the hint
 * element even briefly as the focus changes between them.
 * It does this simply by postponing the hide events by 250ms to see if
 * something else takes focus.
 * @param options Object containing user customization properties, including:
 * - blurDelay (default=150ms)
 * - debug (default=false)
 * @param components Object that links to other UI components. GCLI provided:
 * - document
 * - requisition
 */
function FocusManager(options, components) {
  options = options || {};

  this.document = components.document || document;
  this.requisition = components.requisition;

  this.debug = options.debug || false;
  this.blurDelay = options.blurDelay || 150;
  this.window = this.document.defaultView;

  this.requisition.commandOutputManager.onOutput.add(this._outputted, this);

  this._blurDelayTimeout = null; // Result of setTimeout in delaying a blur
  this._monitoredElements = [];  // See addMonitoredElement()

  this._isError = false;
  this._hasFocus = false;
  this._helpRequested = false;
  this._recentOutput = false;

  this.onVisibilityChange = util.createEvent('FocusManager.onVisibilityChange');

  this._focused = this._focused.bind(this);
  this.document.addEventListener('focus', this._focused, true);

  var eagerHelper = settings.getSetting('eagerHelper');
  eagerHelper.onChange.add(this._eagerHelperChanged, this);

  this.isTooltipVisible = undefined;
  this.isOutputVisible = undefined;
  this._checkShow();
}

/**
 * Avoid memory leaks
 */
FocusManager.prototype.destroy = function() {
  var eagerHelper = settings.getSetting('eagerHelper');
  eagerHelper.onChange.remove(this._eagerHelperChanged, this);

  this.document.removeEventListener('focus', this._focused, true);
  this.requisition.commandOutputManager.onOutput.remove(this._outputted, this);

  for (var i = 0; i < this._monitoredElements.length; i++) {
    var monitor = this._monitoredElements[i];
    console.error('Hanging monitored element: ', monitor.element);

    monitor.element.removeEventListener('focus', monitor.onFocus, true);
    monitor.element.removeEventListener('blur', monitor.onBlur, true);
  }

  if (this._blurDelayTimeout) {
    this.window.clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }

  this._focused = undefined;
  this.document = undefined;
  this.window = undefined;
  this.requisition = undefined;
};

/**
 * The easy way to include an element in the set of things that are part of the
 * aggregate focus. Using [add|remove]MonitoredElement() is a simpler way of
 * option than calling report[Focus|Blur]()
 * @param element The element on which to track focus|blur events
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.addMonitoredElement = function(element, where) {
  if (this.debug) {
    console.log('FocusManager.addMonitoredElement(' + (where || 'unknown') + ')');
  }

  var monitor = {
    element: element,
    where: where,
    onFocus: function() { this._reportFocus(where); }.bind(this),
    onBlur: function() { this._reportBlur(where); }.bind(this)
  };

  element.addEventListener('focus', monitor.onFocus, true);
  element.addEventListener('blur', monitor.onBlur, true);

  if (this.document.activeElement === element) {
    this._reportFocus(where);
  }

  this._monitoredElements.push(monitor);
};

/**
 * Undo the effects of addMonitoredElement()
 * @param element The element to stop tracking
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.removeMonitoredElement = function(element, where) {
  if (this.debug) {
    console.log('FocusManager.removeMonitoredElement(' + (where || 'unknown') + ')');
  }

  var newMonitoredElements = this._monitoredElements.filter(function(monitor) {
    if (monitor.element === element) {
      element.removeEventListener('focus', monitor.onFocus, true);
      element.removeEventListener('blur', monitor.onBlur, true);
      return false;
    }
    return true;
  });

  this._monitoredElements = newMonitoredElements;
};

/**
 * Monitor for new command executions
 */
FocusManager.prototype.updatePosition = function(dimensions) {
  var ev = {
    tooltipVisible: this.isTooltipVisible,
    outputVisible: this.isOutputVisible,
    dimensions: dimensions
  };
  this.onVisibilityChange(ev);
};

/**
 * Monitor for new command executions
 */
FocusManager.prototype._outputted = function(ev) {
  this._recentOutput = true;
  this._helpRequested = false;
  this._checkShow();
};

/**
 * We take a focus event anywhere to be an indication that we might be about
 * to lose focus
 */
FocusManager.prototype._focused = function() {
  this._reportBlur('document');
};

/**
 * Some component has received a 'focus' event. This sets the internal status
 * straight away and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype._reportFocus = function(where) {
  if (this.debug) {
    console.log('FocusManager._reportFocus(' + (where || 'unknown') + ')');
  }

  if (this._blurDelayTimeout) {
    if (this.debug) {
      console.log('FocusManager.cancelBlur');
    }
    this.window.clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }

  if (!this._hasFocus) {
    this._hasFocus = true;
  }
  this._checkShow();
};

/**
 * Some component has received a 'blur' event. This waits for a while to see if
 * we are going to get any subsequent 'focus' events and then sets the internal
 * status and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype._reportBlur = function(where) {
  if (this.debug) {
    console.log('FocusManager._reportBlur(' + where + ')');
  }

  if (this._hasFocus) {
    if (this._blurDelayTimeout) {
      if (this.debug) {
        console.log('FocusManager.blurPending');
      }
      return;
    }

    this._blurDelayTimeout = this.window.setTimeout(function() {
      if (this.debug) {
        console.log('FocusManager.blur');
      }
      this._hasFocus = false;
      this._checkShow();
      this._blurDelayTimeout = null;
    }.bind(this), this.blurDelay);
  }
};

/**
 * The setting has changed
 */
FocusManager.prototype._eagerHelperChanged = function() {
  this._checkShow();
};

/**
 * The terminal tells us about keyboard events so we can decide to delay
 * showing the tooltip element
 */
FocusManager.prototype.onInputChange = function() {
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Generally called for something like a F1 key press, when the user explicitly
 * wants help
 */
FocusManager.prototype.helpRequest = function() {
  if (this.debug) {
    console.log('FocusManager.helpRequest');
  }

  this._helpRequested = true;
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Generally called for something like a ESC key press, when the user explicitly
 * wants to get rid of the help
 */
FocusManager.prototype.removeHelp = function() {
  if (this.debug) {
    console.log('FocusManager.removeHelp');
  }

  this._importantFieldFlag = false;
  this._isError = false;
  this._helpRequested = false;
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Set to true whenever a field thinks it's output is important
 */
FocusManager.prototype.setImportantFieldFlag = function(flag) {
  if (this.debug) {
    console.log('FocusManager.setImportantFieldFlag', flag);
  }
  this._importantFieldFlag = flag;
  this._checkShow();
};

/**
 * Set to true whenever a field thinks it's output is important
 */
FocusManager.prototype.setError = function(isError) {
  if (this.debug) {
    console.log('FocusManager._isError', isError);
  }
  this._isError = isError;
  this._checkShow();
};

/**
 * Helper to compare the current showing state with the value calculated by
 * _shouldShow() and take appropriate action
 */
FocusManager.prototype._checkShow = function() {
  var fire = false;
  var ev = {
    tooltipVisible: this.isTooltipVisible,
    outputVisible: this.isOutputVisible
  };

  var showTooltip = this._shouldShowTooltip();
  if (this.isTooltipVisible !== showTooltip.visible) {
    ev.tooltipVisible = this.isTooltipVisible = showTooltip.visible;
    fire = true;
  }

  var showOutput = this._shouldShowOutput();
  if (this.isOutputVisible !== showOutput.visible) {
    ev.outputVisible = this.isOutputVisible = showOutput.visible;
    fire = true;
  }

  if (fire) {
    if (this.debug) {
      console.log('FocusManager.onVisibilityChange', ev);
    }
    this.onVisibilityChange(ev);
  }
};

/**
 * Calculate if we should be showing or hidden taking into account all the
 * available inputs
 */
FocusManager.prototype._shouldShowTooltip = function() {
  if (!this._hasFocus) {
    return { visible: false, reason: 'notHasFocus' };
  }

  var eagerHelper = settings.getSetting('eagerHelper');
  if (eagerHelper.value === Eagerness.NEVER) {
    return { visible: false, reason: 'eagerHelperNever' };
  }

  if (eagerHelper.value === Eagerness.ALWAYS) {
    return { visible: true, reason: 'eagerHelperAlways' };
  }

  if (this._isError) {
    return { visible: true, reason: 'isError' };
  }

  if (this._helpRequested) {
    return { visible: true, reason: 'helpRequested' };
  }

  if (this._importantFieldFlag) {
    return { visible: true, reason: 'importantFieldFlag' };
  }

  return { visible: false, reason: 'default' };
};

/**
 * Calculate if we should be showing or hidden taking into account all the
 * available inputs
 */
FocusManager.prototype._shouldShowOutput = function() {
  if (!this._hasFocus) {
    return { visible: false, reason: 'notHasFocus' };
  }

  if (this._recentOutput) {
    return { visible: true, reason: 'recentOutput' };
  }

  return { visible: false, reason: 'default' };
};

exports.FocusManager = FocusManager;


});
define("text!gcli/ui/terminal.css", [], "\n" +
  "/* Layout */\n" +
  "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete,\n" +
  ".gcli-prompt,\n" +
  ".gcli-display {\n" +
  "  position: absolute; top: 0; bottom: 0; left: 0; right: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-top {\n" +
  "  position: relative;\n" +
  "}\n" +
  "\n" +
  ".gcli-display {\n" +
  "  height: 100%;\n" +
  "  overflow-x: hidden;\n" +
  "  overflow-y: auto;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete {\n" +
  "  padding: 0;\n" +
  "  background-color: transparent;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input {\n" +
  "  border: 0;\n" +
  "  margin: 0;\n" +
  "  outline: none;\n" +
  "  width: 90%;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-complete {\n" +
  "  color: transparent;\n" +
  "  z-index: -1000;\n" +
  "}\n" +
  "\n" +
  ".gcli-prompt {\n" +
  "  z-index: -1001;\n" +
  "  padding: 0 4px;\n" +
  "}\n" +
  "\n" +
  ".gcli-panel {\n" +
  "  overflow-y: auto;\n" +
  "  overflow-x: hidden;\n" +
  "  z-index: 2;\n" +
  "  max-height: 100%;\n" +
  "  max-width: 350px;\n" +
  "  left: 0;\n" +
  "  bottom: 0;\n" +
  "  margin-bottom: -3px;\n" +
  "}\n" +
  "\n" +
  ".gcli-panel-hide {\n" +
  "  opacity: 0;\n" +
  "  height: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt-description {\n" +
  "  padding: 5px 10px 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt-error {\n" +
  "  padding: 0 10px;\n" +
  "}\n" +
  "\n" +
  ".gcli-field {\n" +
  "  width: 100%;\n" +
  "}\n" +
  "\n" +
  ".gcli-field-javascript {\n" +
  "  margin-bottom: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt {\n" +
  "  margin: 0 0 10px 0;\n" +
  "  padding-bottom: 5px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-in {\n" +
  "  padding: 0 4px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-hover {\n" +
  "  display: none;\n" +
  "  float: right;\n" +
  "  padding: 2px 2px 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-in:hover > .gcli-row-hover {\n" +
  "  display: inline;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-in:hover > .gcli-row-hover.gcli-row-hidden {\n" +
  "  display: none;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out {\n" +
  "  margin: 0 10px 15px;\n" +
  "  padding: 0 10px;\n" +
  "  line-height: 1.2em;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out p {\n" +
  "  margin: 5px 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out input[type=password],\n" +
  ".gcli-row-out input[type=text],\n" +
  ".gcli-row-out textarea {\n" +
  "  background: transparent;\n" +
  "  padding: 3px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out button {\n" +
  "  background-color: transparent;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out table,\n" +
  ".gcli-row-out td,\n" +
  ".gcli-row-out th {\n" +
  "  border: 0;\n" +
  "  padding: 0 2px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-terminal {\n" +
  "  height: 200px;\n" +
  "  width: 620px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-subterminal {\n" +
  "  height: 150px;\n" +
  "  width: 300px;\n" +
  "}\n" +
  "\n" +
  ".gcli-out-shortcut {\n" +
  "  padding: 0 3px 1px;\n" +
  "  margin: 1px 4px;\n" +
  "  display: inline-block;\n" +
  "}\n" +
  "\n" +
  ".gcli-out-shortcut:before {\n" +
  "  content: '\\bb';\n" +
  "  padding-right: 2px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out a {\n" +
  "  text-decoration: none;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out a:hover {\n" +
  "  cursor: pointer;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-in > img {\n" +
  "  cursor: pointer;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out button,\n" +
  ".gcli-out-shortcut {\n" +
  "  cursor: pointer;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-incomplete,\n" +
  ".gcli-in-error {\n" +
  "  border-bottom-width: 1px;\n" +
  "  border-bottom-style: dotted;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out a:hover {\n" +
  "  border-bottom-width: 1px;\n" +
  "  border-bottom-style: dotted;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt {\n" +
  "  border-radius: 5px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out input[type=password],\n" +
  ".gcli-row-out input[type=text],\n" +
  ".gcli-row-out textarea,\n" +
  ".gcli-row-terminal,\n" +
  ".gcli-row-subterminal {\n" +
  "  border-width: 1px;\n" +
  "  border-style: solid;\n" +
  "  border-radius: 3px;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out button,\n" +
  ".gcli-out-shortcut {\n" +
  "  border-width: 1px;\n" +
  "  border-style: solid;\n" +
  "  border-radius: 3px;\n" +
  "}\n" +
  "\n" +
  ".gcli-out-shortcut {\n" +
  "  border-radius: 3px;\n" +
  "}\n" +
  "\n" +
  "\n" +
  "/* Fonts */\n" +
  "\n" +
  "@font-face {\n" +
  "  font-family: 'Source Sans Pro';\n" +
  "  font-style: normal;\n" +
  "  font-weight: 400;\n" +
  "  src: local('Source Sans Pro'), local('SourceSansPro-Regular'), url(http://themes.googleusercontent.com/static/fonts/sourcesanspro/v5/ODelI1aHBYDBqgeIAH2zlNHq-FFgoDNV3GTKpHwuvtI.woff) format('woff');\n" +
  "}\n" +
  "\n" +
  "@font-face {\n" +
  "  font-family: 'Source Sans Pro';\n" +
  "  font-style: normal;\n" +
  "  font-weight: 700;\n" +
  "  src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(http://themes.googleusercontent.com/static/fonts/sourcesanspro/v5/toadOcfmlt9b38dHJxOBGIqjGYJUyOXcBwUQbRaNH6c.woff) format('woff');\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete,\n" +
  ".gcli-prompt,\n" +
  ".gcli-display,\n" +
  ".gcli-panel,\n" +
  ".gcli-row-out button {\n" +
  "  font-family: 'Source Sans Pro', sans-serif;\n" +
  "  font-weight: 400;\n" +
  "}\n" +
  "\n" +
  ".gcli-prompt,\n" +
  ".gcli-row-prompt,\n" +
  ".gcli-out-shortcut:before {\n" +
  "  font-weight: 700;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-top,\n" +
  ".gcli-in-input {\n" +
  "  height: 28px;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete,\n" +
  ".gcli-prompt {\n" +
  "  line-height: 28px;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete {\n" +
  "  padding-left: 16px;\n" +
  "}\n" +
  "\n" +
  ".gcli-prompt,\n" +
  ".gcli-row-prompt {\n" +
  "  font-size: 120%;\n" +
  "}\n" +
  "\n" +
  ".gcli-out-shortcut:before {\n" +
  "  font-size: 110%;\n" +
  "}\n" +
  "\n" +
  ".gcli-in-input,\n" +
  ".gcli-in-complete {\n" +
  "  font-size: 100%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out {\n" +
  "  font-size: 90%;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt-description {\n" +
  "  font-size: 90%;\n" +
  "}\n" +
  "\n" +
  ".gcli-tt-error {\n" +
  "  font-size: 80%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-duration {\n" +
  "  font-size: 80%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-terminal {\n" +
  "  font-size: 80%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-out button,\n" +
  ".gcli-out-shortcut {\n" +
  "  font-size: 80%;\n" +
  "}\n" +
  "\n" +
  ".gcli-row-subterminal {\n" +
  "  font-size: 75%;\n" +
  "}\n" +
  "\n" +
  "\n" +
  "/* Dark Theme */\n" +
  "\n" +
  "body.dark,\n" +
  ".dark .theme-body {\n" +
  "  background: #131c26;\n" +
  "  background-image: url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABYBAMAAACDuy0HAAAAG1BMVEX+/v4BAQH///8KCgoDAwN/f3/19fWAgID8/PzhDwT2AAAACXRSTlMFBQUFBQUFBQWHDtP9AAALwklEQVR4Xg3KOWOyWhAA0Bn2ci57eXEvQY1JCZp8sQTjVoJLTAkaE0swbj/7ve4UB37FLW4q86Lwwlh86J/ASAkpWaj+Krbb31HzH0Kjc2tIl7SADaWbpZBPE5dds6jJNyNdjAyKWqdroIixWRQIY6E/kOY7hIciL/ZfrAO3XP/06AuUJ3mSd/z95OB9vIal0DPlaZWHP7RE6DIXjmKqKkuGr+xNZylOnj1GSlUKvnxZDBOIzTfMe0fJgJ7c/GIIOdUuKxYyBFUOzvY6AC5AXx8R+o5O4S0j0wqBND3ErIYm/XHFbQjtH1MXD5dUbp19OFdjkDlys+HSwrBgHRvL9wVN/pi8ViOIwcv/D1GRW6UuDvJLLQA5lCI17iUdsKYpOuYfMATGnpn/Zs3W6gov51G+/Vs9Ay//we5kh8uwvEPum6o5HkDMDb3ZWunwtq+UzENU8NphDdbvNtKM3knx5gi6UMSQl+eGs+27mraDtxeWdH+T62Us/GylEtr7Ct8jlbeXKvAf5onx8D2uVt1J/GblV+XQyKUInOUG44fqjcszK266yHWAAYG9ekhvy4l4Maa44jYVyV2RFEuS54e2HcswtmNdqR/+V4P0O9e4XnpWgxVSQkNXpYMCxJ4Vel0lmi56jnYIIJAQMndF+zTEiyuj92r3ijJT1O0alPQnLWJvJLR7Xx7Xg9fm9QOqFu8o29m3QQqFwZN4bki/RoprNtMKKtEET9iMsJyKpkiguAorn2yzkv0wG3M1EEVDJP5VN7muLjYCglzdGQ7boYGgRmorzhRDq83gglgylC+hBLEyy6ZQWNwCmmqt6PvExAqGEA9V2XIT4/fS+I2cx1n5td85kOCjHfPWTg72FJ/+vKOyggt+rytFbEDJWL+mPwpgw6HtFLIHmq4o2m1nZ9saKwiKEOTVZtWlnqHODPu949VfKD+zzpfynd/ZZU5IWZ0dgnqRHC4uOBpBsT8N7YbFJzADiW2eo/T979OKFxY8zk/+HR/NNEkzgSBsmA35Sayz1m/ubxgmYQOmffyRh9gdx42mUVX512oqWkfxAzyuSCxx1cywx3jIXuXJEEbssymo0xMy7SskJW9C5IPYroPwQunt7f5FEPPXJLWRbGHcL4Q3sx3TLAN6W672r/I5CKkL6zSwwk0AI8+iBCSv1Y7QQP5RSoLE227uy8vn22Y6dhLBgEsRh18cTGjIv3y+60Kmt3YAZQX8qf3bJDUc/5pdjti+KwAZ9GzzQzd23d1JBAnSvWkWB8YfsIGlspHitNiMPYPFfR+OecRuPyxgfoP9/HkR3cR27IohiaDXCk/3VNP6lIxP9TBnsMeAAUZloq6P8KURLBsNFuiA3LsN/d9qpCeKKIBgSzsN5k+rdh3uh0VbvMuOIomJD1fBOiCqIsvklS5bOQhMaahJC+Rc+6lz+Uvxmq05Py+LoGIQlLKvlcaHsFG9Ui66H/qdHz67sPRGho+ruC92QgN5JEMmLsZREEiJu78FJbyzT8FsdK90XoEcezn2R5iLUzZhczJmf1yNY3gJNJUQvbpTznTAbnV5J8iL4q2OWuhJEndWVTyEr8M5VGTWtvOmUo1DsnOsqXE5ZzKE8K4/8cl8+c1XArp1RUKz+iKP96j2FcUmA+v0HnEr0iUdSrRK5duAj1FQamvpiaXR2JddD6g8n4SyFx/fjT4LkC+ghJckj1e1wP+DrHrpIiMaPH5F1rcaRvwZWfEn6fx+/C7PdXABGLNKjr1USZ5XyHjsafXMEoXtguAfjykMioMMHISXVAc9yQY5o5Qg8MM0nhWCA2HoiEgBc1EH+warLjxH3Ln68M/ciFqI1bG0mBOxiNreOuShEf/9pIzhm1Bh2cbYVxn2IYQ7eljYpab/5EdPF2PSmcy+62j6e2HBPNbe+8JVMuRQBrWdL9uBh4bYbQaQJ07FyfcpCuvSuxUyYjP6avvw9gTcAj0uTVohSwOHDDaHTs8nyachMBcWoVDWp3/lWgqeCLMneAUhSuhD2RJpufLOSi7emxOVhYsOGomV2JCEKjWu7kuqwueyFEmDgVhR0l4oHn8W87UZuxb8id54SxHWiSnPKnMyAhzdhi2wN/AoH3OYwLajuybB8h/QeJJiX1gIt+dfij+gr0CJRXQ2Y04Q6q8xHzfWm9FIgchiW0+X86tIotIGzRG1gENaKokQkLn+FXZ2x3KUcp7d/NUsmOmFCG/i03YB8pi0eiNS4LUIfA06AKvfQmP/VAXS1AP2kzJ+9LAaTafvFyO7bz8U9OCpld2q1eHGts+ZFrt04AmIlubOPP7Xayfi/r0tiX2aaPT9Dz4+TVPBoXsjHDzWfrmawOsZfmBT/k2+c6sz/hvD5wjrjT7XgRlnEzPuZermi1jqfUrE3q7VdFfJu5oT9Ad+VUh1fIwIFhBy8TmMuhIeX2XpmogmvS1C3ZuwiyR87ZSrj0Jv1DpEAYkbcL3RpjZXmZpPV4mXH8z8Nh8CS+R+PpcTnkhyr5UJaSiz0wjK22Ewl+zS+pTug0PQ0CSnJQ5LfdR77vVZufgjkQ/ydf4V5zpEaNq+JZmrQK6WdZBacmMHL9RmLnPUs0/MYwYFzoyrXYQMTHGAUJOfumR5r79MZO28DIEXQVT5wGw99TY1T0GOCC/BzWv8READwICd0LjUNKnE6ORVa0lOnqhoO0v33lwWcwF0ynTgTpFxy+0OKdphNDWJlH8ubKoG6WJXtKxAwbsilpBJB+GBwimvTsCrv1R7LSX9ExkAw44ZEcxU3L50OHnKAyKZNe1fih+hVqItRGCDf7shuvme+lTWteX5oYuc58NrCaqjYIrIV0PFyQeh2ZzZEqNS60LuhnP5wweMkkaU93pDA/RWPNeGpPCBgiUeDvV0L1NfdRP/Hn5i7rUK7kftlIWeIUIYbtzzFl9nlIeaNfoX+x/qyWzIABLTZDbeq/hDZpxg2gkh+ICfSU8OUpJ8yWY17uQ5EGa+GGWFmnrBd9vX3KOteYkJaMpPwJ4TjzDjbhkOMKmWKClzVJ2g81YGFl/c0xPIKncgJGdUKvZoUUJu0gYaIAh6E0xNeQ15qpJXzNITgf4W+w/oUaKOM54EMUi1j5yvOCsEe8JYpwVGj53lNiPMY9Rltgd4icp82fvN69zkSBUI40nJSRTeHz7h1IX42Cr0klWjxjO05MSX1IaTeDmTRGEeKvAvtaaBaLQnjftGJz+4cjFyy6/iCjLGF2/gW+jQhEUxbEBPyQzXi+Bb4kc9wK4jIwNLWbwQAOtYKRLaipDH+X4TPPOG8DCNY4IC9yBk1qcibjhUgRnDcf35pl9d5otbvQjOIXlEu5dVtm5LRaK5KWcD/PX6LaGd25CuNHG/vgeIB1kcpCme+J8idlcjfBALAJSggznsGHGOAJgdGduMnZg+bAaeGASGV9bh/X2wPsVTmBLxmTTQsBGFkEOkZJTsGAm+HrtMDbWwvTXOutX1u7BxIq9Xib6DkFMbUitNdrYsULkahsAhBEh9FjdzL9BNARxTSr7T3u1rE+IWUmCIpwTZHZCu5l9THCuCcOhZqfekuQxjQ7EoyGUJAwCv/q1JOuJeCc/3lknb76zAquO/DAQhK/62cP8X2s3+IBLIhvL8RHopoHpIArJysYTTmMMeubPXh8W760AvMVH67jqgg06+/ne5MZ631z6yROhloh3dPQirZoEpr80wgt/cEbhbAQTmRLtGh8lxCwDBBb5OeJ4aEq25XBNMT2rzWedW2zIzj+CCDKlnlyJBzT81qBWp69h7vlb3TmEV+DNm2rqj1iT7BQuwVVsuPkwq1e5P8tgNjVbIlMzwXeM11kZqjx3KKFOJzc3CAyFVhi8fxVZ5FvhdAM5mM6kS6OgKu16MFglq3/b/QVIwdw7HUCyeW04JPjC5dO+GC9OfqfB4VX+wwuift+ths2Ss3i6nkOE+JFyD+wKFL+WMX6nwwDva0S1/O8Mlnida69Ph96fuFvCoRMvXnCfsLPPmC/hA5RnMNE4fDK0pVOQ4BHLaErzv/wD99ABmjNZk0AAAAABJRU5ErkJggg==\");\n" +
  "}\n" +
  "  .dark .theme-body,\n" +
  "  body.dark,\n" +
  "  .dark .gcli-row-out strong,\n" +
  "  .dark .gcli-row-out b,\n" +
  "  .dark .gcli-row-out th,\n" +
  "  .dark .gcli-row-out h1,\n" +
  "  .dark .gcli-row-out h2,\n" +
  "  .dark .gcli-row-out h3 {\n" +
  "    color: #8fa1b2;\n" +
  "  }\n" +
  "  .dark .gcli-in-input,\n" +
  "  .dark .gcli-row-in-typed,\n" +
  "  .dark .gcli-out-shortcut,\n" +
  "  .dark .gcli-row-out button {\n" +
  "    color: white;\n" +
  "  }\n" +
  "\n" +
  "body.light,\n" +
  ".light .theme-body {\n" +
  "  background: white;\n" +
  "  color: black;\n" +
  "}\n" +
  "  .light .theme-body,\n" +
  "  body.light,\n" +
  "  .light .gcli-row-out strong,\n" +
  "  .light .gcli-row-out b,\n" +
  "  .light .gcli-row-out th,\n" +
  "  .light .gcli-row-out h1,\n" +
  "  .light .gcli-row-out h2,\n" +
  "  .light .gcli-row-out h3 {\n" +
  "    color: #303b47;\n" +
  "  }\n" +
  "  .light .gcli-in-input,\n" +
  "  .light .gcli-row-in-typed,\n" +
  "  .light .gcli-out-shortcut,\n" +
  "  .light .gcli-row-out button {\n" +
  "    color: black;\n" +
  "  }\n" +
  "\n" +
  ".dark ::selection,\n" +
  ".dark ::-moz-selection,\n" +
  ".dark .theme-selected {\n" +
  "  background-color: #26394D;\n" +
  "}\n" +
  "\n" +
  ".light ::selection,\n" +
  ".light ::-moz-selection,\n" +
  ".light .theme-selected {\n" +
  "  background-color: #CCC;\n" +
  "}\n" +
  "\n" +
  ".dark .theme-link,\n" +
  ".dark .gcli-row-out a {\n" +
  "  color: #3689b2; /* blue */\n" +
  "}\n" +
  "\n" +
  ".light .theme-link,\n" +
  ".light .gcli-row-out a {\n" +
  "  color: hsl(208,56%,40%); /* blue */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-comment {\n" +
  "  color: #5c6773; /* grey */\n" +
  "}\n" +
  "\n" +
  ".light .theme-comment {\n" +
  "  color: hsl(90,2%,46%); /* grey */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-gutter {\n" +
  "  background-color: #0f171f;\n" +
  "  color: #667380;\n" +
  "  border-color: #303b47;\n" +
  "}\n" +
  "\n" +
  ".light .theme-gutter {\n" +
  "  background-color: hsl(0,0%,90%);\n" +
  "  color: #667380;\n" +
  "  border-color: hsl(0,0%,65%);\n" +
  "}\n" +
  "\n" +
  ".dark .theme-separator {\n" +
  "  border-color: #303b47; /* grey */\n" +
  "}\n" +
  "\n" +
  ".light .theme-separator {\n" +
  "  border-color: #cddae5; /* grey */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-fg-color1,\n" +
  ".dark .gcli-row-prompt.gcli-row-complete {\n" +
  "  color: #5c9966; /* green */\n" +
  "}\n" +
  "\n" +
  ".light .theme-fg-color1,\n" +
  ".light .gcli-row-prompt.gcli-row-complete {\n" +
  "  color: hsl(72,100%,27%) /* green */;\n" +
  "}\n" +
  "\n" +
  ".dark .theme-fg-color2 {\n" +
  "  color: #3689b2; /* blue */\n" +
  "}\n" +
  "  .dark .gcli-in-ontab {\n" +
  "    color: hsl(211.6, 33.3%, 25%);\n" +
  "  }\n" +
  "\n" +
  ".light .theme-fg-color2,\n" +
  ".light .gcli-in-ontab {\n" +
  "  color: hsl(208,56%,40%); /* blue */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-fg-color3 {\n" +
  "  color: #a673bf; /* pink/lavender */\n" +
  "}\n" +
  "\n" +
  ".light .theme-fg-color3 {\n" +
  "  color: hsl(208,81%,21%) /* dark blue */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-fg-color4,\n" +
  ".dark .gcli-row-prompt {\n" +
  "  color: #6270b2; /* purple/violet */\n" +
  "}\n" +
  "\n" +
  ".light .theme-fg-color4,\n" +
  ".light .gcli-row-prompt {\n" +
  "  color: hsl(24,85%,39%); /* Orange */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-fg-color5 {\n" +
  "  color: #a18650; /* Yellow */\n" +
  "}\n" +
  ".dark .gcli-in-todo {\n" +
  "  color: hsl(211.6, 33.3%, 0%);\n" +
  "}\n" +
  "\n" +
  ".light .theme-fg-color5,\n" +
  ".light .gcli-in-todo {\n" +
  "  color: #a18650; /* Yellow */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-fg-color6,\n" +
  ".dark .gcli-out-shortcut:before {\n" +
  "  color: #b26b47; /* Orange */\n" +
  "}\n" +
  "\n" +
  ".light .theme-fg-color6,\n" +
  ".light .gcli-out-shortcut:before {\n" +
  "  color: hsl(24,85%,39%); /* Orange */\n" +
  "}\n" +
  "\n" +
  ".dark .theme-fg-color7,\n" +
  ".dark .gcli-row-prompt.gcli-row-error {\n" +
  "  color: #bf5656; /* Red */\n" +
  "}\n" +
  "  .dark .gcli-in-error {\n" +
  "    border-bottom-color: #bf5656;\n" +
  "  }\n" +
  "\n" +
  ".light .theme-fg-color7,\n" +
  ".light .gcli-row-prompt.gcli-row-error {\n" +
  "  color: #bf5656; /* Red */\n" +
  "}\n" +
  "  .light .gcli-in-error {\n" +
  "    border-bottom-color: #bf5656;\n" +
  "  }\n" +
  "\n" +
  ".dark .gcli-tt {\n" +
  "  background-color: rgba(0, 0, 0, 0.14);\n" +
  "}\n" +
  "\n" +
  ".light .gcli-tt {\n" +
  "  background-color: rgba(0, 0, 0, 0.1);\n" +
  "}\n" +
  "\n" +
  ".dark .gcli-row-out button,\n" +
  ".dark .gcli-out-shortcut {\n" +
  "  border-color: #333;\n" +
  "}\n" +
  "\n" +
  ".light .gcli-row-out button,\n" +
  ".light .gcli-out-shortcut {\n" +
  "  border-color: #ccc;\n" +
  "}\n" +
  "");

define("text!gcli/ui/terminal.html", [], "\n" +
  "<div>\n" +
  "  <div save=\"${displayElement}\" class=\"gcli-display\">\n" +
  "    <!-- Sub template used for each executed command -->\n" +
  "    <div>\n" +
  "      <!-- The div for the input (i.e. what was typed) -->\n" +
  "      <div class=\"gcli-row-in\" save=\"${elems.rowin}\" aria-live=\"assertive\"\n" +
  "          onclick=\"${onclick}\" ondblclick=\"${ondblclick}\"\n" +
  "          data-command=\"${output.canonical}\">\n" +
  "        <!-- What the user actually typed -->\n" +
  "        <span save=\"${elems.prompt}\" class=\"gcli-row-prompt ${elems.error ? 'gcli-row-error' : ''} ${elems.completed ? 'gcli-row-complete' : ''}\">${prompt}</span>\n" +
  "        <span class=\"gcli-row-in-typed\">${output.typed}</span>\n" +
  "        <!-- The extra details that appear on hover -->\n" +
  "        <span class=\"gcli-row-duration gcli-row-hover theme-comment\" save=\"${elems.duration}\"></span>\n" +
  "        <img style=\"float:right;\" _src=\"${url('images/throbber.gif')}\" save=\"${elems.throb}\"/>\n" +
  "      </div>\n" +
  "      <!-- The div for the command output -->\n" +
  "      <div class=\"gcli-row-out\" aria-live=\"assertive\" save=\"${elems.rowout}\">\n" +
  "      </div>\n" +
  "    </div>\n" +
  "    <div class=\"gcli-in-top\">\n" +
  "      <input save=\"${inputElement}\" class=\"gcli-in-input\" type=\"text\" autofocus=\"autofocus\" spellcheck=\"false\">\n" +
  "      <div save=\"${completeElement}\" class=\"gcli-in-complete\" tabindex=\"-1\" aria-live=\"polite\">\n" +
  "        <!-- Sub template used to show completion -->\n" +
  "        <div>\n" +
  "          <loop foreach=\"member in ${statusMarkup}\">\n" +
  "            <span class=\"${member.className}\">${member.string}</span>\n" +
  "          </loop>\n" +
  "          <span class=\"gcli-in-ontab\">${directTabText}</span>\n" +
  "          <span class=\"gcli-in-todo\" foreach=\"param in ${emptyParameters}\">${param}</span>\n" +
  "          <span class=\"gcli-in-ontab\">${arrowTabText}</span>\n" +
  "          <span class=\"gcli-in-closebrace theme-comment\" if=\"${unclosedJs}\">}</span>\n" +
  "        </div>\n" +
  "      </div>\n" +
  "      <div save=\"${promptElement}\" class=\"gcli-prompt theme-fg-color6\">»</div>\n" +
  "    </div>\n" +
  "    <div save=\"${panelElement}\" class=\"gcli-panel\">\n" +
  "      <div save=\"${tooltipElement}\" class=\"gcli-tooltip\">\n" +
  "        <!-- Sub template used for popup hints -->\n" +
  "        <div class=\"gcli-tt\" aria-live=\"polite\">\n" +
  "          <div save=\"${descriptionEle}\" class=\"gcli-tt-description\">${description}</div>\n" +
  "          ${field.element}\n" +
  "          <div save=\"${errorEle}\" class=\"gcli-tt-error theme-fg-color7\">${assignment.conversion.message}</div>\n" +
  "          <div class=\"gcli-tt-highlight\"></div>\n" +
  "        </div>\n" +
  "      </div>\n" +
  "    </div>\n" +
  "  </div>\n" +
  "</div>\n" +
  "\n" +
  "<!-- Templates are loaded by GCLI using an XML parser which only accepts a\n" +
  "single root node, so this is ignored, but useful for previewing templates -->\n" +
  "<link rel=\"stylesheet\" type=\"text/css\" href=\"terminal.css\"/>\n" +
  "");

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

define('gcli/types/selection', ['require', 'exports', 'module' , 'util/promise', 'util/util', 'util/l10n', 'util/spell', 'gcli/types', 'gcli/argument'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');
var l10n = require('util/l10n');
var spell = require('util/spell');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var BlankArgument = require('gcli/argument').BlankArgument;


/**
 * A selection allows the user to pick a value from known set of options.
 * An option is made up of a name (which is what the user types) and a value
 * (which is passed to exec)
 * @param typeSpec Object containing properties that describe how this
 * selection functions. Properties include:
 * - lookup: An array of objects, one for each option, which contain name and
 *   value properties. lookup can be a function which returns this array
 * - data: An array of strings - alternative to 'lookup' where the valid values
 *   are strings. i.e. there is no mapping between what is typed and the value
 *   that is used by the program
 * - stringifyProperty: Conversion from value to string is generally a process
 *   of looking through all the valid options for a matching value, and using
 *   the associated name. However the name maybe available directly from the
 *   value using a property lookup. Setting 'stringifyProperty' allows
 *   SelectionType to take this shortcut.
 * - cacheable: If lookup is a function, then we normally assume that
 *   the values fetched can change. Setting 'cacheable:true' enables internal
 *   caching.
 * - neverForceAsync: It's useful for testing purposes to be able to force all
 *   selection types to be asynchronous. This flag prevents that happening for
 *   types that are fundamentally synchronous.
 */
function SelectionType(typeSpec) {
  if (typeSpec) {
    Object.keys(typeSpec).forEach(function(key) {
      this[key] = typeSpec[key];
    }, this);
  }
}

SelectionType.prototype = Object.create(Type.prototype);

SelectionType.prototype.stringify = function(value, context) {
  if (value == null) {
    return '';
  }
  if (this.stringifyProperty != null) {
    return value[this.stringifyProperty];
  }

  try {
    var name = null;
    var lookup = util.synchronize(this.getLookup(context));
    lookup.some(function(item) {
      if (item.value === value) {
        name = item.name;
        return true;
      }
      return false;
    }, this);
    return name;
  }
  catch (ex) {
    // Types really need to ensure stringify can happen synchronously
    // which means using stringifyProperty if getLookup is asynchronous, but
    // if this fails we need a bailout ...
    return value.toString();
  }
};

/**
 * If typeSpec contained cacheable:true then calls to parse() work on cached
 * data. clearCache() enables the cache to be cleared.
 */
SelectionType.prototype.clearCache = function() {
  this._cachedLookup = undefined;
};

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 * @return An array of objects with name and value properties.
 */
SelectionType.prototype.getLookup = function(context) {
  if (this._cachedLookup != null) {
    return this._cachedLookup;
  }

  var reply;
  if (this.lookup == null) {
    reply = resolve(this.data, context, this.neverForceAsync).then(dataToLookup);
  }
  else {
    var lookup = (typeof this.lookup === 'function') ?
            this.lookup.bind(this) :
            this.lookup;

    reply = resolve(lookup, context, this.neverForceAsync);
  }

  if (this.cacheable && !forceAsync) {
    this._cachedLookup = reply;
  }

  return reply;
};

var forceAsync = false;

/**
 * Both 'lookup' and 'data' properties (see docs on SelectionType constructor)
 * in addition to being real data can be a function or a promise, or even a
 * function which returns a promise of real data, etc. This takes a thing and
 * returns a promise of actual values.
 */
function resolve(thing, context, neverForceAsync) {
  if (forceAsync && !neverForceAsync) {
    var deferred = promise.defer();
    setTimeout(function() {
      promise.resolve(thing).then(function(resolved) {
        if (typeof resolved === 'function') {
          resolved = resolve(resolved(), neverForceAsync);
        }

        deferred.resolve(resolved);
      });
    }, 500);
    return deferred.promise;
  }

  return promise.resolve(thing).then(function(resolved) {
    if (typeof resolved === 'function') {
      return resolve(resolved(context), context, neverForceAsync);
    }
    return resolved;
  });
}

/**
 * Selection can be provided with either a lookup object (in the 'lookup'
 * property) or an array of strings (in the 'data' property). Internally we
 * always use lookup, so we need a way to convert a 'data' array to a lookup.
 */
function dataToLookup(data) {
  if (!Array.isArray(data)) {
    throw new Error('SelectionType has no lookup or data');
  }

  return data.map(function(option) {
    return { name: option, value: option };
  });
}

/**
 * Return a list of possible completions for the given arg.
 * @param arg The initial input to match
 * @return A trimmed array of string:value pairs
 */
SelectionType.prototype._findPredictions = function(arg, context) {
  return promise.resolve(this.getLookup(context)).then(function(lookup) {
    var predictions = [];
    var i, option;
    var maxPredictions = Conversion.maxPredictions;
    var match = arg.text.toLowerCase();

    // If the arg has a suffix then we're kind of 'done'. Only an exact match
    // will do.
    if (arg.suffix.length > 0) {
      for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
        option = lookup[i];
        if (option.name === arg.text) {
          predictions.push(option);
        }
      }

      return predictions;
    }

    // Cache lower case versions of all the option names
    for (i = 0; i < lookup.length; i++) {
      option = lookup[i];
      if (option._gcliLowerName == null) {
        option._gcliLowerName = option.name.toLowerCase();
      }
    }

    // Exact hidden matches. If 'hidden: true' then we only allow exact matches
    // All the tests after here check that !option.value.hidden
    for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
      option = lookup[i];
      if (option.name === arg.text) {
        predictions.push(option);
      }
    }

    // Start with prefix matching
    for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
      option = lookup[i];
      if (option._gcliLowerName.indexOf(match) === 0 && !option.value.hidden) {
        if (predictions.indexOf(option) === -1) {
          predictions.push(option);
        }
      }
    }

    // Try infix matching if we get less half max matched
    if (predictions.length < (maxPredictions / 2)) {
      for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
        option = lookup[i];
        if (option._gcliLowerName.indexOf(match) !== -1 && !option.value.hidden) {
          if (predictions.indexOf(option) === -1) {
            predictions.push(option);
          }
        }
      }
    }

    // Try fuzzy matching if we don't get a prefix match
    if (predictions.length === 0) {
      var names = [];
      lookup.forEach(function(opt) {
        if (!opt.value.hidden) {
          names.push(opt.name);
        }
      });
      var corrected = spell.correct(match, names);
      if (corrected) {
        lookup.forEach(function(opt) {
          if (opt.name === corrected) {
            predictions.push(opt);
          }
        }, this);
      }
    }

    return predictions;
  }.bind(this));
};

SelectionType.prototype.parse = function(arg, context) {
  return this._findPredictions(arg, context).then(function(predictions) {
    if (predictions.length === 0) {
      var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
      return new Conversion(undefined, arg, Status.ERROR, msg,
                            promise.resolve(predictions));
    }

    if (predictions[0].name === arg.text) {
      var value = predictions[0].value;
      return new Conversion(value, arg, Status.VALID, '',
                            promise.resolve(predictions));
    }

    return new Conversion(undefined, arg, Status.INCOMPLETE, '',
                          promise.resolve(predictions));
  }.bind(this));
};

SelectionType.prototype.getBlank = function(context) {
  var predictFunc = function() {
    return promise.resolve(this.getLookup(context)).then(function(lookup) {
      return lookup.filter(function(option) {
        return !option.value.hidden;
      }).slice(0, Conversion.maxPredictions - 1);
    });
  }.bind(this);

  return new Conversion(undefined, new BlankArgument(), Status.INCOMPLETE, '',
                        predictFunc);
};

/**
 * For selections, up is down and black is white. It's like this, given a list
 * [ a, b, c, d ], it's natural to think that it starts at the top and that
 * going up the list, moves towards 'a'. However 'a' has the lowest index, so
 * for SelectionType, up is down and down is up.
 * Sorry.
 */
SelectionType.prototype.decrement = function(value, context) {
  var lookup = util.synchronize(this.getLookup(context));
  var index = this._findValue(lookup, value);
  if (index === -1) {
    index = 0;
  }
  index++;
  if (index >= lookup.length) {
    index = 0;
  }
  return lookup[index].value;
};

/**
 * See note on SelectionType.decrement()
 */
SelectionType.prototype.increment = function(value, context) {
  var lookup = util.synchronize(this.getLookup(context));
  var index = this._findValue(lookup, value);
  if (index === -1) {
    // For an increment operation when there is nothing to start from, we
    // want to start from the top, i.e. index 0, so the value before we
    // 'increment' (see note above) must be 1.
    index = 1;
  }
  index--;
  if (index < 0) {
    index = lookup.length - 1;
  }
  return lookup[index].value;
};

/**
 * Walk through an array of { name:.., value:... } objects looking for a
 * matching value (using strict equality), returning the matched index (or -1
 * if not found).
 * @param lookup Array of objects with name/value properties to search through
 * @param value The value to search for
 * @return The index at which the match was found, or -1 if no match was found
 */
SelectionType.prototype._findValue = function(lookup, value) {
  var index = -1;
  for (var i = 0; i < lookup.length; i++) {
    var pair = lookup[i];
    if (pair.value === value) {
      index = i;
      break;
    }
  }
  return index;
};

/**
 * SelectionType is designed to be inherited from, so SelectionField needs a way
 * to check if something works like a selection without using 'name'
 */
SelectionType.prototype.isSelection = true;

SelectionType.prototype.name = 'selection';

exports.SelectionType = SelectionType;
exports.items = [ SelectionType ];


});
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

define('util/spell', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

/*
 * A spell-checker based on Damerau-Levenshtein distance.
 */

var CASE_CHANGE_COST = 1;
var INSERTION_COST = 10;
var DELETION_COST = 10;
var SWAP_COST = 10;
var SUBSTITUTION_COST = 20;
var MAX_EDIT_DISTANCE = 40;

/**
 * Compute Damerau-Levenshtein Distance, with a modification to allow a low
 * case-change cost (1/10th of a swap-cost)
 * @see http://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
 */
var distance = exports.distance = function(wordi, wordj) {
  var wordiLen = wordi.length;
  var wordjLen = wordj.length;

  // We only need to store three rows of our dynamic programming matrix.
  // (Without swap, it would have been two.)
  var row0 = new Array(wordiLen+1);
  var row1 = new Array(wordiLen+1);
  var row2 = new Array(wordiLen+1);
  var tmp;

  var i, j;

  // The distance between the empty string and a string of size i is the cost
  // of i insertions.
  for (i = 0; i <= wordiLen; i++) {
    row1[i] = i * INSERTION_COST;
  }

  // Row-by-row, we're computing the edit distance between substrings wordi[0..i]
  // and wordj[0..j].
  for (j = 1; j <= wordjLen; j++) {
    // Edit distance between wordi[0..0] and wordj[0..j] is the cost of j
    // insertions.
    row0[0] = j * INSERTION_COST;

    for (i = 1; i <= wordiLen; i++) {
      // Handle deletion, insertion and substitution: we can reach each cell
      // from three other cells corresponding to those three operations. We
      // want the minimum cost.
      var dc = row0[i - 1] + DELETION_COST;
      var ic = row1[i] + INSERTION_COST;
      var sc0;
      if (wordi[i-1] === wordj[j-1]) {
        sc0 = 0;
      }
      else {
        if (wordi[i-1].toLowerCase() === wordj[j-1].toLowerCase()) {
          sc0 = CASE_CHANGE_COST;
        }
        else {
          sc0 = SUBSTITUTION_COST;
        }
      }
      var sc = row1[i-1] + sc0;

      row0[i] = Math.min(dc, ic, sc);

      // We handle swap too, eg. distance between help and hlep should be 1. If
      // we find such a swap, there's a chance to update row0[1] to be lower.
      if (i > 1 && j > 1 && wordi[i-1] === wordj[j-2] && wordj[j-1] === wordi[i-2]) {
        row0[i] = Math.min(row0[i], row2[i-2] + SWAP_COST);
      }
    }

    tmp = row2;
    row2 = row1;
    row1 = row0;
    row0 = tmp;
  }

  return row1[wordiLen];
};

/**
 * As distance() except that we say that if word is a prefix of name then we
 * only count the case changes. This allows us to use words that can be
 * completed by typing as more likely than short words
 */
var distancePrefix = exports.distancePrefix = function(word, name) {
  var dist = 0;

  for (var i = 0; i < word.length; i++) {
    if (name[i] !== word[i]) {
      if (name[i].toLowerCase() === word[i].toLowerCase()) {
        dist++;
      }
      else {
        // name does not start with word, even ignoring case, use
        // Damerau-Levenshtein
        return exports.distance(word, name);
      }
    }
  }

  return dist;
};

/**
 * A function that returns the correction for the specified word.
 */
exports.correct = function(word, names) {
  if (names.length === 0) {
    return undefined;
  }

  var distances = {};
  var sortedCandidates;

  names.forEach(function(candidate) {
    distances[candidate] = exports.distance(word, candidate);
  });

  sortedCandidates = names.sort(function(worda, wordb) {
    if (distances[worda] !== distances[wordb]) {
      return distances[worda] - distances[wordb];
    }
    else {
      // if the score is the same, always return the first string
      // in the lexicographical order
      return worda < wordb;
    }
  });

  if (distances[sortedCandidates[0]] <= MAX_EDIT_DISTANCE) {
    return sortedCandidates[0];
  }
  else {
    return undefined;
  }
};

/**
 * Return a ranked list of matches:
 *
 *   spell.rank('fred', [ 'banana', 'fred', 'ed', 'red' ]);
 *     ↓
 *   [
 *      { name: 'fred', dist: 0 },
 *      { name: 'red', dist: 1 },
 *      { name: 'ed', dist: 2 },
 *      { name: 'banana', dist: 10 },
 *   ]
 *
 * @param word The string that we're comparing names against
 * @param names An array of strings to compare word against
 * @param options Comparison options:
 * - noSort: Do not sort the output by distance
 * - prefixZero: Count prefix matches as edit distance 0 (i.e. word='bana' and
 *   names=['banana'], would return { name:'banana': dist: 0 }) This is useful
 *   if someone is typing the matches and may not have finished yet
 */
exports.rank = function(word, names, options) {
  options = options || {};

  var reply = names.map(function(name) {
    // If any name starts with the word then the distance is based on the
    // number of case changes rather than Damerau-Levenshtein
    var algo = options.prefixZero ? distancePrefix : distance;
    return {
      name: name,
      dist: algo(word, name)
    };
  });

  if (!options.noSort) {
    reply = reply.sort(function(d1, d2) {
      return d1.dist - d2.dist;
    });
  }

  return reply;
};


});
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

define('gcli/types/delegate', ['require', 'exports', 'module' , 'util/promise', 'gcli/types'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var Conversion = require('gcli/types').Conversion;

/**
 * A type for "we don't know right now, but hope to soon"
 */
var delegate = {
  item: 'type',
  name: 'delegate',

  constructor: function() {
    if (typeof this.delegateType !== 'function') {
      throw new Error('Instances of DelegateType need typeSpec.delegateType' +
                      ' to be a function that returns a type');
    }
  },

  // Child types should implement this method to return an instance of the type
  // that should be used. If no type is available, or some sort of temporary
  // placeholder is required, BlankType can be used.
  delegateType: function(context) {
    throw new Error('Not implemented');
  },

  stringify: function(value, context) {
    return this.delegateType(context).stringify(value, context);
  },

  parse: function(arg, context) {
    return this.delegateType(context).parse(arg, context);
  },

  decrement: function(value, context) {
    var delegated = this.delegateType(context);
    return (delegated.decrement ? delegated.decrement(value, context) : undefined);
  },

  increment: function(value, context) {
    var delegated = this.delegateType(context);
    return (delegated.increment ? delegated.increment(value, context) : undefined);
  },

  getType: function(context) {
    return this.delegateType(context);
  },

  // DelegateType is designed to be inherited from, so DelegateField needs a way
  // to check if something works like a delegate without using 'name'
  isDelegate: true,
};

Object.defineProperty(delegate, 'isImportant', {
  get: function() {
    return this.delegateType().isImportant;
  },
  enumerable: true
});

/**
 * 'blank' is a type for use with DelegateType when we don't know yet.
 * It should not be used anywhere else.
 */
var blank = {
  item: 'type',
  name: 'blank',

  stringify: function(value, context) {
    return '';
  },

  parse: function(arg, context) {
    return promise.resolve(new Conversion(undefined, arg));
  }
};

/**
 * The types we expose for registration
 */
exports.items = [ delegate, blank ];


});
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

define('gcli/types/array', ['require', 'exports', 'module' , 'util/promise', 'gcli/types', 'gcli/argument'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var types = require('gcli/types');
var ArrayConversion = require('gcli/types').ArrayConversion;
var ArrayArgument = require('gcli/argument').ArrayArgument;

exports.items = [
  {
    // A set of objects of the same type
    item: 'type',
    name: 'array',
    subtype: undefined,

    constructor: function() {
      if (!this.subtype) {
        console.error('Array.typeSpec is missing subtype. Assuming string.' +
            this.name);
        this.subtype = 'string';
      }
      this.subtype = types.createType(this.subtype);
    },

    stringify: function(values, context) {
      if (values == null) {
        return '';
      }
      // BUG 664204: Check for strings with spaces and add quotes
      return values.join(' ');
    },

    parse: function(arg, context) {
      if (arg.type !== 'ArrayArgument') {
        console.error('non ArrayArgument to ArrayType.parse', arg);
        throw new Error('non ArrayArgument to ArrayType.parse');
      }

      // Parse an argument to a conversion
      // Hack alert. ArrayConversion needs to be able to answer questions about
      // the status of individual conversions in addition to the overall state.
      // |subArg.conversion| allows us to do that easily.
      var subArgParse = function(subArg) {
        return this.subtype.parse(subArg, context).then(function(conversion) {
          subArg.conversion = conversion;
          return conversion;
        }.bind(this));
      }.bind(this);

      var conversionPromises = arg.getArguments().map(subArgParse);
      return promise.all(conversionPromises).then(function(conversions) {
        return new ArrayConversion(conversions, arg);
      });
    },

    getBlank: function() {
      return new ArrayConversion([], new ArrayArgument());
    }
  },
];


});
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

define('gcli/types/boolean', ['require', 'exports', 'module' , 'util/promise', 'gcli/types', 'gcli/types/selection', 'gcli/argument'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var SelectionType = require('gcli/types/selection').SelectionType;

var BlankArgument = require('gcli/argument').BlankArgument;

exports.items = [
  {
    // 'boolean' type
    item: 'type',
    name: 'boolean',
    parent: 'selection',

    lookup: [
      { name: 'false', value: false },
      { name: 'true', value: true }
    ],

    parse: function(arg, context) {
      if (arg.type === 'TrueNamedArgument') {
        return promise.resolve(new Conversion(true, arg));
      }
      if (arg.type === 'FalseNamedArgument') {
        return promise.resolve(new Conversion(false, arg));
      }
      return SelectionType.prototype.parse.call(this, arg, context);
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return '' + value;
    },

    getBlank: function(context) {
      return new Conversion(false, new BlankArgument(), Status.VALID, '',
                            promise.resolve(this.lookup));
    }
  }
];


});
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

define('gcli/types/command', ['require', 'exports', 'module' , 'util/promise', 'util/l10n', 'util/spell', 'gcli/canon', 'gcli/types/selection', 'gcli/types'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var l10n = require('util/l10n');
var spell = require('util/spell');
var canon = require('gcli/canon');
var SelectionType = require('gcli/types/selection').SelectionType;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;

exports.items = [
  {
    // Select from the available parameters to a command
    item: 'type',
    name: 'param',
    parent: 'selection',
    stringifyProperty: 'name',
    neverForceAsync: true,
    requisition: undefined,
    isIncompleteName: undefined,

    lookup: function() {
      var displayedParams = [];
      var command = this.requisition.commandAssignment.value;
      if (command != null) {
        command.params.forEach(function(param) {
          var arg = this.requisition.getAssignment(param.name).arg;
          if (!param.isPositionalAllowed && arg.type === 'BlankArgument') {
            displayedParams.push({ name: '--' + param.name, value: param });
          }
        }, this);
      }
      return displayedParams;
    },

    parse: function(arg, context) {
      if (this.isIncompleteName) {
        return SelectionType.prototype.parse.call(this, arg, context);
      }
      else {
        var message = l10n.lookup('cliUnusedArg');
        return promise.resolve(new Conversion(undefined, arg, Status.ERROR, message));
      }
    }
  },
  {
    // Select from the available commands
    // This is very similar to a SelectionType, however the level of hackery in
    // SelectionType to make it handle Commands correctly was to high, so we
    // simplified.
    // If you are making changes to this code, you should check there too.
    item: 'type',
    name: 'command',
    parent: 'selection',
    stringifyProperty: 'name',
    neverForceAsync: true,
    allowNonExec: true,

    lookup: function() {
      var commands = canon.getCommands();
      commands.sort(function(c1, c2) {
        return c1.name.localeCompare(c2.name);
      });
      return commands.map(function(command) {
        return { name: command.name, value: command };
      }, this);
    },

    parse: function(arg, context) {
      // Helper function - Commands like 'context' work best with parent
      // commands which are not executable. However obviously to execute a
      // command, it needs an exec function.
      var execWhereNeeded = function(command) {
        return this.allowNonExec || typeof command.exec === 'function';
      }.bind(this);

      var command = canon.getCommand(arg.text);

      // Predictions live over the time that things change so we provide a
      // completion function rather than completion values
      var predictFunc = function() {
        return this._findPredictions(arg).then(function(predictions) {
          // If it's an exact match of an executable command (rather than just
          // the only possibility) then we don't want alternatives
          if (command && command.name === arg.text &&
              execWhereNeeded(command) && predictions.length === 1) {
            return [];
          }

          return predictions;
        }.bind(this));
      }.bind(this);

      if (command) {
        var status = execWhereNeeded(command) ? Status.VALID : Status.INCOMPLETE;
        var conversion = new Conversion(command, arg, status, '', predictFunc);
        return promise.resolve(conversion);
      }

      return this._findPredictions(arg).then(function(predictions) {
        if (predictions.length === 0) {
          var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
          return new Conversion(undefined, arg, Status.ERROR, msg, predictFunc);
        }

        command = predictions[0].value;

        if (predictions.length === 1) {
          // Is it an exact match of an executable command,
          // or just the only possibility?
          if (command.name === arg.text && execWhereNeeded(command)) {
            return new Conversion(command, arg, Status.VALID, '');
          }

          return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
        }

        // It's valid if the text matches, even if there are several options
        if (predictions[0].name === arg.text) {
          return new Conversion(command, arg, Status.VALID, '', predictFunc);
        }

        return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
      }.bind(this));
    },

    _findPredictions: function(arg, context) {
      return promise.resolve(this.getLookup(context)).then(function(lookup) {
        var predictions = [];
        var i, option;
        var maxPredictions = Conversion.maxPredictions;
        var match = arg.text.toLowerCase();

        // Add an option to our list of predicted options
        var addToPredictions = function(option) {
          if (arg.text.length === 0) {
            // If someone hasn't typed anything, we only show top level commands in
            // the menu. i.e. sub-commands (those with a space in their name) are
            // excluded. We do this to keep the list at an overview level.
            if (option.name.indexOf(' ') === -1) {
              predictions.push(option);
            }
          }
          else {
            // If someone has typed something, then we exclude parent commands
            // (those without an exec). We do this because the user is drilling
            // down and doesn't need the summary level.
            if (option.value.exec != null) {
              predictions.push(option);
            }
          }
        };

        // If the arg has a suffix then we're kind of 'done'. Only an exact
        // match will do.
        if (arg.suffix.match(/ +/)) {
          for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
            option = lookup[i];
            if (option.name === arg.text ||
                option.name.indexOf(arg.text + ' ') === 0) {
              addToPredictions(option);
            }
          }

          return predictions;
        }

        // Cache lower case versions of all the option names
        for (i = 0; i < lookup.length; i++) {
          option = lookup[i];
          if (option._gcliLowerName == null) {
            option._gcliLowerName = option.name.toLowerCase();
          }
        }

        // Exact hidden matches. If 'hidden: true' then we only allow exact matches
        // All the tests after here check that !option.value.hidden
        for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
          option = lookup[i];
          if (option.name === arg.text) {
            addToPredictions(option);
          }
        }

        // Start with prefix matching
        for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
          option = lookup[i];
          if (option._gcliLowerName.indexOf(match) === 0 && !option.value.hidden) {
            if (predictions.indexOf(option) === -1) {
              addToPredictions(option);
            }
          }
        }

        // Try infix matching if we get less half max matched
        if (predictions.length < (maxPredictions / 2)) {
          for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
            option = lookup[i];
            if (option._gcliLowerName.indexOf(match) !== -1 && !option.value.hidden) {
              if (predictions.indexOf(option) === -1) {
                addToPredictions(option);
              }
            }
          }
        }

        // Try fuzzy matching if we don't get a prefix match
        if (predictions.length === 0) {
          var names = [];
          lookup.forEach(function(opt) {
            if (!opt.value.hidden) {
              names.push(opt.name);
            }
          });
          var corrected = spell.correct(match, names);
          if (corrected) {
            lookup.forEach(function(opt) {
              if (opt.name === corrected) {
                predictions.push(opt);
              }
            }, this);
          }
        }

        return predictions;
      }.bind(this));
    }
  }
];

});
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

define('gcli/types/date', ['require', 'exports', 'module' , 'util/promise', 'util/l10n', 'gcli/types'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var l10n = require('util/l10n');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;

/**
 * Helper for stringify() to left pad a single digit number with a single '0'
 * so 1 -> '01', 42 -> '42', etc.
 */
function pad(number) {
  var r = String(number);
  return r.length === 1 ? '0' + r : r;
}

/**
 * Utility to convert a string to a date, throwing if the date can't be
 * parsed rather than having an invalid date
 */
function toDate(str) {
  var millis = Date.parse(str);
  if (isNaN(millis)) {
    throw new Error(l10n.lookupFormat('typesDateNan', [ str ]));
  }
  return new Date(millis);
}

/**
 * Is |thing| a valid date?
 * @see http://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
 */
function isDate(thing) {
  return Object.prototype.toString.call(thing) === '[object Date]'
          && !isNaN(thing.getTime());
}

exports.items = [
  {
    // ECMA 5.1 §15.9.1.1
    // @see http://stackoverflow.com/questions/11526504/minimum-and-maximum-date
    item: 'type',
    name: 'date',
    step: 1,
    min: new Date(-8640000000000000),
    max: new Date(8640000000000000),

    constructor: function() {
      if (this.min != null) {
        if (typeof this.min === 'string') {
          this.min = toDate(this.min);
        }
        else if (isDate(this.min) || typeof this.min === 'function') {
          this.min = this.min;
        }
        else {
          throw new Error('date min value must be one of string/date/function');
        }
      }

      if (this.max != null) {
        if (typeof this.max === 'string') {
          this.max = toDate(this.max);
        }
        else if (isDate(this.max) || typeof this.max === 'function') {
          this.max = this.max;
        }
        else {
          throw new Error('date max value must be one of string/date/function');
        }
      }
    },

    stringify: function(value, context) {
      if (!isDate(value)) {
        return '';
      }

      var str = pad(value.getFullYear()) + '-' +
                pad(value.getMonth() + 1) + '-' +
                pad(value.getDate());

      // Only add in the time if it's not midnight
      if (value.getHours() !== 0 || value.getMinutes() !== 0 ||
          value.getSeconds() !== 0 || value.getMilliseconds() !== 0) {

        // What string should we use to separate the date from the time?
        // There are 3 options:
        // 'T': This is the standard from ISO8601. i.e. 2013-05-20T11:05
        //      The good news - it's a standard. The bad news - it's weird and
        //      alien to many if not most users
        // ' ': This looks nicest, but needs escaping (which GCLI will do
        //      automatically) so it would look like: '2013-05-20 11:05'
        //      Good news: looks best, bad news: on completion we place the
        //      cursor after the final ', breaking repeated increment/decrement
        // '\ ': It's possible that we could find a way to use a \ to escape
        //      the space, so the output would look like: 2013-05-20\ 11:05
        //      This would involve changes to a number of parts, and is
        //      probably too complex a solution for this problem for now
        // In the short term I'm going for ' ', and raising the priority of
        // cursor positioning on actions like increment/decrement/tab.

        str += ' ' + pad(value.getHours());
        str += ':' + pad(value.getMinutes());

        // Only add in seconds/milliseconds if there is anything to report
        if (value.getSeconds() !== 0 || value.getMilliseconds() !== 0) {
          str += ':' + pad(value.getSeconds());
          if (value.getMilliseconds() !== 0) {
            var milliVal = (value.getUTCMilliseconds() / 1000).toFixed(3);
            str += '.' + String(milliVal).slice(2, 5);
          }
        }
      }

      return str;
    },

    getMax: function(context) {
      if (typeof this.max === 'function') {
        return this._max(context);
      }
      if (isDate(this.max)) {
        return this.max;
      }
      return undefined;
    },

    getMin: function(context) {
      if (typeof this.min === 'function') {
        return this._min(context);
      }
      if (isDate(this.min)) {
        return this.min;
      }
      return undefined;
    },

    parse: function(arg, context) {
      var value;

      if (arg.text.replace(/\s/g, '').length === 0) {
        return promise.resolve(new Conversion(undefined, arg, Status.INCOMPLETE, ''));
      }

      // Lots of room for improvement here: 1h ago, in two days, etc.
      // Should "1h ago" dynamically update the step?
      if (arg.text.toLowerCase() === 'now' ||
          arg.text.toLowerCase() === 'today') {
        value = new Date();
      }
      else if (arg.text.toLowerCase() === 'yesterday') {
        value = new Date();
        value.setDate(value.getDate() - 1);
      }
      else if (arg.text.toLowerCase() === 'tomorrow') {
        value = new Date();
        value.setDate(value.getDate() + 1);
      }
      else {
        // So now actual date parsing.
        // Javascript dates are a mess. Like the default date libraries in most
        // common languages, but with added browser weirdness.
        // There is an argument for saying that the user will expect dates to
        // be formatted as JavaScript dates, except that JS dates are of
        // themselves very unexpected.
        // See http://blog.dygraphs.com/2012/03/javascript-and-dates-what-mess.html

        // The timezone used by Date.parse depends on whether or not the string
        // can be interpreted as ISO-8601, so "2000-01-01" is not the same as
        // "2000/01/01" (unless your TZ aligns with UTC) because the first is
        // ISO-8601 and therefore assumed to be UTC, where the latter is
        // assumed to be in the local timezone.

        // First, if the user explicitly includes a 'Z' timezone marker, then
        // we assume they know what they are doing with timezones. ISO-8601
        // uses 'Z' as a marker for 'Zulu time', zero hours offset i.e. UTC
        if (arg.text.indexOf('Z') !== -1) {
          value = new Date(arg.text);
        }
        else {
          // Now we don't want the browser to assume ISO-8601 and therefore use
          // UTC so we replace the '-' with '/'
          value = new Date(arg.text.replace(/-/g, '/'));
        }

        if (isNaN(value.getTime())) {
          var msg = l10n.lookupFormat('typesDateNan', [ arg.text ]);
          return promise.resolve(new Conversion(undefined, arg, Status.ERROR, msg));
        }
      }

      return promise.resolve(new Conversion(value, arg));
    },

    decrement: function(value, context) {
      if (!isDate(value)) {
        return new Date();
      }

      var newValue = new Date(value);
      newValue.setDate(value.getDate() - this.step);

      if (newValue >= this.getMin(context)) {
        return newValue;
      }
      else {
        return this.getMin(context);
      }
    },

    increment: function(value, context) {
      if (!isDate(value)) {
        return new Date();
      }

      var newValue = new Date(value);
      newValue.setDate(value.getDate() + this.step);

      if (newValue <= this.getMax(context)) {
        return newValue;
      }
      else {
        return this.getMax();
      }
    }
  }
];


});
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

define('gcli/types/file', ['require', 'exports', 'module' , 'gcli/types/fileparser', 'gcli/types'], function(require, exports, module) {

'use strict';

/*
 * The file type is a bit of a spiders-web, but there isn't a nice solution
 * yet. The core of the problem is that the modules used by Firefox and NodeJS
 * intersect with the modules used by the web, but not each other. Except here.
 * So we have to do something fancy to get the sharing but not mess up the web.
 *
 * This file requires 'gcli/types/fileparser', and there are 4 implementations
 * of this:
 * - '/lib/gcli/types/fileparser.js', the default web version that uses XHR to
 *   talk to the node server
 * - '/lib/server/gcli/types/fileparser.js', an NodeJS stub, and ...
 * - '/mozilla/gcli/types/fileparser.js', the Firefox implementation both of
 *   these are shims which import
 * - 'util/fileparser', which does the real work, except the actual file access
 *
 * The file access comes from the 'util/filesystem' module, and there are 2
 * implementations of this:
 * - '/lib/server/util/filesystem.js', which uses NodeJS APIs
 * - '/mozilla/util/filesystem.js', which uses OS.File APIs
 */

var fileparser = require('gcli/types/fileparser');
var Conversion = require('gcli/types').Conversion;

exports.items = [
  {
    item: 'type',
    name: 'file',

    filetype: 'any',    // One of 'file', 'directory', 'any'
    existing: 'maybe',  // Should be one of 'yes', 'no', 'maybe'
    matches: undefined, // RegExp to match the file part of the path

    isSelection: true,  // It's not really a selection, but acts like one

    constructor: function() {
      if (this.filetype !== 'any' && this.filetype !== 'file' &&
          this.filetype !== 'directory') {
        throw new Error('filetype must be one of [any|file|directory]');
      }

      if (this.existing !== 'yes' && this.existing !== 'no' &&
          this.existing !== 'maybe') {
        throw new Error('existing must be one of [yes|no|maybe]');
      }
    },

    stringify: function(file) {
      if (file == null) {
        return '';
      }

      return file.toString();
    },

    parse: function(arg, context) {
      var options = {
        filetype: this.filetype,
        existing: this.existing,
        matches: this.matches
      };
      var promise = fileparser.parse(arg.text, options);

      return promise.then(function(reply) {
        return new Conversion(reply.value, arg, reply.status,
                              reply.message, reply.predictor);
      });
    }
  }
];

});
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

define('gcli/types/fileparser', ['require', 'exports', 'module' , 'util/xhr', 'util/promise', 'gcli/types'], function(require, exports, module) {

'use strict';

var xhr = require('util/xhr');
var promise = require('util/promise');
var Status = require('gcli/types').Status;

/**
 * Helper for the parse() function from the file type.
 * @param typed i.e. arg.text, the string typed by the user
 * @param options An object describing what type of file is expected:
 * - filetype: One of 'file', 'directory', 'any'
 * - existing: Should be one of 'yes', 'no', 'maybe'
 * - matches: RegExp to match the file part of the path
 * @return An object that describes the results of the parse, to help the file
 * type create a Conversion object. Returned properties are:
 * - value: The parsed type, while we are just using strings for file values,
 *          this will be equal to 'typed' (if status=VALID, undefined otherwise)
 * - status: A Status value (i.e. VALID, INCOMPLETE, ERROR)
 * - message: Message explaining any errors to the user,
 * - predictor: A function with no parameters that returns a promise of an
 *              array of prediction objects, each of which contains a 'name'
 *              and can contain a boolean 'complete' property
 */
exports.parse = function(typed, options) {
  var data = {
    typed: typed,
    filetype: options.filetype,
    existing: options.existing,
    matches: options.matches == null ? undefined : options.matches.source
  };

  return xhr.post('/filesystem/parse', data).then(function(reply) {

    reply.status = Status.fromString(reply.status);
    if (reply.predictions != null) {
      reply.predictor = function() {
        return promise.resolve(reply.predictions);
      };
    }
    return reply;
  });
};

});
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

define('util/xhr', ['require', 'exports', 'module' , 'util/promise', 'util/util'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');

/**
 * Internal helper to send JSON to a url via XHR and return the JSON reply in a
 * promise.
 */
exports.post = function(url, data) {
  var deferred = promise.defer();

  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

  xhr.onreadystatechange = function(event) {
    if (xhr.readyState === 4) {
      if (xhr.status >= 300 || xhr.status < 200) {
        deferred.reject({
          data: xhr.responseText,
          code: xhr.status
        });
      }
      else {
        var output = JSON.parse(xhr.responseText);
        deferred.resolve(output);
      }
    }
  }.bind(this);

  xhr.send(JSON.stringify(data));

  return deferred.promise;
};

/**
 * Counterpart to POST above that takes JSON-able data from a promise and
 * sends it across XHR
 */
exports.sendReply = function(dataPromise, res) {
  var onResolve = function(data) {
    var text = stringify(data);
    res.send(text);
  };

  var onReject = function(data) {
    if (data.code == null) {
      util.errorHandler(data);
      data = {
        code: -1,
        data: stringify(data)
      };
    }
    var text = stringify(data);
    res.status(500).send(text);
  };

  return dataPromise.then(onResolve).then(null, onReject);
};

/**
 * A wrapper around JSON.stringify to fail gracefully
 */
function stringify(data) {
  try {
    return JSON.stringify(data);
  }
  catch (ex) {
    console.error('Failed to JSON.stringify', data);
    util.errorHandler(ex);

    data = {
      code: -1,
      data: ex.toString()
    };
    return JSON.stringify(data);
  }
}

});
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

define('gcli/types/javascript', ['require', 'exports', 'module' , 'util/promise', 'util/l10n', 'gcli/types'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var l10n = require('util/l10n');
var types = require('gcli/types');

var Conversion = types.Conversion;
var Type = types.Type;
var Status = types.Status;

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var globalObject;
if (typeof window !== 'undefined') {
  globalObject = window;
}

/**
 * Setter for the object against which JavaScript completions happen
 */
exports.setGlobalObject = function(obj) {
  globalObject = obj;
};

/**
 * Getter for the object against which JavaScript completions happen, for use
 * in testing
 */
exports.getGlobalObject = function() {
  return globalObject;
};

/**
 * Remove registration of object against which JavaScript completions happen
 */
exports.unsetGlobalObject = function() {
  globalObject = undefined;
};


/**
 * 'javascript' handles scripted input
 */
function JavascriptType(typeSpec) {
}

JavascriptType.prototype = Object.create(Type.prototype);

JavascriptType.prototype.stringify = function(value, context) {
  if (value == null) {
    return '';
  }
  return value;
};

/**
 * When sorting out completions, there is no point in displaying millions of
 * matches - this the number of matches that we aim for
 */
JavascriptType.MAX_COMPLETION_MATCHES = 10;

JavascriptType.prototype.parse = function(arg, context) {
  var typed = arg.text;
  var scope = globalObject;

  // No input is undefined
  if (typed === '') {
    return promise.resolve(new Conversion(undefined, arg, Status.INCOMPLETE));
  }
  // Just accept numbers
  if (!isNaN(parseFloat(typed)) && isFinite(typed)) {
    return promise.resolve(new Conversion(typed, arg));
  }
  // Just accept constants like true/false/null/etc
  if (typed.trim().match(/(null|undefined|NaN|Infinity|true|false)/)) {
    return promise.resolve(new Conversion(typed, arg));
  }

  // Analyze the input text and find the beginning of the last part that
  // should be completed.
  var beginning = this._findCompletionBeginning(typed);

  // There was an error analyzing the string.
  if (beginning.err) {
    return promise.resolve(new Conversion(typed, arg, Status.ERROR, beginning.err));
  }

  // If the current state is ParseState.COMPLEX, then we can't do completion.
  // so bail out now
  if (beginning.state === ParseState.COMPLEX) {
    return promise.resolve(new Conversion(typed, arg));
  }

  // If the current state is not ParseState.NORMAL, then we are inside of a
  // string which means that no completion is possible.
  if (beginning.state !== ParseState.NORMAL) {
    return promise.resolve(new Conversion(typed, arg, Status.INCOMPLETE, ''));
  }

  var completionPart = typed.substring(beginning.startPos);
  var properties = completionPart.split('.');
  var matchProp;
  var prop;

  if (properties.length > 1) {
    matchProp = properties.pop().trimLeft();
    for (var i = 0; i < properties.length; i++) {
      prop = properties[i].trim();

      // We can't complete on null.foo, so bail out
      if (scope == null) {
        return promise.resolve(new Conversion(typed, arg, Status.ERROR,
                                        l10n.lookup('jstypeParseScope')));
      }

      if (prop === '') {
        return promise.resolve(new Conversion(typed, arg, Status.INCOMPLETE, ''));
      }

      // Check if prop is a getter function on 'scope'. Functions can change
      // other stuff so we can't execute them to get the next object. Stop here.
      if (this._isSafeProperty(scope, prop)) {
        return promise.resolve(new Conversion(typed, arg));
      }

      try {
        scope = scope[prop];
      }
      catch (ex) {
        // It would be nice to be able to report this error in some way but
        // as it can happen just when someone types '{sessionStorage.', it
        // almost doesn't really count as an error, so we ignore it
        return promise.resolve(new Conversion(typed, arg, Status.VALID, ''));
      }
    }
  }
  else {
    matchProp = properties[0].trimLeft();
  }

  // If the reason we just stopped adjusting the scope was a non-simple string,
  // then we're not sure if the input is valid or invalid, so accept it
  if (prop && !prop.match(/^[0-9A-Za-z]*$/)) {
    return promise.resolve(new Conversion(typed, arg));
  }

  // However if the prop was a simple string, it is an error
  if (scope == null) {
    var msg = l10n.lookupFormat('jstypeParseMissing', [ prop ]);
    return promise.resolve(new Conversion(typed, arg, Status.ERROR, msg));
  }

  // If the thing we're looking for isn't a simple string, then we're not going
  // to find it, but we're not sure if it's valid or invalid, so accept it
  if (!matchProp.match(/^[0-9A-Za-z]*$/)) {
    return promise.resolve(new Conversion(typed, arg));
  }

  // Skip Iterators and Generators.
  if (this._isIteratorOrGenerator(scope)) {
    return promise.resolve(new Conversion(typed, arg));
  }

  var matchLen = matchProp.length;
  var prefix = matchLen === 0 ? typed : typed.slice(0, -matchLen);
  var status = Status.INCOMPLETE;
  var message = '';

  // We really want an array of matches (for sorting) but it's easier to
  // detect existing members if we're using a map initially
  var matches = {};

  // We only display a maximum of MAX_COMPLETION_MATCHES, so there is no point
  // in digging up the prototype chain for matches that we're never going to
  // use. Initially look for matches directly on the object itself and then
  // look up the chain to find more
  var distUpPrototypeChain = 0;
  var root = scope;
  try {
    while (root != null &&
        Object.keys(matches).length < JavascriptType.MAX_COMPLETION_MATCHES) {

      Object.keys(root).forEach(function(property) {
        // Only add matching properties. Also, as we're walking up the
        // prototype chain, properties on 'higher' prototypes don't override
        // similarly named properties lower down
        if (property.indexOf(matchProp) === 0 && !(property in matches)) {
          matches[property] = {
            prop: property,
            distUpPrototypeChain: distUpPrototypeChain
          };
        }
      });

      distUpPrototypeChain++;
      root = Object.getPrototypeOf(root);
    }
  }
  catch (ex) {
    return promise.resolve(new Conversion(typed, arg, Status.INCOMPLETE, ''));
  }

  // Convert to an array for sorting, and while we're at it, note if we got
  // an exact match so we know that this input is valid
  matches = Object.keys(matches).map(function(property) {
    if (property === matchProp) {
      status = Status.VALID;
    }
    return matches[property];
  });

  // The sort keys are:
  // - Being on the object itself, not in the prototype chain
  // - The lack of existence of a vendor prefix
  // - The name
  matches.sort(function(m1, m2) {
    if (m1.distUpPrototypeChain !== m2.distUpPrototypeChain) {
      return m1.distUpPrototypeChain - m2.distUpPrototypeChain;
    }
    // Push all vendor prefixes to the bottom of the list
    return isVendorPrefixed(m1.prop) ?
      (isVendorPrefixed(m2.prop) ? m1.prop.localeCompare(m2.prop) : 1) :
      (isVendorPrefixed(m2.prop) ? -1 : m1.prop.localeCompare(m2.prop));
  });

  // Trim to size. There is a bug for doing a better job of finding matches
  // (bug 682694), but in the mean time there is a performance problem
  // associated with creating a large number of DOM nodes that few people will
  // ever read, so trim ...
  if (matches.length > JavascriptType.MAX_COMPLETION_MATCHES) {
    matches = matches.slice(0, JavascriptType.MAX_COMPLETION_MATCHES - 1);
  }

  // Decorate the matches with:
  // - a description
  // - a value (for the menu) and,
  // - an incomplete flag which reports if we should assume that the user isn't
  //   going to carry on the JS expression with this input so far
  var predictions = matches.map(function(match) {
    var description;
    var incomplete = true;

    if (this._isSafeProperty(scope, match.prop)) {
      description = '(property getter)';
    }
    else {
      try {
        var value = scope[match.prop];

        if (typeof value === 'function') {
          description = '(function)';
        }
        else if (typeof value === 'boolean' || typeof value === 'number') {
          description = '= ' + value;
          incomplete = false;
        }
        else if (typeof value === 'string') {
          if (value.length > 40) {
            value = value.substring(0, 37) + '…';
          }
          description = '= \'' + value + '\'';
          incomplete = false;
        }
        else {
          description = '(' + typeof value + ')';
        }
      }
      catch (ex) {
        description = '(' + l10n.lookup('jstypeParseError') + ')';
      }
    }

    return {
      name: prefix + match.prop,
      value: {
        name: prefix + match.prop,
        description: description
      },
      description: description,
      incomplete: incomplete
    };
  }, this);

  if (predictions.length === 0) {
    status = Status.ERROR;
    message = l10n.lookupFormat('jstypeParseMissing', [ matchProp ]);
  }

  // If the match is the only one possible, and its VALID, predict nothing
  if (predictions.length === 1 && status === Status.VALID) {
    predictions = [];
  }

  return promise.resolve(new Conversion(typed, arg, status, message,
                                  promise.resolve(predictions)));
};

/**
 * Does the given property have a prefix that indicates that it is vendor
 * specific?
 */
function isVendorPrefixed(name) {
  return name.indexOf('moz') === 0 ||
         name.indexOf('webkit') === 0 ||
         name.indexOf('ms') === 0;
}

/**
 * Constants used in return value of _findCompletionBeginning()
 */
var ParseState = {
  /**
   * We have simple input like window.foo, without any punctuation that makes
   * completion prediction be confusing or wrong
   */
  NORMAL: 0,

  /**
   * The cursor is in some Javascript that makes completion hard to predict,
   * like console.log(
   */
  COMPLEX: 1,

  /**
   * The cursor is inside single quotes (')
   */
  QUOTE: 2,

  /**
   * The cursor is inside single quotes (")
   */
  DQUOTE: 3
};

var OPEN_BODY = '{[('.split('');
var CLOSE_BODY = '}])'.split('');
var OPEN_CLOSE_BODY = {
  '{': '}',
  '[': ']',
  '(': ')'
};

/**
 * How we distinguish between simple and complex JS input. We attempt
 * completion against simple JS.
 */
var simpleChars = /[a-zA-Z0-9.]/;

/**
 * Analyzes a given string to find the last statement that is interesting for
 * later completion.
 * @param text A string to analyze
 * @return If there was an error in the string detected, then a object like
 *   { err: 'ErrorMesssage' }
 * is returned, otherwise a object like
 *   {
 *     state: ParseState.NORMAL|ParseState.QUOTE|ParseState.DQUOTE,
 *     startPos: index of where the last statement begins
 *   }
 */
JavascriptType.prototype._findCompletionBeginning = function(text) {
  var bodyStack = [];

  var state = ParseState.NORMAL;
  var start = 0;
  var c;
  var complex = false;

  for (var i = 0; i < text.length; i++) {
    c = text[i];
    if (!simpleChars.test(c)) {
      complex = true;
    }

    switch (state) {
      // Normal JS state.
      case ParseState.NORMAL:
        if (c === '"') {
          state = ParseState.DQUOTE;
        }
        else if (c === '\'') {
          state = ParseState.QUOTE;
        }
        else if (c === ';') {
          start = i + 1;
        }
        else if (c === ' ') {
          start = i + 1;
        }
        else if (OPEN_BODY.indexOf(c) != -1) {
          bodyStack.push({
            token: c,
            start: start
          });
          start = i + 1;
        }
        else if (CLOSE_BODY.indexOf(c) != -1) {
          var last = bodyStack.pop();
          if (!last || OPEN_CLOSE_BODY[last.token] != c) {
            return { err: l10n.lookup('jstypeBeginSyntax') };
          }
          if (c === '}') {
            start = i + 1;
          }
          else {
            start = last.start;
          }
        }
        break;

      // Double quote state > " <
      case ParseState.DQUOTE:
        if (c === '\\') {
          i ++;
        }
        else if (c === '\n') {
          return { err: l10n.lookup('jstypeBeginUnterm') };
        }
        else if (c === '"') {
          state = ParseState.NORMAL;
        }
        break;

      // Single quote state > ' <
      case ParseState.QUOTE:
        if (c === '\\') {
          i ++;
        }
        else if (c === '\n') {
          return { err: l10n.lookup('jstypeBeginUnterm') };
        }
        else if (c === '\'') {
          state = ParseState.NORMAL;
        }
        break;
    }
  }

  if (state === ParseState.NORMAL && complex) {
    state = ParseState.COMPLEX;
  }

  return {
    state: state,
    startPos: start
  };
};

/**
 * Return true if the passed object is either an iterator or a generator, and
 * false otherwise
 * @param obj The object to check
 */
JavascriptType.prototype._isIteratorOrGenerator = function(obj) {
  if (obj === null) {
    return false;
  }

  if (typeof aObject === 'object') {
    if (typeof obj.__iterator__ === 'function' ||
        obj.constructor && obj.constructor.name === 'Iterator') {
      return true;
    }

    try {
      var str = obj.toString();
      if (typeof obj.next === 'function' &&
          str.indexOf('[object Generator') === 0) {
        return true;
      }
    }
    catch (ex) {
      // window.history.next throws in the typeof check above.
      return false;
    }
  }

  return false;
};

/**
 * Would calling 'scope[prop]' cause the invocation of a non-native (i.e. user
 * defined) function property?
 * Since calling functions can have side effects, it's only safe to do that if
 * explicitly requested, rather than because we're trying things out for the
 * purposes of completion.
 */
JavascriptType.prototype._isSafeProperty = function(scope, prop) {
  if (typeof scope !== 'object') {
    return false;
  }

  // Walk up the prototype chain of 'scope' looking for a property descriptor
  // for 'prop'
  var propDesc;
  while (scope) {
    try {
      propDesc = Object.getOwnPropertyDescriptor(scope, prop);
      if (propDesc) {
        break;
      }
    }
    catch (ex) {
      // Native getters throw here. See bug 520882.
      if (ex.name === 'NS_ERROR_XPC_BAD_CONVERT_JS' ||
          ex.name === 'NS_ERROR_XPC_BAD_OP_ON_WN_PROTO') {
        return false;
      }
      return true;
    }
    scope = Object.getPrototypeOf(scope);
  }

  if (!propDesc) {
    return false;
  }

  if (!propDesc.get) {
    return false;
  }

  // The property is safe if 'get' isn't a function or if the function has a
  // prototype (in which case it's native)
  return typeof propDesc.get !== 'function' || 'prototype' in propDesc.get;
};

JavascriptType.prototype.name = 'javascript';

exports.items = [ JavascriptType ];


});
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

define('gcli/types/node', ['require', 'exports', 'module' , 'util/promise', 'util/host', 'util/l10n', 'util/util', 'gcli/types', 'gcli/argument'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var Highlighter = require('util/host').Highlighter;
var l10n = require('util/l10n');
var util = require('util/util');
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var BlankArgument = require('gcli/argument').BlankArgument;


/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var doc;
if (typeof document !== 'undefined') {
  doc = document;
}

/**
 * For testing only.
 * The fake empty NodeList used when there are no matches, we replace this with
 * something that looks better as soon as we have a document, so not only
 * should you not use this, but you shouldn't cache it either.
 */
exports._empty = [];

/**
 * Setter for the document that contains the nodes we're matching
 */
exports.setDocument = function(document) {
  doc = document;
  if (doc != null) {
    exports._empty = util.createEmptyNodeList(doc);
  }
};

/**
 * Undo the effects of setDocument()
 */
exports.unsetDocument = function() {
  doc = undefined;
  exports._empty = undefined;
};

/**
 * Getter for the document that contains the nodes we're matching
 * Most for changing things back to how they were for unit testing
 */
exports.getDocument = function() {
  return doc;
};

/**
 * Helper functions to be attached to the prototypes of NodeType and
 * NodeListType to allow terminal to tell us which nodes should be highlighted
 */
function onEnter(assignment) {
  assignment.highlighter = new Highlighter(doc);
  assignment.highlighter.nodelist = assignment.conversion.matches;
}

/** @see #onEnter() */
function onLeave(assignment) {
  if (!assignment.highlighter) {
    return;
  }

  assignment.highlighter.destroy();
  delete assignment.highlighter;
}
/** @see #onEnter() */
function onChange(assignment) {
  if (assignment.conversion.matches == null) {
    return;
  }
  if (!assignment.highlighter) {
    return;
  }

  assignment.highlighter.nodelist = assignment.conversion.matches;
}

/**
 * The exported 'node' and 'nodelist' types
 */
exports.items = [
  {
    // The 'node' type is a CSS expression that refers to a single node
    item: 'type',
    name: 'node',

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return value.__gcliQuery || 'Error';
    },

    parse: function(arg, context) {
      var reply;

      if (arg.text === '') {
        reply = new Conversion(undefined, arg, Status.INCOMPLETE);
        reply.matches = util.createEmptyNodeList(doc);
      }
      else {
        var nodes;
        try {
          nodes = doc.querySelectorAll(arg.text);
          if (nodes.length === 0) {
            reply = new Conversion(undefined, arg, Status.INCOMPLETE,
                                   l10n.lookup('nodeParseNone'));
          }
          else if (nodes.length === 1) {
            var node = nodes.item(0);
            node.__gcliQuery = arg.text;

            reply = new Conversion(node, arg, Status.VALID, '');
          }
          else {
            var msg = l10n.lookupFormat('nodeParseMultiple', [ nodes.length ]);
            reply = new Conversion(undefined, arg, Status.ERROR, msg);
          }

          reply.matches = nodes;
        }
        catch (ex) {
          reply = new Conversion(undefined, arg, Status.ERROR,
                                 l10n.lookup('nodeParseSyntax'));
        }
      }

      return promise.resolve(reply);
    },

    onEnter: onEnter,
    onLeave: onLeave,
    onChange: onChange
  },
  {
    // The 'nodelist' type is a CSS expression that refers to a node list
    item: 'type',
    name: 'nodelist',

    // The 'allowEmpty' option ensures that we do not complain if the entered
    // CSS selector is valid, but does not match any nodes. There is some
    // overlap between this option and 'defaultValue'. What the user wants, in
    // most cases, would be to use 'defaultText' (i.e. what is typed rather than
    // the value that it represents). However this isn't a concept that exists
    // yet and should probably be a part of GCLI if/when it does.
    // All NodeListTypes have an automatic defaultValue of an empty NodeList so
    // they can easily be used in named parameters.
    allowEmpty: false,

    constructor: function() {
      if (typeof this.allowEmpty !== 'boolean') {
        throw new Error('Legal values for allowEmpty are [true|false]');
      }
    },

    getBlank: function(context) {
      return new Conversion(exports._empty, new BlankArgument(), Status.VALID);
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return value.__gcliQuery || 'Error';
    },

    parse: function(arg, context) {
      var reply;
      try {
        if (arg.text === '') {
          reply = new Conversion(undefined, arg, Status.INCOMPLETE);
          reply.matches = util.createEmptyNodeList(doc);
        }
        else {
          var nodes = doc.querySelectorAll(arg.text);

          if (nodes.length === 0 && !this.allowEmpty) {
            reply = new Conversion(undefined, arg, Status.INCOMPLETE,
                                   l10n.lookup('nodeParseNone'));
          }
          else {
            reply = new Conversion(nodes, arg, Status.VALID, '');
          }

          reply.matches = nodes;
        }
      }
      catch (ex) {
        reply = new Conversion(undefined, arg, Status.ERROR,
                               l10n.lookup('nodeParseSyntax'));
        reply.matches = util.createEmptyNodeList(doc);
      }

      return promise.resolve(reply);
    },

    onEnter: onEnter,
    onLeave: onLeave,
    onChange: onChange
  }
];

});
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

define('util/host', ['require', 'exports', 'module' , 'util/xhr', 'util/util'], function(require, exports, module) {

'use strict';

var xhr = require('util/xhr');
var util = require('util/util');

var ATTR_NAME = '__gcli_border';
var HIGHLIGHT_STYLE = '1px dashed black';

function Highlighter(document) {
  this._document = document;
  this._nodes = util.createEmptyNodeList(this._document);
}

Object.defineProperty(Highlighter.prototype, 'nodelist', {
  set: function(nodes) {
    Array.prototype.forEach.call(this._nodes, this._unhighlightNode, this);
    this._nodes = (nodes == null) ?
        util.createEmptyNodeList(this._document) :
        nodes;
    Array.prototype.forEach.call(this._nodes, this._highlightNode, this);
  },
  get: function() {
    return this._nodes;
  },
  enumerable: true
});

Highlighter.prototype.destroy = function() {
  this.nodelist = null;
};

Highlighter.prototype._highlightNode = function(node) {
  if (node.hasAttribute(ATTR_NAME)) {
    return;
  }

  var styles = this._document.defaultView.getComputedStyle(node);
  node.setAttribute(ATTR_NAME, styles.border);
  node.style.border = HIGHLIGHT_STYLE;
};

Highlighter.prototype._unhighlightNode = function(node) {
  var previous = node.getAttribute(ATTR_NAME);
  node.style.border = previous;
  node.removeAttribute(ATTR_NAME);
};

exports.Highlighter = Highlighter;


/**
 * Helper to execute an arbitrary OS-level command.
 * @param execSpec Object containing some of the following properties:
 * - cmd (string): The command to execute (required)
 * - args (string[]): The arguments to pass to the command (default: [])
 * - cwd (string): The current working directory
 * - env (object): A map of properties to append to the default environment
 * @return A promise of an object containing the following properties:
 * - data (string): The text of the output from the command
 * - code (number): The exit code of the command
 */
exports.exec = function(execSpec) {
  // Make sure we're only sending strings across XHR
  var cleanArgs = (execSpec.args || []).map(function(arg) {
    return '' + arg;
  });
  var cleanEnv = Object.keys(execSpec.env || {}).reduce(function(prev, key) {
    prev[key] = '' + execSpec.env[key];
    return prev;
  }, {});

  var data = JSON.stringify({
    cmd: '' + execSpec.cmd,
    args: cleanArgs,
    cwd: '' + execSpec.cwd,
    env: cleanEnv
  });

  return xhr.post('/exec', data);
};


});
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

define('gcli/types/number', ['require', 'exports', 'module' , 'util/promise', 'util/l10n', 'gcli/types'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var l10n = require('util/l10n');
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;

exports.items = [
  {
    // 'number' type
    // Has custom max / min / step values to control increment and decrement
    // and a boolean allowFloat property to clamp values to integers
    item: 'type',
    name: 'number',
    allowFloat: false,
    max: undefined,
    min: undefined,
    step: 1,

    constructor: function() {
      if (!this.allowFloat &&
          (this._isFloat(this.min) ||
           this._isFloat(this.max) ||
           this._isFloat(this.step))) {
        throw new Error('allowFloat is false, but non-integer values given in type spec');
      }
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return '' + value;
    },

    getMin: function(context) {
      if (this.min) {
        if (typeof this.min === 'function') {
          return this.min(context);
        }
        if (typeof this.min === 'number') {
          return this.min;
        }
      }
      return undefined;
    },

    getMax: function(context) {
      if (this.max) {
        if (typeof this.max === 'function') {
          return this.max(context);
        }
        if (typeof this.max === 'number') {
          return this.max;
        }
      }
      return undefined;
    },

    parse: function(arg, context) {
      var msg;
      if (arg.text.replace(/^\s*-?/, '').length === 0) {
        return promise.resolve(new Conversion(undefined, arg, Status.INCOMPLETE, ''));
      }

      if (!this.allowFloat && (arg.text.indexOf('.') !== -1)) {
        msg = l10n.lookupFormat('typesNumberNotInt2', [ arg.text ]);
        return promise.resolve(new Conversion(undefined, arg, Status.ERROR, msg));
      }

      var value;
      if (this.allowFloat) {
        value = parseFloat(arg.text);
      }
      else {
        value = parseInt(arg.text, 10);
      }

      if (isNaN(value)) {
        msg = l10n.lookupFormat('typesNumberNan', [ arg.text ]);
        return promise.resolve(new Conversion(undefined, arg, Status.ERROR, msg));
      }

      var max = this.getMax(context);
      if (max != null && value > max) {
        msg = l10n.lookupFormat('typesNumberMax', [ value, max ]);
        return promise.resolve(new Conversion(undefined, arg, Status.ERROR, msg));
      }

      var min = this.getMin(context);
      if (min != null && value < min) {
        msg = l10n.lookupFormat('typesNumberMin', [ value, min ]);
        return promise.resolve(new Conversion(undefined, arg, Status.ERROR, msg));
      }

      return promise.resolve(new Conversion(value, arg));
    },

    decrement: function(value, context) {
      if (typeof value !== 'number' || isNaN(value)) {
        return this.getMax(context) || 1;
      }
      var newValue = value - this.step;
      // Snap to the nearest incremental of the step
      newValue = Math.ceil(newValue / this.step) * this.step;
      return this._boundsCheck(newValue, context);
    },

    increment: function(value, context) {
      if (typeof value !== 'number' || isNaN(value)) {
        var min = this.getMin(context);
        return min != null ? min : 0;
      }
      var newValue = value + this.step;
      // Snap to the nearest incremental of the step
      newValue = Math.floor(newValue / this.step) * this.step;
      if (this.getMax(context) == null) {
        return newValue;
      }
      return this._boundsCheck(newValue, context);
    },

    // Return the input value so long as it is within the max/min bounds.
    // If it is lower than the minimum, return the minimum. If it is bigger
    // than the maximum then return the maximum.
    _boundsCheck: function(value, context) {
      var min = this.getMin(context);
      if (min != null && value < min) {
        return min;
      }
      var max = this.getMax(context);
      if (max != null && value > max) {
        return max;
      }
      return value;
    },

    // Return true if the given value is a finite number and not an integer,
    // else return false.
    _isFloat: function(value) {
      return ((typeof value === 'number') && isFinite(value) && (value % 1 !== 0));
    }
  }
];


});
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

define('gcli/types/resource', ['require', 'exports', 'module' , 'util/promise', 'gcli/types/selection'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var SelectionType = require('gcli/types/selection').SelectionType;


exports.clearResourceCache = function() {
  ResourceCache.clear();
};

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var doc;
if (typeof document !== 'undefined') {
  doc = document;
}

/**
 * Setter for the document that contains the nodes we're matching
 */
exports.setDocument = function(document) {
  doc = document;
};

/**
 * Undo the effects of setDocument()
 */
exports.unsetDocument = function() {
  ResourceCache.clear();
  doc = undefined;
};

/**
 * Getter for the document that contains the nodes we're matching
 * Most for changing things back to how they were for unit testing
 */
exports.getDocument = function() {
  return doc;
};

/**
 * Resources are bits of CSS and JavaScript that the page either includes
 * directly or as a result of reading some remote resource.
 * Resource should not be used directly, but instead through a sub-class like
 * CssResource or ScriptResource.
 */
function Resource(name, type, inline, element) {
  this.name = name;
  this.type = type;
  this.inline = inline;
  this.element = element;
}

/**
 * Get the contents of the given resource as a string.
 * The base Resource leaves this unimplemented.
 */
Resource.prototype.getContents = function() {
  throw new Error('not implemented');
};

Resource.TYPE_SCRIPT = 'text/javascript';
Resource.TYPE_CSS = 'text/css';

/**
 * A CssResource provides an implementation of Resource that works for both
 * [style] elements and [link type='text/css'] elements in the [head].
 */
function CssResource(domSheet) {
  this.name = domSheet.href;
  if (!this.name) {
    this.name = domSheet.ownerNode.id ?
            'css#' + domSheet.ownerNode.id :
            'inline-css';
  }

  this.inline = (domSheet.href == null);
  this.type = Resource.TYPE_CSS;
  this.element = domSheet;
}

CssResource.prototype = Object.create(Resource.prototype);

CssResource.prototype.loadContents = function(callback) {
  callback(this.element.ownerNode.innerHTML);
};

CssResource._getAllStyles = function() {
  var resources = [];
  if (doc == null) {
    return resources;
  }

  Array.prototype.forEach.call(doc.styleSheets, function(domSheet) {
    CssResource._getStyle(domSheet, resources);
  });

  dedupe(resources, function(clones) {
    for (var i = 0; i < clones.length; i++) {
      clones[i].name = clones[i].name + '-' + i;
    }
  });

  return resources;
};

CssResource._getStyle = function(domSheet, resources) {
  var resource = ResourceCache.get(domSheet);
  if (!resource) {
    resource = new CssResource(domSheet);
    ResourceCache.add(domSheet, resource);
  }
  resources.push(resource);

  // Look for imported stylesheets
  try {
    Array.prototype.forEach.call(domSheet.cssRules, function(domRule) {
      if (domRule.type == CSSRule.IMPORT_RULE && domRule.styleSheet) {
        CssResource._getStyle(domRule.styleSheet, resources);
      }
    }, this);
  }
  catch (ex) {
    // For system stylesheets
  }
};

/**
 * A ScriptResource provides an implementation of Resource that works for
 * [script] elements (both with a src attribute, and used directly).
 */
function ScriptResource(scriptNode) {
  this.name = scriptNode.src;
  if (!this.name) {
    this.name = scriptNode.id ?
            'script#' + scriptNode.id :
            'inline-script';
  }

  this.inline = (scriptNode.src === '' || scriptNode.src == null);
  this.type = Resource.TYPE_SCRIPT;
  this.element = scriptNode;
}

ScriptResource.prototype = Object.create(Resource.prototype);

ScriptResource.prototype.loadContents = function(callback) {
  if (this.inline) {
    callback(this.element.innerHTML);
  }
  else {
    // It would be good if there was a better way to get the script source
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== xhr.DONE) {
        return;
      }
      callback(xhr.responseText);
    };
    xhr.open('GET', this.element.src, true);
    xhr.send();
  }
};

ScriptResource._getAllScripts = function() {
  if (doc == null) {
    return [];
  }

  var scriptNodes = doc.querySelectorAll('script');
  var resources = Array.prototype.map.call(scriptNodes, function(scriptNode) {
    var resource = ResourceCache.get(scriptNode);
    if (!resource) {
      resource = new ScriptResource(scriptNode);
      ResourceCache.add(scriptNode, resource);
    }
    return resource;
  });

  dedupe(resources, function(clones) {
    for (var i = 0; i < clones.length; i++) {
      clones[i].name = clones[i].name + '-' + i;
    }
  });

  return resources;
};

/**
 * Find resources with the same name, and call onDupe to change the names
 */
function dedupe(resources, onDupe) {
  // first create a map of name->[array of resources with same name]
  var names = {};
  resources.forEach(function(scriptResource) {
    if (names[scriptResource.name] == null) {
      names[scriptResource.name] = [];
    }
    names[scriptResource.name].push(scriptResource);
  });

  // Call the de-dupe function for each set of dupes
  Object.keys(names).forEach(function(name) {
    var clones = names[name];
    if (clones.length > 1) {
      onDupe(clones);
    }
  });
}

/**
 * A quick cache of resources against nodes
 * TODO: Potential memory leak when the target document has css or script
 * resources repeatedly added and removed. Solution might be to use a weak
 * hash map or some such.
 */
var ResourceCache = {
  _cached: [],

  /**
   * Do we already have a resource that was created for the given node
   */
  get: function(node) {
    for (var i = 0; i < ResourceCache._cached.length; i++) {
      if (ResourceCache._cached[i].node === node) {
        return ResourceCache._cached[i].resource;
      }
    }
    return null;
  },

  /**
   * Add a resource for a given node
   */
  add: function(node, resource) {
    ResourceCache._cached.push({ node: node, resource: resource });
  },

  /**
   * Drop all cache entries. Helpful to prevent memory leaks
   */
  clear: function() {
    ResourceCache._cached = [];
  }
};

/**
 * The resource type itself
 */
exports.items = [
  {
    item: 'type',
    constructor: function() {
      if (this.include !== Resource.TYPE_SCRIPT &&
          this.include !== Resource.TYPE_CSS &&
          this.include != null) {
        throw new Error('invalid include property: ' + this.include);
      }
    },
    name: 'resource',
    parent: 'selection',
    include: null,
    cacheable: false,
    lookup: function() {
      var resources = [];
      if (this.include !== Resource.TYPE_SCRIPT) {
        Array.prototype.push.apply(resources, CssResource._getAllStyles());
      }
      if (this.include !== Resource.TYPE_CSS) {
        Array.prototype.push.apply(resources, ScriptResource._getAllScripts());
      }

      return promise.resolve(resources.map(function(resource) {
        return { name: resource.name, value: resource };
      }));
    }
  }
];

});
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

define('gcli/types/setting', ['require', 'exports', 'module' , 'gcli/settings', 'gcli/types'], function(require, exports, module) {

'use strict';

var settings = require('gcli/settings');
var types = require('gcli/types');

exports.items = [
  {
    // A type for selecting a known setting
    item: 'type',
    name: 'setting',
    parent: 'selection',
    cacheable: true,
    constructor: function() {
      settings.onChange.add(function(ev) {
        this.clearCache();
      }, this);
    },
    lookup: function() {
      return settings.getAll().map(function(setting) {
        return { name: setting.name, value: setting };
      });
    }
  },
  {
    // A type for entering the value of a known setting
    // Customizations:
    // - settingParamName The name of the setting parameter so we can customize the
    //   type that we are expecting to read
    item: 'type',
    name: 'settingValue',
    parent: 'delegate',
    settingParamName: 'setting',
    delegateType: function(context) {
      if (context != null) {
        var setting = context.getArgsObject()[this.settingParamName];
        if (setting != null) {
          return setting.type;
        }
      }

      return types.createType('blank');
    }
  }
];

});
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

define('gcli/types/string', ['require', 'exports', 'module' , 'util/promise', 'gcli/types'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;

exports.items = [
  {
    // 'string' the most basic string type where all we need to do is to take
    // care of converting escaped characters like \t, \n, etc.
    // For the full list see
    // https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Values,_variables,_and_literals
    // The exception is that we ignore \b because replacing '\b' characters in
    // stringify() with their escaped version injects '\\b' all over the place
    // and the need to support \b seems low)
    // Customizations:
    // allowBlank: Allow a blank string to be counted as valid
    item: 'type',
    name: 'string',
    allowBlank: false,

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }

      return value
           .replace(/\\/g, '\\\\')
           .replace(/\f/g, '\\f')
           .replace(/\n/g, '\\n')
           .replace(/\r/g, '\\r')
           .replace(/\t/g, '\\t')
           .replace(/\v/g, '\\v')
           .replace(/\n/g, '\\n')
           .replace(/\r/g, '\\r')
           .replace(/ /g, '\\ ')
           .replace(/'/g, '\\\'')
           .replace(/"/g, '\\"')
           .replace(/{/g, '\\{')
           .replace(/}/g, '\\}');
    },

    parse: function(arg, context) {
      if (!this.allowBlank && (arg.text == null || arg.text === '')) {
        return promise.resolve(new Conversion(undefined, arg, Status.INCOMPLETE, ''));
      }

      // The string '\\' (i.e. an escaped \ (represented here as '\\\\' because it
      // is double escaped)) is first converted to a private unicode character and
      // then at the end from \uF000 to a single '\' to avoid the string \\n being
      // converted first to \n and then to a <LF>
      var value = arg.text
           .replace(/\\\\/g, '\uF000')
           .replace(/\\f/g, '\f')
           .replace(/\\n/g, '\n')
           .replace(/\\r/g, '\r')
           .replace(/\\t/g, '\t')
           .replace(/\\v/g, '\v')
           .replace(/\\n/g, '\n')
           .replace(/\\r/g, '\r')
           .replace(/\\ /g, ' ')
           .replace(/\\'/g, '\'')
           .replace(/\\"/g, '"')
           .replace(/\\{/g, '{')
           .replace(/\\}/g, '}')
           .replace(/\uF000/g, '\\');

      return promise.resolve(new Conversion(value, arg));
    }
  }
];


});
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

define('gcli/converters/basic', ['require', 'exports', 'module' , 'util/util'], function(require, exports, module) {

'use strict';

var util = require('util/util');

/**
 * Several converters are just data.toString inside a 'p' element
 */
function nodeFromDataToString(data, conversionContext) {
  var node = util.createElement(conversionContext.document, 'p');
  node.textContent = data.toString();
  return node;
}

exports.items = [
  {
    item: 'converter',
    from: 'string',
    to: 'dom',
    exec: nodeFromDataToString
  },
  {
    item: 'converter',
    from: 'number',
    to: 'dom',
    exec: nodeFromDataToString
  },
  {
    item: 'converter',
    from: 'boolean',
    to: 'dom',
    exec: nodeFromDataToString
  },
  {
    item: 'converter',
    from: 'undefined',
    to: 'dom',
    exec: function(data, conversionContext) {
      return util.createElement(conversionContext.document, 'span');
    }
  },
  {
    item: 'converter',
    from: 'number',
    to: 'string',
    exec: function(data) { return '' + data; }
  },
  {
    item: 'converter',
    from: 'boolean',
    to: 'string',
    exec: function(data) { return '' + data; }
  },
  {
    item: 'converter',
    from: 'undefined',
    to: 'string',
    exec: function(data) { return ''; }
  }
];

});
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

define('gcli/converters/html', ['require', 'exports', 'module' , 'util/util'], function(require, exports, module) {

'use strict';

var util = require('util/util');

/**
 * 'html' means a string containing HTML markup. We use innerHTML to inject
 * this into a DOM which has security implications, so this module will not
 * be used in all implementations.
 */
exports.items = [
  {
    item: 'converter',
    from: 'html',
    to: 'dom',
    exec: function(html, conversionContext) {
      var div = util.createElement(conversionContext.document, 'div');
      div.innerHTML = html;
      return div;
    }
  },
  {
    item: 'converter',
    from: 'html',
    to: 'string',
    exec: function(html, conversionContext) {
      var div = util.createElement(conversionContext.document, 'div');
      div.innerHTML = html;
      return div.textContent;
    }
  }
];


});
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

define('gcli/converters/terminal', ['require', 'exports', 'module' , 'util/util'], function(require, exports, module) {

'use strict';

var util = require('util/util');

/**
 * A 'terminal' object is a string or an array of strings, which are typically
 * the output from a shell command
 */
exports.items = [
  {
    item: 'converter',
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
  },
  {
    item: 'converter',
    from: 'terminal',
    to: 'string',
    exec: function(data, conversionContext) {
      return Array.isArray(data) ? data.join('') : '' + data;
    }
  }
];


});
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

define('gcli/ui/fields/basic', ['require', 'exports', 'module' , 'util/util', 'util/promise', 'util/l10n', 'gcli/argument', 'gcli/types', 'gcli/ui/fields'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var promise = require('util/promise');
var l10n = require('util/l10n');

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;
var ArrayConversion = require('gcli/types').ArrayConversion;

var Field = require('gcli/ui/fields').Field;
var fields = require('gcli/ui/fields');


/**
 * A field that allows editing of strings
 */
function StringField(type, options) {
  Field.call(this, type, options);
  this.arg = new Argument();

  this.element = util.createElement(this.document, 'input');
  this.element.type = 'text';
  this.element.classList.add('gcli-field');

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.onFieldChange = util.createEvent('StringField.onFieldChange');
}

StringField.prototype = Object.create(Field.prototype);

StringField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  this.element = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

StringField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

StringField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget({ text: this.element.value, prefixSpace: true });
  return this.type.parse(this.arg, this.requisition.executionContext);
};

StringField.claim = function(type, context) {
  return type.name === 'string' ? Field.MATCH : Field.BASIC;
};


/**
 * A field that allows editing of numbers using an [input type=number] field
 */
function NumberField(type, options) {
  Field.call(this, type, options);
  this.arg = new Argument();

  this.element = util.createElement(this.document, 'input');
  this.element.type = 'number';
  if (this.type.max) {
    this.element.max = this.type.max;
  }
  if (this.type.min) {
    this.element.min = this.type.min;
  }
  if (this.type.step) {
    this.element.step = this.type.step;
  }

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.onFieldChange = util.createEvent('NumberField.onFieldChange');
}

NumberField.prototype = Object.create(Field.prototype);

NumberField.claim = function(type, context) {
  return type.name === 'number' ? Field.MATCH : Field.NO_MATCH;
};

NumberField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  this.element = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

NumberField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

NumberField.prototype.getConversion = function() {
  this.arg = this.arg.beget({ text: this.element.value, prefixSpace: true });
  return this.type.parse(this.arg, this.requisition.executionContext);
};


/**
 * A field that uses a checkbox to toggle a boolean field
 */
function BooleanField(type, options) {
  Field.call(this, type, options);

  this.name = options.name;
  this.named = options.named;

  this.element = util.createElement(this.document, 'input');
  this.element.type = 'checkbox';
  this.element.id = 'gcliForm' + this.name;

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.onFieldChange = util.createEvent('BooleanField.onFieldChange');
}

BooleanField.prototype = Object.create(Field.prototype);

BooleanField.claim = function(type, context) {
  return type.name === 'boolean' ? Field.MATCH : Field.NO_MATCH;
};

BooleanField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  this.element = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

BooleanField.prototype.setConversion = function(conversion) {
  this.element.checked = conversion.value;
  this.setMessage(conversion.message);
};

BooleanField.prototype.getConversion = function() {
  var arg;
  if (this.named) {
    arg = this.element.checked ?
            new TrueNamedArgument(new Argument(' --' + this.name)) :
            new FalseNamedArgument();
  }
  else {
    arg = new Argument(' ' + this.element.checked);
  }
  return this.type.parse(arg, this.requisition.executionContext);
};


/**
 * A field that works with delegate types by delaying resolution until that
 * last possible time
 */
function DelegateField(type, options) {
  Field.call(this, type, options);
  this.options = options;
  this.requisition.onTextChange.add(this.update, this);

  this.element = util.createElement(this.document, 'div');
  this.update();

  this.onFieldChange = util.createEvent('DelegateField.onFieldChange');
}

DelegateField.prototype = Object.create(Field.prototype);

DelegateField.prototype.update = function() {
  var subtype = this.type.delegateType();
  if (subtype === this.subtype) {
    return;
  }

  if (this.field) {
    this.field.onFieldChange.remove(this.fieldChanged, this);
    this.field.destroy();
  }

  this.subtype = subtype;
  this.field = fields.getField(subtype, this.options);
  this.field.onFieldChange.add(this.fieldChanged, this);

  util.clearElement(this.element);
  this.element.appendChild(this.field.element);
};

DelegateField.claim = function(type, context) {
  return type.isDelegate ? Field.MATCH : Field.NO_MATCH;
};

DelegateField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.requisition.onTextChange.remove(this.update, this);
  this.element = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

DelegateField.prototype.setConversion = function(conversion) {
  this.field.setConversion(conversion);
};

DelegateField.prototype.getConversion = function() {
  return this.field.getConversion();
};

Object.defineProperty(DelegateField.prototype, 'isImportant', {
  get: function() {
    return this.field.isImportant;
  },
  enumerable: true
});


/**
 * Adds add/delete buttons to a normal field allowing there to be many values
 * given for a parameter.
 */
function ArrayField(type, options) {
  Field.call(this, type, options);
  this.options = options;

  this._onAdd = this._onAdd.bind(this);
  this.members = [];

  // <div class=gcliArrayParent save="${element}">
  this.element = util.createElement(this.document, 'div');
  this.element.classList.add('gcli-array-parent');

  // <button class=gcliArrayMbrAdd onclick="${_onAdd}" save="${addButton}">Add
  this.addButton = util.createElement(this.document, 'button');
  this.addButton.classList.add('gcli-array-member-add');
  this.addButton.addEventListener('click', this._onAdd, false);
  this.addButton.textContent = l10n.lookup('fieldArrayAdd');
  this.element.appendChild(this.addButton);

  // <div class=gcliArrayMbrs save="${mbrElement}">
  this.container = util.createElement(this.document, 'div');
  this.container.classList.add('gcli-array-members');
  this.element.appendChild(this.container);

  this.onInputChange = this.onInputChange.bind(this);

  this.onFieldChange = util.createEvent('ArrayField.onFieldChange');
}

ArrayField.prototype = Object.create(Field.prototype);

ArrayField.claim = function(type, context) {
  return type.name === 'array' ? Field.MATCH : Field.NO_MATCH;
};

ArrayField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.addButton.removeEventListener('click', this._onAdd, false);
};

ArrayField.prototype.setConversion = function(conversion) {
  // BUG 653568: this is too brutal - it removes focus from any the current field
  util.clearElement(this.container);
  this.members = [];

  conversion.conversions.forEach(function(subConversion) {
    this._onAdd(null, subConversion);
  }, this);
};

ArrayField.prototype.getConversion = function() {
  var conversions = [];
  var arrayArg = new ArrayArgument();

  var addConversion = function(conversion) {
    conversions.push(conversion);
    arrayArg.addArgument(conversion.arg);
  }.bind(this);

  for (var i = 0; i < this.members.length; i++) {
    var reply = this.members[i].field.getConversion();
    promise.resolve(reply).then(addConversion, util.errorHandler);
  }

  return new ArrayConversion(conversions, arrayArg);
};

ArrayField.prototype._onAdd = function(ev, subConversion) {
  // <div class=gcliArrayMbr save="${element}">
  var element = util.createElement(this.document, 'div');
  element.classList.add('gcli-array-member');
  this.container.appendChild(element);

  // ${field.element}
  var field = fields.getField(this.type.subtype, this.options);
  field.onFieldChange.add(function() {
    promise.resolve(this.getConversion()).then(function(conversion) {
      this.onFieldChange({ conversion: conversion });
      this.setMessage(conversion.message);
    }.bind(this), util.errorHandler);
  }, this);

  if (subConversion) {
    field.setConversion(subConversion);
  }
  element.appendChild(field.element);

  // <div class=gcliArrayMbrDel onclick="${_onDel}">
  var delButton = util.createElement(this.document, 'button');
  delButton.classList.add('gcli-array-member-del');
  delButton.addEventListener('click', this._onDel, false);
  delButton.textContent = l10n.lookup('fieldArrayDel');
  element.appendChild(delButton);

  var member = {
    element: element,
    field: field,
    parent: this
  };
  member.onDelete = function() {
    this.parent.container.removeChild(this.element);
    this.parent.members = this.parent.members.filter(function(test) {
      return test !== this;
    });
    this.parent.onInputChange();
  }.bind(member);
  delButton.addEventListener('click', member.onDelete, false);

  this.members.push(member);
};

/**
 * Exported items
 */
exports.items = [
  StringField, NumberField, BooleanField, DelegateField, ArrayField
];


});
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

define('gcli/ui/fields/javascript', ['require', 'exports', 'module' , 'util/util', 'util/promise', 'gcli/types', 'gcli/argument', 'gcli/ui/fields/menu', 'gcli/ui/fields'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var promise = require('util/promise');

var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ScriptArgument = require('gcli/argument').ScriptArgument;

var Menu = require('gcli/ui/fields/menu').Menu;
var Field = require('gcli/ui/fields').Field;

/**
 * A field that allows editing of javascript
 */
function JavascriptField(type, options) {
  Field.call(this, type, options);

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new ScriptArgument('', '{ ', ' }');

  this.element = util.createElement(this.document, 'div');

  this.input = util.createElement(this.document, 'input');
  this.input.type = 'text';
  this.input.addEventListener('keyup', this.onInputChange, false);
  this.input.classList.add('gcli-field');
  this.input.classList.add('gcli-field-javascript');
  this.element.appendChild(this.input);

  this.menu = new Menu({
    document: this.document,
    field: true,
    type: type
  });
  this.element.appendChild(this.menu.element);

  var initial = new Conversion(undefined, new ScriptArgument(''),
                               Status.INCOMPLETE, '');
  this.setConversion(initial);

  this.onFieldChange = util.createEvent('JavascriptField.onFieldChange');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick.add(this.itemClicked, this);
}

JavascriptField.prototype = Object.create(Field.prototype);

JavascriptField.claim = function(type, context) {
  return type.name === 'javascript' ? Field.TOOLTIP_MATCH : Field.NO_MATCH;
};

JavascriptField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.input.removeEventListener('keyup', this.onInputChange, false);
  this.menu.onItemClick.remove(this.itemClicked, this);
  this.menu.destroy();
  this.element = undefined;
  this.input = undefined;
  this.menu = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

JavascriptField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.input.value = conversion.arg.text;

  var prefixLen = 0;
  if (this.type.name === 'javascript') {
    var typed = conversion.arg.text;
    var lastDot = typed.lastIndexOf('.');
    if (lastDot !== -1) {
      prefixLen = lastDot;
    }
  }

  this.setMessage(conversion.message);

  conversion.getPredictions().then(function(predictions) {
    var items = [];
    predictions.forEach(function(item) {
      // Commands can be hidden
      if (!item.hidden) {
        items.push({
          name: item.name.substring(prefixLen),
          complete: item.name,
          description: item.description || ''
        });
      }
    }, this);
    this.menu.show(items);
  }.bind(this), util.errorHandler);
};

JavascriptField.prototype.itemClicked = function(ev) {
  var parsed = this.type.parse(ev.arg, this.requisition.executionContext);
  promise.resolve(parsed).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

JavascriptField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  promise.resolve(this.getConversion()).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

JavascriptField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = new ScriptArgument(this.input.value, '{ ', ' }');
  return this.type.parse(this.arg, this.requisition.executionContext);
};

JavascriptField.DEFAULT_VALUE = '__JavascriptField.DEFAULT_VALUE';

/**
 * Allow registration and de-registration.
 */
exports.items = [ JavascriptField ];


});
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

define('gcli/ui/fields/menu', ['require', 'exports', 'module' , 'util/util', 'util/l10n', 'util/domtemplate', 'gcli/argument', 'gcli/types', 'gcli/canon', 'text!gcli/ui/fields/menu.css', 'text!gcli/ui/fields/menu.html'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var l10n = require('util/l10n');
var domtemplate = require('util/domtemplate');

var Argument = require('gcli/argument').Argument;
var Conversion = require('gcli/types').Conversion;
var canon = require('gcli/canon');

var menuCss = require('text!gcli/ui/fields/menu.css');
var menuHtml = require('text!gcli/ui/fields/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 * @param options A way to customize the menu display. Valid options are:
 * - field: [boolean] Turns the menu display into a drop-down for use inside a
 *   JavascriptField.
 * - document: The document to use in creating widgets
 * - menuClass: Custom class name when generating the top level element
 *   which allows different layout systems
 * - type: The version of SelectionType that we're picking an option from
 */
function Menu(options) {
  options = options || {};
  this.document = options.document || document;
  this.type = options.type;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  util.createElement(this.document, 'div');
  this.element.classList.add(options.menuClass || 'gcli-menu');
  if (options && options.field) {
    this.element.classList.add(options.menuFieldClass || 'gcli-menu-field');
  }

  // Pull the HTML into the DOM, but don't add it to the document
  if (menuCss != null) {
    util.importCss(menuCss, this.document, 'gcli-menu');
  }

  this.template = util.toDom(this.document, menuHtml);
  this.templateOptions = { blankNullUndefined: true, stack: 'menu.html' };

  // Contains the items that should be displayed
  this.items = null;

  this.onItemClick = util.createEvent('Menu.onItemClick');
}

/**
 * Allow the template engine to get at localization strings
 */
Menu.prototype.l10n = l10n.propertyLookup;

/**
 * Avoid memory leaks
 */
Menu.prototype.destroy = function() {
  this.element = undefined;
  this.template = undefined;
  this.document = undefined;
};

/**
 * The default is to do nothing when someone clicks on the menu.
 * This is called from template.html
 * @param ev The click event from the browser
 */
Menu.prototype.onItemClickInternal = function(ev) {
  var name = ev.currentTarget.querySelector('.gcli-menu-name').textContent;
  var arg = new Argument(name);
  arg.suffix = ' ';

  this.onItemClick({ arg: arg });
};

/**
 * Display a number of items in the menu (or hide the menu if there is nothing
 * to display)
 * @param items The items to show in the menu
 * @param match Matching text to highlight in the output
 */
Menu.prototype.show = function(items, match) {
  this.items = items.filter(function(item) {
    return item.hidden === undefined || item.hidden !== true;
  }.bind(this));

  if (match) {
    this.items = this.items.map(function(item) {
      return getHighlightingProxy(item, match, this.template.ownerDocument);
    }.bind(this));
  }

  if (this.items.length === 0) {
    this.element.style.display = 'none';
    return;
  }

  if (this.items.length >= Conversion.maxPredictions) {
    this.items.splice(-1);
    this.items.hasMore = true;
  }

  var options = this.template.cloneNode(true);
  domtemplate.template(options, this, this.templateOptions);

  util.clearElement(this.element);
  this.element.appendChild(options);

  this.element.style.display = 'block';
};

/**
 * Create a proxy around an item that highlights matching text
 */
function getHighlightingProxy(item, match, document) {
  if (typeof Proxy === 'undefined') {
    return item;
  }
  return Proxy.create({
    get: function(rcvr, name) {
      var value = item[name];
      if (name !== 'name') {
        return value;
      }

      var startMatch = value.indexOf(match);
      if (startMatch === -1) {
        return value;
      }

      var before = value.substr(0, startMatch);
      var after = value.substr(startMatch + match.length);
      var parent = util.createElement(document, 'span');
      parent.appendChild(document.createTextNode(before));
      var highlight = util.createElement(document, 'span');
      highlight.classList.add('gcli-menu-typed');
      highlight.appendChild(document.createTextNode(match));
      parent.appendChild(highlight);
      parent.appendChild(document.createTextNode(after));
      return parent;
    }
  });
}

/**
 * Highlight a given option
 */
Menu.prototype.setChoiceIndex = function(choice) {
  var nodes = this.element.querySelectorAll('.gcli-menu-option');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove('gcli-menu-highlight');
  }

  if (choice == null) {
    return;
  }

  if (nodes.length <= choice) {
    console.error('Cant highlight ' + choice + '. Only ' + nodes.length + ' options');
    return;
  }

  nodes.item(choice).classList.add('gcli-menu-highlight');
};

/**
 * Allow the terminal to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if an item was 'clicked', false otherwise
 */
Menu.prototype.selectChoice = function() {
  var selected = this.element.querySelector('.gcli-menu-highlight .gcli-menu-name');
  if (!selected) {
    return false;
  }

  var name = selected.textContent;
  var arg = new Argument(name);
  arg.suffix = ' ';
  arg.prefix = ' ';

  this.onItemClick({ arg: arg });
  return true;
};

/**
 * Hide the menu
 */
Menu.prototype.hide = function() {
  this.element.style.display = 'none';
};

/**
 * Change how much vertical space this menu can take up
 */
Menu.prototype.setMaxHeight = function(height) {
  this.element.style.maxHeight = height + 'px';
};

exports.Menu = Menu;


});
define("text!gcli/ui/fields/menu.css", [], "\n" +
  ".gcli-menu {\n" +
  "  width: 100%;\n" +
  "  overflow: hidden;\n" +
  "  font-size: 90%;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-field {\n" +
  "  border: 1px solid #aaa;\n" +
  "  border-top: 0;\n" +
  "  border-bottom-right-radius: 5px;\n" +
  "  border-bottom-left-radius: 5px;\n" +
  "  max-height: 300px;\n" +
  "  margin: 0 3px;\n" +
  "  padding: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-template {\n" +
  "  border-collapse: collapse;\n" +
  "  width: 100%;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-option {\n" +
  "  overflow: hidden;\n" +
  "  white-space: nowrap;\n" +
  "  cursor: pointer;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-option:hover {\n" +
  "  background-color: rgba(0, 0, 0, 0.2);\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-name {\n" +
  "  padding: 2px 3px;\n" +
  "  -moz-padding-start: 8px;\n" +
  "  -webkit-padding-start: 8px;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-desc {\n" +
  "  color: #777;\n" +
  "  padding: 0 3px;\n" +
  "  -moz-padding-end: 8px;\n" +
  "  -webkit-padding-end: 8px;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-highlight,\n" +
  ".gcli-menu-highlight.gcli-menu-option:hover {\n" +
  "  background-color: rgba(0, 0, 0, 0.3);\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-typed {\n" +
  "  color: #FF6600;\n" +
  "}\n" +
  "\n" +
  ".gcli-menu-more {\n" +
  "  font-size: 80%;\n" +
  "  text-align: right;\n" +
  "  -moz-padding-end: 8px;\n" +
  "  -webkit-padding-end: 8px;\n" +
  "}\n" +
  "");

define("text!gcli/ui/fields/menu.html", [], "\n" +
  "<div>\n" +
  "  <table class=\"gcli-menu-template\" aria-live=\"polite\">\n" +
  "    <tr class=\"gcli-menu-option\" foreach=\"item in ${items}\"\n" +
  "        onclick=\"${onItemClickInternal}\" title=\"${item.manual}\">\n" +
  "      <td class=\"gcli-menu-name\">${item.name}</td>\n" +
  "      <td class=\"gcli-menu-desc\">${item.description}</td>\n" +
  "    </tr>\n" +
  "  </table>\n" +
  "  <div class=\"gcli-menu-more\" if=\"${items.hasMore}\">${l10n.fieldMenuMore}</div>\n" +
  "</div>\n" +
  "");

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

define('gcli/ui/fields/selection', ['require', 'exports', 'module' , 'util/promise', 'util/util', 'util/l10n', 'gcli/argument', 'gcli/ui/fields/menu', 'gcli/ui/fields'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');
var l10n = require('util/l10n');

var Argument = require('gcli/argument').Argument;

var Menu = require('gcli/ui/fields/menu').Menu;
var Field = require('gcli/ui/fields').Field;


/**
 * Model an instanceof SelectionType as a select input box.
 * <p>There are 3 slightly overlapping concepts to be aware of:
 * <ul>
 * <li>value: This is the (probably non-string) value, known as a value by the
 *   assignment
 * <li>optValue: This is the text value as known by the DOM option element, as
 *   in &lt;option value=???%gt...
 * <li>optText: This is the contents of the DOM option element.
 * </ul>
 */
function SelectionField(type, options) {
  Field.call(this, type, options);

  this.items = [];

  this.element = util.createElement(this.document, 'select');
  this.element.classList.add('gcli-field');
  this._addOption({
    name: l10n.lookupFormat('fieldSelectionSelect', [ options.name ])
  });

  promise.resolve(this.type.getLookup()).then(function(lookup) {
    lookup.forEach(this._addOption, this);
  }.bind(this), util.errorHandler);

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.onFieldChange = util.createEvent('SelectionField.onFieldChange');
}

SelectionField.prototype = Object.create(Field.prototype);

SelectionField.claim = function(type, context) {
  if (type.name === 'boolean') {
    return Field.BASIC;
  }
  return type.isSelection ? Field.DEFAULT : Field.NO_MATCH;
};

SelectionField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  this.element = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

SelectionField.prototype.setConversion = function(conversion) {
  var index;
  this.items.forEach(function(item) {
    if (item.value && item.value === conversion.value) {
      index = item.index;
    }
  }, this);
  this.element.value = index;
  this.setMessage(conversion.message);
};

SelectionField.prototype.getConversion = function() {
  var item = this.items[this.element.value];
  return this.type.parse(new Argument(item.name, ' '));
};

SelectionField.prototype._addOption = function(item) {
  item.index = this.items.length;
  this.items.push(item);

  var option = util.createElement(this.document, 'option');
  option.textContent = item.name;
  option.value = item.index;
  this.element.appendChild(option);
};


/**
 * A field that allows selection of one of a number of options
 */
function SelectionTooltipField(type, options) {
  Field.call(this, type, options);

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new Argument();

  this.menu = new Menu({ document: this.document, type: type });
  this.element = this.menu.element;

  this.onFieldChange = util.createEvent('SelectionTooltipField.onFieldChange');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick.add(this.itemClicked, this);
}

SelectionTooltipField.prototype = Object.create(Field.prototype);

SelectionTooltipField.claim = function(type, context) {
  return type.getType(context).isSelection ?
      Field.TOOLTIP_MATCH :
      Field.NO_MATCH;
};

SelectionTooltipField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.menu.onItemClick.remove(this.itemClicked, this);
  this.menu.destroy();
  this.element = undefined;
  this.document = undefined;
  this.onInputChange = undefined;
};

SelectionTooltipField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.setMessage(conversion.message);

  conversion.getPredictions().then(function(predictions) {
    var items = predictions.map(function(prediction) {
      // If the prediction value is an 'item' (that is an object with a name and
      // description) then use that, otherwise use the prediction itself, because
      // at least that has a name.
      return prediction.value && prediction.value.description ?
          prediction.value :
          prediction;
    }, this);
    this.menu.show(items, conversion.arg.text);
  }.bind(this), util.errorHandler);
};

SelectionTooltipField.prototype.itemClicked = function(ev) {
  var parsed = this.type.parse(ev.arg, this.requisition.executionContext);
  promise.resolve(parsed).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

SelectionTooltipField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  promise.resolve(this.getConversion()).then(function(conversion) {
    this.onFieldChange({ conversion: conversion });
    this.setMessage(conversion.message);
  }.bind(this), util.errorHandler);
};

SelectionTooltipField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget({ text: this.input.value });
  return this.type.parse(this.arg, this.requisition.executionContext);
};

/**
 * Allow the menu to highlight the correct prediction choice
 */
SelectionTooltipField.prototype.setChoiceIndex = function(choice) {
  this.menu.setChoiceIndex(choice);
};

/**
 * Allow the terminal to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if an item was 'clicked', false otherwise
 */
SelectionTooltipField.prototype.selectChoice = function() {
  return this.menu.selectChoice();
};

Object.defineProperty(SelectionTooltipField.prototype, 'isImportant', {
  get: function() {
    return this.type.name !== 'command';
  },
  enumerable: true
});

SelectionTooltipField.DEFAULT_VALUE = '__SelectionTooltipField.DEFAULT_VALUE';

/**
 * Allow registration and de-registration.
 */
exports.items = [ SelectionField, SelectionTooltipField ];

});
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

define('demo/index', ['require', 'exports', 'module' , 'gcli/index', 'gcli/api', 'gcli/commands/connect', 'gcli/commands/context', 'gcli/commands/exec', 'gcli/commands/help', 'gcli/commands/intro', 'gcli/commands/pref_list', 'gcli/commands/pref', 'demo/commands/alert', 'demo/commands/bugs', 'demo/commands/demo', 'demo/commands/echo', 'demo/commands/edit', 'demo/commands/sleep', 'demo/commands/theme'], function(require, exports, module) {

'use strict';

require('gcli/index');
var gcli = require('gcli/api').getApi();

gcli.addItems(require('gcli/commands/connect').items);
gcli.addItems(require('gcli/commands/context').items);
gcli.addItems(require('gcli/commands/exec').items);
gcli.addItems(require('gcli/commands/help').items);
gcli.addItems(require('gcli/commands/intro').items);
gcli.addItems(require('gcli/commands/pref_list').items);
gcli.addItems(require('gcli/commands/pref').items);

gcli.addItems(require('demo/commands/alert').items);
gcli.addItems(require('demo/commands/bugs').items);
gcli.addItems(require('demo/commands/demo').items);
gcli.addItems(require('demo/commands/echo').items);
gcli.addItems(require('demo/commands/edit').items);
// gcli.addItems(require('demo/commands/git').items);
// gcli.addItems(require('demo/commands/hg').items);
gcli.addItems(require('demo/commands/sleep').items);
gcli.addItems(require('demo/commands/theme').items);

});
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

define('gcli/commands/connect', ['require', 'exports', 'module' , 'util/l10n', 'gcli/canon', 'util/connect/connector'], function(require, exports, module) {

'use strict';

var l10n = require('util/l10n');
var canon = require('gcli/canon');
var connector = require('util/connect/connector');

/**
 * A lookup of the current connection
 */
var connections = {};

/**
 * 'connection' type
 */
var connection = {
  item: 'type',
  name: 'connection',
  parent: 'selection',
  lookup: function() {
    return Object.keys(connections).map(function(prefix) {
      return { name: prefix, value: connections[prefix] };
    });
  }
};

/**
 * 'connect' command
 */
var connect = {
  item: 'command',
  name: 'connect',
  description: l10n.lookup('connectDesc'),
  manual: l10n.lookup('connectManual'),
  params: [
    {
      name: 'prefix',
      type: 'string',
      description: l10n.lookup('connectPrefixDesc')
    },
    {
      name: 'host',
      short: 'h',
      type: 'string',
      description: l10n.lookup('connectHostDesc'),
      defaultValue: 'localhost',
      option: true
    },
    {
      name: 'port',
      short: 'p',
      type: { name: 'number', max: 65536, min: 0 },
      description: l10n.lookup('connectPortDesc'),
      defaultValue: connector.defaultPort,
      option: true
    }
  ],
  returnType: 'string',

  exec: function(args, context) {
    if (connections[args.prefix] != null) {
      throw new Error(l10n.lookupFormat('connectDupReply', [ args.prefix ]));
    }

    var cxp = connector.connect(args.prefix, args.host, args.port);
    return cxp.then(function(connection) {
      connections[args.prefix] = connection;

      return connection.getCommandSpecs().then(function(commandSpecs) {
        var remoter = this.createRemoter(args.prefix, connection);
        canon.addProxyCommands(args.prefix, commandSpecs, remoter);

        // commandSpecs doesn't include the parent command that we added
        return l10n.lookupFormat('connectReply',
                                 [ Object.keys(commandSpecs).length + 1 ]);
      }.bind(this));
    }.bind(this));
  },

  /**
   * When we register a set of remote commands, we need to provide the canon
   * with a proxy executor. This is that executor.
   */
  createRemoter: function(prefix, connection) {
    return function(cmdArgs, context) {
      var typed = context.typed;

      // If we've been called using a 'context' then there will be no prefix
      // otherwise we need to remove it
      if (typed.indexOf(prefix) === 0) {
        typed = typed.substring(prefix.length).replace(/^ */, '');
      }

      return connection.execute(typed, cmdArgs).then(function(reply) {
        var typedData = context.typedData(reply.type, reply.data);
        if (!reply.error) {
          return typedData;
        }
        else {
          throw typedData;
        }
      });
    }.bind(this);
  }
};

/**
 * 'disconnect' command
 */
var disconnect = {
  item: 'command',
  name: 'disconnect',
  description: l10n.lookup('disconnectDesc2'),
  manual: l10n.lookup('disconnectManual2'),
  params: [
    {
      name: 'prefix',
      type: 'connection',
      description: l10n.lookup('disconnectPrefixDesc')
    },
    {
      name: 'force',
      type: 'boolean',
      description: l10n.lookup('disconnectForceDesc'),
      hidden: connector.disconnectSupportsForce,
      option: true
    }
  ],
  returnType: 'string',

  exec: function(args, context) {
    return args.prefix.disconnect(args.force).then(function() {
      var removed = canon.removeProxyCommands(args.prefix.prefix);
      delete connections[args.prefix.prefix];
      return l10n.lookupFormat('disconnectReply', [ removed.length ]);
    });
  }
};

exports.items = [ connection, connect, disconnect ];

});
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

define('util/connect/connector', ['require', 'exports', 'module' , 'util/promise', 'util/util', 'util/l10n'], function(require, exports, module) {

'use strict';

var promise = require('util/promise');
var util = require('util/util');
var l10n = require('util/l10n');

/**
 * The ability to add functionality by adding a new script tag is specific to
 * a browser, so this code is not going to work in NodeJS/Firefox etc.
 * We export the document that we are using so multi-frame environments can
 * update the default document
 */
exports.document = document;

/**
 * Create a new Connection and begin the connect process so the connection
 * object can't be used until it is connected.
 */
exports.connect = function(prefix, host, port) {
  var connection = new Connection(prefix, host, port);
  return connection.connect().then(function() {
    return connection;
  });
};

/**
 * What port should we use by default?
 */
exports.defaultPort = 9999;

/**
 * Manage a named connection to an HTTP server over web-sockets using socket.io
 */
function Connection(prefix, host, port) {
  this.prefix = prefix;
  this.host = host;
  this.port = port;

  this.requests = {};
  this.nextRequestId = 0;
}

/**
 * Setup socket.io, retrieve the list of remote commands and register them with
 * the local canon.
 * @return a promise which resolves (to undefined) when the connection is made
 * or is rejected (with an error message) if the connection fails
 */
Connection.prototype.connect = function() {
  var deferred = promise.defer();

  this.script = util.createElement(exports.document, 'script');
  this.script.src = '/socket.io/socket.io.js';

  this.script.addEventListener('load', function() {
    this.socket = io.connect('http://' + this.host + ':' + this.port);

    // We're being passed execution results
    this.socket.on('executed', function(data) {
      var request = this.requests[data.requestId];
      if (request == null) {
        throw new Error('Unknown requestId \'' + data.requestId + '\'');
      }
      request.complete(data.error, data.type, data.data);
      delete this.requests[data.requestId];
    }.bind(this));

    // On first connection ask for the remote command-specs
    this.socket.on('connected', function(data) {
      deferred.resolve();
    }.bind(this));
  }.bind(this));

  this.script.addEventListener('error', function(ev) {
    deferred.reject('Error from SCRIPT tag to ' + this.script.src);
  }.bind(this));

  exports.document.head.appendChild(this.script);

  return deferred.promise;
};

/**
 * Retrieve the list of remote commands.
 * @return a promise of an array of commandSpecs
 */
Connection.prototype.getCommandSpecs = function() {
  var deferred = promise.defer();

  // When we have the remote command specs, add them locally
  this.socket.once('commandSpecs', function(data) {
    deferred.resolve(data.commandSpecs);
  }.bind(this));

  this.socket.emit('getCommandSpecs');

  return deferred.promise;
};

/**
 * Send an execute request. Replies are handled by the setup in connect()
 */
Connection.prototype.execute = function(typed, cmdArgs) {
  var request = new Request(typed, cmdArgs);
  this.requests[request.json.requestId] = request;

  this.socket.emit('execute', request.json);

  return request.promise;
};

exports.disconnectSupportsForce = true;

/**
 * Kill this connection
 */
Connection.prototype.disconnect = function(force) {
  if (!force) {
    if (Object.keys(this.requests).length !== 0) {
      var names = Object.keys(this.requests).map(function(key) {
        return this.requests[key].json.typed;
      }.bind(this)).join(', ');

      var msg = l10n.lookupFormat('disconnectOutstanding', [ names ]);
      return promise.reject(msg);
    }
  }

  this.socket.disconnect();
  this.script.parentNode.removeChild(this.script);

  return promise.resolve();
};


/**
 * A Request is a command typed at the client which lives until the command
 * has finished executing on the server
 */
function Request(typed, args) {
  this.json = {
    requestId: 'id-' + Request._nextRequestId++,
    typed: typed,
    args: args
  };

  this._deferred = promise.defer();

  this.promise = this._deferred.promise;
}

Request._nextRequestId = 0;

/**
 * Called by the connection when a remote command has finished executing
 * @param error boolean indicating output state
 * @param type the type of the returned data
 * @param data the data itself
 */
Request.prototype.complete = function(error, type, data) {
  this._deferred.resolve({
    error: error,
    type: type,
    data: data
  });
};


});
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

define('gcli/commands/context', ['require', 'exports', 'module' , 'util/l10n'], function(require, exports, module) {

'use strict';

var l10n = require('util/l10n');

/**
 * 'context' command
 */
var context = {
  item: 'command',
  name: 'context',
  description: l10n.lookup('contextDesc'),
  manual: l10n.lookup('contextManual'),
  params: [
   {
     name: 'prefix',
     type: 'command',
     description: l10n.lookup('contextPrefixDesc'),
     defaultValue: null
   }
  ],
  returnType: 'string',
  noRemote: true,
  exec: function echo(args, context) {
    // Do not copy this code
    var requisition = context.__dlhjshfw;

    if (args.prefix == null) {
      requisition.prefix = null;
      return l10n.lookup('contextEmptyReply');
    }

    if (args.prefix.exec != null) {
      throw new Error(l10n.lookupFormat('contextNotParentError',
                                        [ args.prefix.name ]));
    }

    requisition.prefix = args.prefix.name;
    return l10n.lookupFormat('contextReply', [ args.prefix.name ]);
  }
};

exports.items = [ context ];

});
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

define('gcli/commands/exec', ['require', 'exports', 'module' , 'gcli/cli', 'util/host', 'util/l10n'], function(require, exports, module) {

'use strict';

var cli = require('gcli/cli');
var host = require('util/host');
var l10n = require('util/l10n');

/**
 * 'cd' command
 */
var cd = {
  item: 'command',
  name: 'cd',
  description: l10n.lookup('cdDesc'),
  manual: l10n.lookup('cdManual'),
  params: [
    {
      name: 'directory',
      type: {
        name: 'file',
        filetype: 'directory',
        existing: 'yes'
      },
      description: l10n.lookup('cdDirectoryDesc')
    }
  ],
  returnType: 'string',
  exec: function(args, context) {
    context.shell.cwd = args.directory;
    return 'Working directory is now ' + context.shell.cwd;
  }
};

/**
 * 'exec' command
 */
var exec = {
  item: 'command',
  name: 'exec',
  description: l10n.lookup('execDesc'),
  manual: l10n.lookup('execManual'),
  params: [
    {
      name: 'command',
      type: 'string',
      description: l10n.lookup('execCommandDesc')
    }
  ],
  returnType: 'output',
  exec: function(args, context) {
    var cmdArgs = cli.tokenize(args.command).map(function(arg) {
      return arg.text;
    });
    var cmd = cmdArgs.shift();

    var execSpec = {
      cmd: cmd,
      args: cmdArgs,
      env: context.shell.env,
      cwd: context.shell.cwd
    };

    return host.exec(execSpec).then(function(output) {
      if (output.code === 0) {
        return output;
      }

      throw output.data;
    }, function(output) {
      throw output.data;
    });
  }
};

/**
 * How we display the output of a generic exec command: we have to assume that
 * it is a string to be displayed on a terminal - i.e. in a monospaced font
 */
var outputToView = {
  item: 'converter',
  from: 'output',
  to: 'view',
  exec: function(output, context) {
    return {
      html: '<pre>${output.data}</pre>',
      data: { output: output }
    };
  }
};

/**
 * How we display the output of a generic exec command: we have to assume that
 * it is a string to be displayed on a terminal - i.e. in a monospaced font
 */
var outputToString = {
  item: 'converter',
  from: 'output',
  to: 'string',
  exec: function(output, context) {
    return output.data;
  }
};

exports.items = [ outputToView, outputToString, cd, exec ];


});
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

define('gcli/commands/help', ['require', 'exports', 'module' , 'util/l10n', 'gcli/canon', 'text!gcli/commands/help_man.html', 'text!gcli/commands/help.css', 'text!gcli/commands/help_man.txt', 'text!gcli/commands/help_list.html', 'text!gcli/commands/help_list.txt'], function(require, exports, module) {

'use strict';

var l10n = require('util/l10n');
var canon = require('gcli/canon');

/**
 * Get a data block for the help_man.html/help_man.txt templates
 */
function getHelpManData(commandData, context) {
  return {
    l10n: l10n.propertyLookup,
    onclick: context.update,
    ondblclick: context.updateExec,
    describe: function(item) {
      return item.manual || item.description;
    },
    getTypeDescription: function(param) {
      var input = '';
      if (param.defaultValue === undefined) {
        input = l10n.lookup('helpManRequired');
      }
      else if (param.defaultValue === null) {
        input = l10n.lookup('helpManOptional');
      }
      else {
        var defaultValue = param.type.stringify(param.defaultValue);
        input = l10n.lookupFormat('helpManDefault', [ defaultValue ]);
      }
      return '(' + param.type.name + ', ' + input + ')';
    },
    getSynopsis: function(param) {
      var short = param.short ? '|-' + param.short : '';
      if (param.isPositionalAllowed) {
        return param.defaultValue !== undefined ?
            '[' + param.name + short + ']' :
            '<' + param.name + short + '>';
      }
      else {
        return param.type.name === 'boolean' ?
            '[--' + param.name + short + ']' :
            '[--' + param.name + short + ' ...]';
      }
    },
    command: commandData.command,
    subcommands: commandData.subcommands
  };
}

/**
 * Get a data block for the help_list.html/help_list.txt templates
 */
function getHelpListData(commandsData, context) {
  var heading;
  if (commandsData.commands.length === 0) {
    heading = l10n.lookupFormat('helpListNone', [ commandsData.prefix ]);
  }
  else if (commandsData.prefix == null) {
    heading = l10n.lookup('helpListAll');
  }
  else {
    heading = l10n.lookupFormat('helpListPrefix', [ commandsData.prefix ]);
  }

  return {
    l10n: l10n.propertyLookup,
    includeIntro: commandsData.prefix == null,
    heading: heading,
    onclick: context.update,
    ondblclick: context.updateExec,
    matchingCommands: commandsData.commands
  };
}

/**
 * Create a block of data suitable to be passed to the help_list.html template
 */
function getMatchingCommands(prefix) {
  var commands = canon.getCommands().filter(function(command) {
    if (command.hidden) {
      return false;
    }

    if (prefix && command.name.indexOf(prefix) !== 0) {
      // Filtered out because they don't match the search
      return false;
    }
    if (!prefix && command.name.indexOf(' ') != -1) {
      // We don't show sub commands with plain 'help'
      return false;
    }
    return true;
  });
  commands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  return commands;
}

/**
 * Find all the sub commands of the given command
 */
function getSubCommands(command) {
  if (command.exec != null) {
    return [];
  }

  var subcommands = canon.getCommands().filter(function(subcommand) {
    return subcommand.name.indexOf(command.name) === 0 &&
           subcommand.name !== command.name &&
           !subcommand.hidden;
  });

  subcommands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  return subcommands;
}

exports.items = [
  {
    // 'help' command
    item: 'command',
    name: 'help',
    description: l10n.lookup('helpDesc'),
    manual: l10n.lookup('helpManual'),
    params: [
      {
        name: 'search',
        type: 'string',
        description: l10n.lookup('helpSearchDesc'),
        manual: l10n.lookup('helpSearchManual3'),
        defaultValue: null
      }
    ],

    exec: function(args, context) {
      var command = canon.getCommand(args.search);
      if (command) {
        return context.typedData('commandData', {
          command: command,
          subcommands: getSubCommands(command)
        });
      }

      return context.typedData('commandsData', {
        prefix: args.search,
        commands: getMatchingCommands(args.search)
      });
    }
  },
  {
    // Convert a command into an HTML man page
    item: 'converter',
    from: 'commandData',
    to: 'view',
    exec: function(commandData, context) {
      return {
        html: require('text!gcli/commands/help_man.html'),
        options: { allowEval: true, stack: 'help_man.html' },
        data: getHelpManData(commandData, context),
        css: require('text!gcli/commands/help.css'),
        cssId: 'gcli-help'
      };
    }
  },
  {
    // Convert a command into a string based man page
    item: 'converter',
    from: 'commandData',
    to: 'stringView',
    exec: function(commandData, context) {
      return {
        html: require('text!gcli/commands/help_man.txt'),
        options: { allowEval: true, stack: 'help_man.txt' },
        data: getHelpManData(commandData, context)
      };
    }
  },
  {
    // Convert a list of commands into a formatted list
    item: 'converter',
    from: 'commandsData',
    to: 'view',
    exec: function(commandsData, context) {
      return {
        html: require('text!gcli/commands/help_list.html'),
        options: { allowEval: true, stack: 'help_list.html' },
        data: getHelpListData(commandsData, context),
        css: require('text!gcli/commands/help.css'),
        cssId: 'gcli-help'
      };
    }
  },
  {
    // Convert a list of commands into a formatted list
    item: 'converter',
    from: 'commandsData',
    to: 'stringView',
    exec: function(commandsData, context) {
      return {
        html: require('text!gcli/commands/help_list.txt'),
        options: { allowEval: true, stack: 'help_list.txt' },
        data: getHelpListData(commandsData, context)
      };
    }
  }
];

});
define("text!gcli/commands/help_man.html", [], "\n" +
  "<div>\n" +
  "  <p class=\"gcli-help-header\">\n" +
  "    ${l10n.helpManSynopsis}:\n" +
  "    <span class=\"gcli-out-shortcut\" data-command=\"${command.name}\"\n" +
  "        onclick=\"${onclick}\" ondblclick=\"${ondblclick}\">\n" +
  "      ${command.name}\n" +
  "      <span foreach=\"param in ${command.params}\">${getSynopsis(param)} </span>\n" +
  "    </span>\n" +
  "  </p>\n" +
  "\n" +
  "  <p class=\"gcli-help-description\">${describe(command)}</p>\n" +
  "\n" +
  "  <div if=\"${command.exec}\">\n" +
  "    <div foreach=\"groupName in ${command.paramGroups}\">\n" +
  "      <p class=\"gcli-help-header\">${groupName}:</p>\n" +
  "      <ul class=\"gcli-help-parameter\">\n" +
  "        <li if=\"${command.params.length === 0}\">${l10n.helpManNone}</li>\n" +
  "        <li foreach=\"param in ${command.paramGroups[groupName]}\">\n" +
  "          <code>${getSynopsis(param)}</code> <em>${getTypeDescription(param)}</em>\n" +
  "          <br/>\n" +
  "          ${describe(param)}\n" +
  "        </li>\n" +
  "      </ul>\n" +
  "    </div>\n" +
  "  </div>\n" +
  "\n" +
  "  <div if=\"${!command.exec}\">\n" +
  "    <p class=\"gcli-help-header\">${l10n.subCommands}:</p>\n" +
  "    <ul class=\"gcli-help-${subcommands}\">\n" +
  "      <li if=\"${subcommands.length === 0}\">${l10n.subcommandsNone}</li>\n" +
  "      <li foreach=\"subcommand in ${subcommands}\">\n" +
  "        ${subcommand.name}: ${subcommand.description}\n" +
  "        <span class=\"gcli-out-shortcut\" data-command=\"help ${subcommand.name}\"\n" +
  "            onclick=\"${onclick}\" ondblclick=\"${ondblclick}\">\n" +
  "          help ${subcommand.name}\n" +
  "        </span>\n" +
  "      </li>\n" +
  "    </ul>\n" +
  "  </div>\n" +
  "\n" +
  "</div>\n" +
  "");

define("text!gcli/commands/help.css", [], "\n" +
  ".gcli-help-name {\n" +
  "  text-align: end;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-arrow {\n" +
  "  color: #AAA;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-description {\n" +
  "  margin: 0 20px;\n" +
  "  padding: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-parameter {\n" +
  "  margin: 0 30px;\n" +
  "  padding: 0;\n" +
  "}\n" +
  "\n" +
  ".gcli-help-header {\n" +
  "  margin: 10px 0 6px;\n" +
  "}\n" +
  "");

define("text!gcli/commands/help_man.txt", [], "\n" +
  "<div>## ${command.name}\n" +
  "\n" +
  "# ${l10n.helpManSynopsis}: ${command.name} <loop foreach=\"param in ${command.params}\">${getSynopsis(param)} </loop>\n" +
  "\n" +
  "# ${l10n.helpManDescription}:\n" +
  "\n" +
  "${command.manual || command.description}\n" +
  "\n" +
  "<loop foreach=\"groupName in ${command.paramGroups}\">\n" +
  "<span if=\"${command.exec}\"># ${groupName}:\n" +
  "\n" +
  "<span if=\"${command.params.length === 0}\">${l10n.helpManNone}</span><loop foreach=\"param in ${command.paramGroups[groupName]}\">* ${param.name}: ${getTypeDescription(param)}\n" +
  "  ${param.manual || param.description}\n" +
  "</loop>\n" +
  "</span>\n" +
  "</loop>\n" +
  "\n" +
  "<span if=\"${!command.exec}\"># ${l10n.subCommands}:\n" +
  "\n" +
  "<span if=\"${subcommands.length === 0}\">${l10n.subcommandsNone}</span>\n" +
  "<loop foreach=\"subcommand in ${subcommands}\">* ${subcommand.name}: ${subcommand.description}\n" +
  "</loop>\n" +
  "</div>\n" +
  "");

define("text!gcli/commands/help_list.html", [], "\n" +
  "<div>\n" +
  "  <div if=\"${includeIntro}\">\n" +
  "    <p>GCLI is an experiment to create a highly usable command line for web developers.</p>\n" +
  "    <p>\n" +
  "      Useful links:\n" +
  "      <a href='https://github.com/joewalker/gcli'>Source</a> (Apache-2.0),\n" +
  "      <a href='https://github.com/joewalker/gcli/blob/master/docs/index.md'>Documentation</a> (for users/embedders),\n" +
  "      <a href='https://wiki.mozilla.org/DevTools/Features/GCLI'>Mozilla feature page</a> (for GCLI in the web console).\n" +
  "    </p>\n" +
  "  </div>\n" +
  "\n" +
  "  <p>${heading}</p>\n" +
  "\n" +
  "  <table>\n" +
  "    <tr foreach=\"command in ${matchingCommands}\">\n" +
  "      <td class=\"gcli-help-name\">${command.name}</td>\n" +
  "      <td class=\"gcli-help-arrow\">-</td>\n" +
  "      <td>\n" +
  "        ${command.description}\n" +
  "        <span class=\"gcli-out-shortcut\"\n" +
  "            onclick=\"${onclick}\" ondblclick=\"${ondblclick}\"\n" +
  "            data-command=\"help ${command.name}\">help ${command.name}</span>\n" +
  "      </td>\n" +
  "    </tr>\n" +
  "  </table>\n" +
  "</div>\n" +
  "");

define("text!gcli/commands/help_list.txt", [], "<pre><span if=\"${includeIntro}\">## Welcome to GCLI\n" +
  "\n" +
  "GCLI is an experiment to create a highly usable JavaScript command line for developers.\n" +
  "\n" +
  "Useful links:\n" +
  "- Source (Apache-2.0): https://github.com/joewalker/gcli\n" +
  "- Documentation: https://github.com/joewalker/gcli/blob/master/docs/index.md</span>\n" +
  "\n" +
  "# ${heading}\n" +
  "\n" +
  "<loop foreach=\"command in ${matchingCommands}\">${command.name} &#x2192; ${command.description}\n" +
  "</loop></pre>");

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

define('gcli/commands/intro', ['require', 'exports', 'module' , 'util/l10n', 'gcli/ui/intro'], function(require, exports, module) {

'use strict';

var l10n = require('util/l10n');
var intro = require('gcli/ui/intro');

exports.items = [
  {
    item: 'converter',
    from: 'intro',
    to: 'view',
    exec: intro.createView
  },
  {
    item: 'command',
    name: 'intro',
    description: l10n.lookup('introDesc'),
    manual: l10n.lookup('introManual'),
    returnType: 'intro',
    exec: function(args, context) {
      // The intro command is pure formatting - no data
    }
  }
];

});
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

define('gcli/commands/pref_list', ['require', 'exports', 'module' , 'util/util', 'util/l10n', 'gcli/settings', 'text!gcli/commands/pref_list_outer.html', 'text!gcli/commands/pref_list.css', 'text!gcli/commands/pref_list_inner.html'], function(require, exports, module) {

'use strict';

var util = require('util/util');
var l10n = require('util/l10n');
var settings = require('gcli/settings');

/**
 * Format a list of settings for display
 */
var prefsData = {
  item: 'converter',
  from: 'prefsData',
  to: 'view',
  exec: function(prefsData, conversionContext) {
    var prefList = new PrefList(prefsData, conversionContext);
    return {
      html: require('text!gcli/commands/pref_list_outer.html'),
      data: prefList,
      options: {
        blankNullUndefined: true,
        allowEval: true,
        stack: 'pref_list_outer.html'
      },
      css: require('text!gcli/commands/pref_list.css'),
      cssId: 'gcli-pref-list'
    };
  }
};

/**
 * 'pref list' command
 */
var prefList = {
  item: 'command',
  name: 'pref list',
  description: l10n.lookup('prefListDesc'),
  manual: l10n.lookup('prefListManual'),
  params: [
    {
      name: 'search',
      type: 'string',
      defaultValue: null,
      description: l10n.lookup('prefListSearchDesc'),
      manual: l10n.lookup('prefListSearchManual')
    }
  ],
  returnType: 'prefsData',
  exec: function(args, context) {
    var deferred = context.defer();

    // This can be slow, get out of the way of the main thread
    setTimeout(function() {
      var prefsData = {
        settings: settings.getAll(args.search),
        search: args.search
      };
      deferred.resolve(prefsData);
    }.bind(this), 10);

    return deferred.promise;
  }
};

/**
 * A manager for our version of about:config
 */
function PrefList(prefsData, conversionContext) {
  this.search = prefsData.search;
  this.settings = prefsData.settings;
  this.conversionContext = conversionContext;
  this.url = util.createUrlLookup(module);
  this.edit = this.url('pref_list_edit.png');
}

/**
 * A load event handler registered by the template engine so we can load the
 * inner document
 */
PrefList.prototype.onLoad = function(element) {
  var table = element.querySelector('.gcli-pref-list-table');
  this.updateTable(table);
  return '';
};

/**
 * Forward localization lookups
 */
PrefList.prototype.l10n = l10n.propertyLookup;

/**
 * Called from the template onkeyup for the filter element
 */
PrefList.prototype.updateTable = function(table) {
  util.clearElement(table);
  var view = this.conversionContext.createView({
    html: require('text!gcli/commands/pref_list_inner.html'),
    options: { blankNullUndefined: true, stack: 'pref_list_inner.html' },
    data: this
  });
  var child = view.toDom(table.ownerDocument);

  util.clearElement(table);
  table.appendChild(child);
};

PrefList.prototype.onFilterChange = function(ev) {
  if (ev.target.value !== this.search) {
    this.search = ev.target.value;

    var root = ev.target.parentNode.parentNode;
    var table = root.querySelector('.gcli-pref-list-table');
    this.updateTable(table);
  }
};

PrefList.prototype.onSetClick = function(ev) {
  var typed = ev.currentTarget.getAttribute('data-command');
  this.conversionContext.update(typed);
};

exports.items = [ prefsData, prefList ];


});
define("text!gcli/commands/pref_list_outer.html", [], "<div ignore=\"${onLoad(__element)}\">\n" +
  "  <!-- This is broken, and unimportant. Comment out for now\n" +
  "  <div class=\"gcli-pref-list-filter\">\n" +
  "    ${l10n.prefOutputFilter}:\n" +
  "    <input onKeyUp=\"${onFilterChange}\" value=\"${search}\"/>\n" +
  "  </div>\n" +
  "  -->\n" +
  "  <table class=\"gcli-pref-list-table\">\n" +
  "    <colgroup>\n" +
  "      <col class=\"gcli-pref-list-name\"/>\n" +
  "      <col class=\"gcli-pref-list-value\"/>\n" +
  "    </colgroup>\n" +
  "    <tr>\n" +
  "      <th>${l10n.prefOutputName}</th>\n" +
  "      <th>${l10n.prefOutputValue}</th>\n" +
  "    </tr>\n" +
  "  </table>\n" +
  "  <div class=\"gcli-pref-list-scroller\">\n" +
  "    <table class=\"gcli-pref-list-table\" save=\"${table}\">\n" +
  "    </table>\n" +
  "  </div>\n" +
  "</div>\n" +
  "");

define("text!gcli/commands/pref_list.css", [], "\n" +
  ".gcli-pref-list-scroller {\n" +
  "  max-height: 200px;\n" +
  "  overflow-y: auto;\n" +
  "  overflow-x: hidden;\n" +
  "  display: inline-block;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-table {\n" +
  "  width: 500px;\n" +
  "  table-layout: fixed;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-table tr > th {\n" +
  "  text-align: left;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-table tr > td {\n" +
  "  text-overflow: elipsis;\n" +
  "  word-wrap: break-word;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-name {\n" +
  "  width: 70%;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-command {\n" +
  "  display: none;\n" +
  "}\n" +
  "\n" +
  ".gcli-pref-list-row:hover .gcli-pref-list-command {\n" +
  "  /* 'pref list' is a bit broken and unimportant. Band-aid follows */\n" +
  "  /* display: inline-block; */\n" +
  "}\n" +
  "");

define("text!gcli/commands/pref_list_inner.html", [], "<table>\n" +
  "  <colgroup>\n" +
  "    <col class=\"gcli-pref-list-name\"/>\n" +
  "    <col class=\"gcli-pref-list-value\"/>\n" +
  "  </colgroup>\n" +
  "  <tr class=\"gcli-pref-list-row\" foreach=\"setting in ${settings}\">\n" +
  "    <td>${setting.name}</td>\n" +
  "    <td onclick=\"${onSetClick}\" data-command=\"pref set ${setting.name} \">\n" +
  "      ${setting.value}\n" +
  "      <img class=\"gcli-pref-list-command\" _src=\"${edit}\"/>\n" +
  "    </td>\n" +
  "  </tr>\n" +
  "</table>\n" +
  "");

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

define('gcli/commands/pref', ['require', 'exports', 'module' , 'util/l10n', 'gcli/settings', 'text!gcli/commands/pref_set_check.html'], function(require, exports, module) {

'use strict';

var l10n = require('util/l10n');
var settings = require('gcli/settings');

exports.items = [
  {
    // 'pref' command
    item: 'command',
    name: 'pref',
    description: l10n.lookup('prefDesc'),
    manual: l10n.lookup('prefManual')
  },
  {
    // 'pref show' command
    item: 'command',
    name: 'pref show',
    description: l10n.lookup('prefShowDesc'),
    manual: l10n.lookup('prefShowManual'),
    params: [
      {
        name: 'setting',
        type: 'setting',
        description: l10n.lookup('prefShowSettingDesc'),
        manual: l10n.lookup('prefShowSettingManual')
      }
    ],
    exec: function(args, context) {
      return l10n.lookupFormat('prefShowSettingValue',
                               [ args.setting.name, args.setting.value ]);
    }
  },
  {
    // 'pref set' command
    item: 'command',
    name: 'pref set',
    description: l10n.lookup('prefSetDesc'),
    manual: l10n.lookup('prefSetManual'),
    params: [
      {
        name: 'setting',
        type: 'setting',
        description: l10n.lookup('prefSetSettingDesc'),
        manual: l10n.lookup('prefSetSettingManual')
      },
      {
        name: 'value',
        type: 'settingValue',
        description: l10n.lookup('prefSetValueDesc'),
        manual: l10n.lookup('prefSetValueManual')
      }
    ],
    exec: function(args, context) {
      var allowSet = settings.getSetting('allowSet');
      if (!allowSet.value &&
          args.setting.name !== allowSet.name) {
        return context.typedData('prefSetWarning', null);
      }

      args.setting.value = args.value;
    }
  },
  {
    // 'pref reset' command
    item: 'command',
    name: 'pref reset',
    description: l10n.lookup('prefResetDesc'),
    manual: l10n.lookup('prefResetManual'),
    params: [
      {
        name: 'setting',
        type: 'setting',
        description: l10n.lookup('prefResetSettingDesc'),
        manual: l10n.lookup('prefResetSettingManual')
      }
    ],
    exec: function(args, context) {
      args.setting.setDefault();
    }
  },
  {
    // Record if the user has clicked on 'Got It!'
    item: 'setting',
    name: 'allowSet',
    type: 'boolean',
    description: l10n.lookup('allowSetDesc'),
    defaultValue: false
  },
  {
    // A view to hold an 'are you sure' warning
    item: 'converter',
    from: 'prefSetWarning',
    to: 'view',
    exec: function(data, context) {
      var allowSet = settings.getSetting('settings');
      return {
        html: require('text!gcli/commands/pref_set_check.html'),
        options: { allowEval: true, stack: 'pref_set_check.html' },
        data: {
          l10n: l10n.propertyLookup,
          activate: function() {
            context.updateExec('pref set ' + allowSet.name + ' true');
          }
        }
      };
    }
  }
];


});
define("text!gcli/commands/pref_set_check.html", [], "<div>\n" +
  "  <p><strong>${l10n.prefSetCheckHeading}</strong></p>\n" +
  "  <p>${l10n.prefSetCheckBody}</p>\n" +
  "  <button onclick=\"${activate}\">${l10n.prefSetCheckGo}</button>\n" +
  "</div>\n" +
  "");

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

define('demo/commands/alert', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

exports.items = [
  {
    // Arm window.alert with metadata
    item: 'command',
    name: 'alert',
    description: 'Show an alert dialog',
    params: [
      {
        name: 'message',
        type: 'string',
        description: 'Message to display'
      }
    ],
    exec: function(args, context) {
      window.alert(args.message);
    }
  }
];

});
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

define('demo/commands/bugs', ['require', 'exports', 'module' , 'text!demo/commands/bugs.html'], function(require, exports, module) {

'use strict';

exports.items = [
  {
    item: 'converter',
    from: 'bugz',
    to: 'view',
    exec: function(bugz, context) {
      return {
        html: require('text!demo/commands/bugs.html'),
        data: bugz
      };
    }
  },
  {
    item: 'command',
    name: 'bugz',
    returnType: 'bugz',
    description: 'List the GCLI bugs open in Bugzilla',
    exec: function(args, context) {
      return queryBugzilla(args, context).then(filterReply);
    }
  }
];

/**
 * Simple wrapper for querying bugzilla.
 * @see https://wiki.mozilla.org/Bugzilla:REST_API
 * @see https://wiki.mozilla.org/Bugzilla:REST_API:Search
 * @see http://www.bugzilla.org/docs/developer.html
 * @see https://harthur.wordpress.com/2011/03/31/bz-js/
 * @see https://github.com/harthur/bz.js
 */
function queryBugzilla(args, context) {
  var deferred = context.defer();

  var url = 'https://api-dev.bugzilla.mozilla.org/1.1/bug?' +
      'short_desc=GCLI' +
      '&short_desc_type=allwords' +
      '&bug_status=UNCONFIRMED' +
      '&bug_status=NEW' +
      '&bug_status=ASSIGNED' +
      '&bug_status=REOPENED';

  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.setRequestHeader('Accept', 'application/json');
  req.setRequestHeader('Content-type', 'application/json');
  req.onreadystatechange = function(event) {
    if (req.readyState == 4) {
      if (req.status >= 300 || req.status < 200) {
        deferred.reject('Error: ' + JSON.stringify(req));
        return;
      }

      try {
        var json = JSON.parse(req.responseText);
        if (json.error) {
          deferred.reject('Error: ' + json.error.message);
        }
        else {
          deferred.resolve(json);
        }
      }
      catch (ex) {
        deferred.reject('Invalid response: ' + ex + ': ' + req.responseText);
      }
    }
  };
  req.send();

  return deferred.promise;
}

/**
 * Filter the output from Bugzilla for display
 */
function filterReply(json) {
  json.bugs.forEach(function(bug) {
    if (bug.target_milestone === '---') {
      bug.target_milestone = 'Future';
    }
  });

  json.bugs.sort(function(bug1, bug2) {
    var ms = bug1.target_milestone.localeCompare(bug2.target_milestone);
    if (ms !== 0) {
      return ms;
    }
    return bug1.priority.localeCompare(bug2.priority);
  });

  return json;
}


});
define("text!demo/commands/bugs.html", [], "\n" +
  "<div>\n" +
  "  <p>\n" +
  "    Open GCLI meta-bugs\n" +
  "    (i.e. <a target=\"_blank\" href=\"https://bugzilla.mozilla.org/buglist.cgi?list_id=2622790;short_desc=GCLI;resolution=---;resolution=DUPLICATE;query_format=advanced;bug_status=UNCONFIRMED;bug_status=NEW;bug_status=ASSIGNED;bug_status=REOPENED;short_desc_type=allwords\">this search</a>):\n" +
  "  </p>\n" +
  "  <table>\n" +
  "    <thead>\n" +
  "      <tr>\n" +
  "        <th>ID</th>\n" +
  "        <th>Milestone</th>\n" +
  "        <th>Pri</th>\n" +
  "        <th>Summary</th>\n" +
  "      </tr>\n" +
  "    </thead>\n" +
  "    <tbody>\n" +
  "      <tr foreach=\"bug in ${bugs}\">\n" +
  "        <td><a target=\"_blank\" href=\"https://bugzilla.mozilla.org/show_bug.cgi?id=${bug.id}\">${bug.id}</a></td>\n" +
  "        <td>${bug.target_milestone}</td>\n" +
  "        <td>${bug.priority}</td>\n" +
  "        <td>${bug.summary}</td>\n" +
  "      </tr>\n" +
  "    </tbody>\n" +
  "  </table>\n" +
  "</div>\n" +
  "");

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

define('demo/commands/demo', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

exports.items = [
  {
    // Parent Command
    item: 'command',
    name: 'gcli',
    description: 'Commands for playing with the UI'
  },
  {
    // 'gcli onestring' command
    item: 'command',
    name: 'gcli onestring',
    description: 'Single string parameter',
    params: [
      { name: 'text', type: 'string', description: 'Demo param' }
    ],
    exec: function(args, context) {
      return 'text=' + args.text;
    }
  },
  {
    // 'gcli twostrings' command
    item: 'command',
    name: 'gcli twostrings',
    description: '2 string parameters',
    params: [
      { name: 'p1', type: 'string', description: 'First param' },
      { name: 'p2', type: 'string', description: 'Second param' }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\', p2=\'' + args.p2 + '\'';
    }
  },
  {
    // 'gcli twonums' command
    item: 'command',
    name: 'gcli twonums',
    description: '2 numeric parameters',
    params: [
      {
        name: 'p1',
        type: 'number',
        description: 'First param'
      },
      {
        name: 'p2',
        defaultValue: 8,
        type: { name: 'number', allowFloat: true, min: -20, max: 42, step: 5 },
        description: 'Second param'
      },
      {
        group: 'Options',
        params: [
          {
            name: 'all',
            description: 'All your base',
            type: 'boolean'
          },
          {
            name: 'verbose',
            description: 'Be verbose',
            type: 'boolean'
          },
          {
            name: 'message',
            description: 'A message',
            type: 'string',
            defaultValue: 'nothing'
          },
          {
            name: 'browser',
            description: 'Pick a browser',
            type: {
              name: 'selection',
              lookup: [
                { name: 'chrome', value: 1 },
                { name: 'firefox', value: 2 },
                { name: 'ie', value: 3 },
                { name: 'opera', value: 4 },
                { name: 'safari', value: 5 }
              ]
            },
            defaultValue: 3
          }
        ]
      }
    ],
    exec: function(args, context) {
      return 'p1=' + args.p1 + ', p2=' + args.p2;
    }
  },
  {
    // 'gcli selboolnum' command
    item: 'command',
    name: 'gcli selboolnum',
    description: 'A selection, a boolean and a number',
    params: [
      {
        name: 'sel',
        type: {
          name: 'selection',
          lookup: [
            { name: 'firefox', value: 4 },
            { name: 'chrome', value: 12 },
            { name: 'ie', value: 9 },
            { name: 'opera', value: 10 },
            { name: 'safari', value: 5 }
          ]
        },
        description: 'First param'
      },
      {
        name: 'bool',
        type: 'boolean',
        description: 'A boolean param'
      },
      {
        name: 'num',
        type: { name: 'number', min: -4, max: 42, step: 5 },
        description: 'A number param'
      }
    ],
    exec: function(args, context) {
      return 'p1=' + args.p1 + ', p2=' + args.p2 + ', p3=' + args.p3;
    }
  },
  {
    // 'gcli node' command
    item: 'command',
    name: 'gcli node',
    description: 'Single node parameter',
    params: [
      { name: 'node', type: 'node', description: 'CSS selector pointing at a single node' }
    ],
    exec: function(args, context) {
      return 'node=' + args.node;
    }
  },
  {
    // 'gcli onedate' command
    item: 'command',
    name: 'gcli onedate',
    description: 'One date parameter',
    params: [
      {
        name: 'date',
        type: { name: 'date', step: 5 },
        description: 'Demo param'
      }
    ],
    exec: function(args, context) {
      return 'date=' + args.date;
    }
  },
  {
    // 'gcli twodates' commands
    item: 'command',
    name: 'gcli twodates',
    description: 'Two date parameters',
    params: [
      {
        name: 'date1',
        type: { name: 'date', step: 5 },
        description: 'Demo param 1'
      },
      {
        name: 'date2',
        type: { name: 'date', step: 2 },
        description: 'Demo param 2'
      }
    ],
    exec: function(args, context) {
      return 'date1=' + args.date1 + ' date2=' + args.date2;
    }
  },
  {
    // 'gcli file' command
    item: 'command',
    name: 'gcli open',
    description: 'a file param in open mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'yes'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli saveas' command
    item: 'command',
    name: 'gcli saveas',
    description: 'a file param in saveas mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'no'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli save' command
    item: 'command',
    name: 'gcli save',
    description: 'a file param in save mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'maybe'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli cd' command
    item: 'command',
    name: 'gcli cd',
    description: 'a file param in cd mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'directory',
          existing: 'yes'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli mkdir' command
    item: 'command',
    name: 'gcli mkdir',
    description: 'a file param in mkdir mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'directory',
          existing: 'no'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli rm' command
    item: 'command',
    name: 'gcli rm',
    description: 'a file param in rm mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'any',
          existing: 'yes'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  }
];


});
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

define('demo/commands/echo', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

exports.items = [
  {
    item: 'command',
    name: 'echo',
    description: {
      root: 'Show a message',
      fr_fr: 'Afficher un message'
    },
    params: [
      {
        name: 'message',
        type: 'string',
        description: {
          root: 'The message to output',
          fr_fr: 'Le message à afficher'
        }
      }
    ],
    returnType: 'string',
    exec: function(args, context) {
      return args.message;
    }
  }
];


});
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

define('demo/commands/edit', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

exports.items = [
  {
    item: 'command',
    name: 'edit',
    description: 'Edit a file',
    params: [
      {
        name: 'resource',
        type: { name: 'resource', include: 'text/css' },
        description: 'The resource to edit'
      }
    ],
    returnType: 'html',
    exec: function(args, context) {
      var deferred = context.defer();
      args.resource.loadContents(function(data) {
        deferred.resolve('<p>This is just a demo</p>' +
                        '<textarea rows=5 cols=80>' + data + '</textarea>');
      });
      return deferred.promise;
    }
  }
];


});
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

define('demo/commands/sleep', ['require', 'exports', 'module' ], function(require, exports, module) {

'use strict';

exports.items = [
  {
    item: 'command',
    name: 'sleep',
    description: 'Wait for a while',
    params: [
      {
        name: 'length',
        type: { name: 'number', min: 1 },
        description: 'How long to wait (s)'
      }
    ],
    returnType: 'string',
    exec: function(args, context) {
      var deferred = context.defer();
      window.setTimeout(function() {
        deferred.resolve('Done');
      }, args.length * 1000);
      return deferred.promise;
    }
  }
];


});
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

define('demo/commands/theme', ['require', 'exports', 'module' , 'text!demo/commands/theme.html'], function(require, exports, module) {

'use strict';

exports.items = [
  {
    item: 'type',
    name: 'theme',
    parent: 'selection',
    data: [ 'dark', 'light' ]
  },
  {
    item: 'command',
    name: 'theme',
    description: 'Change themes',
    params: [
      {
        name: 'theme',
        type: 'theme',
        description: 'The theme to use'
      },
      {
        name: 'show',
        type: 'boolean',
        description: 'Display a preview of the current theme',
        hidden: true,
        option: true
      }
    ],
    exec: function(args, context) {
      if (args.show) {
        return context.typedData('theme-preview', args);
      }
      else {
        return context.typedData('theme-change', args);
      }
    }
  },
  {
    item: 'converter',
    from: 'theme-change',
    to: 'view',
    exec: function(args, context) {
      var body = context.document.body;

      // Remove existing themes. This is very dependent on how themes are
      // setup. This code will probably require local customization
      exports.items[0].data.forEach(function(theme) {
        body.classList.remove(theme);
      });
      body.classList.add(args.theme);

      return {
        html: '<div>Set theme to ${theme}</div>',
        data: args,
        options: { allowEval: true, stack: 'theme.html#change' }
      };
    }
  },
  {
    item: 'converter',
    from: 'theme-preview',
    to: 'view',
    exec: function(args, context) {
      return {
        html: require('text!demo/commands/theme.html'),
        data: args,
        options: { allowEval: true, stack: 'theme.html#preview' }
      };
    }
  }
];


});
define("text!demo/commands/theme.html", [], "\n" +
  "<div class=\"${theme}\">\n" +
  "  <table class=\"theme-body\" style=\"padding: 10px;\">\n" +
  "    <tbody>\n" +
  "      <tr foreach=\"className in ${[ 'theme-selected', 'theme-link', 'theme-comment', 'theme-gutter', 'theme-separator', 'theme-fg-color1', 'theme-fg-color2', 'theme-fg-color3', 'theme-fg-color4', 'theme-fg-color5', 'theme-fg-color6', 'theme-fg-color7' ]}\">\n" +
  "        <td>${className}</td>\n" +
  "        <td class=\"${className}\">Lorem ipsum dolor sit amet ↑ → ↓ ← ██████████</td>\n" +
  "      </tr>\n" +
  "    </tbody>\n" +
  "  </table>\n" +
  "</div>\n" +
  "");

define("text!/gcli/commands/pref_list_edit.png", [], "data:image/png;base64,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");

define("text!/gcli/ui/images/closer.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAj9JREFUeNp0ks+LUlEUx7/vV1o8Z8wUx3IEHcQmiBiQlomjRNCiZpEuEqF/oEUwq/6EhvoHggmRcJUQBM1CRJAW0aLIaGQimZJxJsWxyV/P9/R1zzWlFl04vPvOPZ9z7rnnK5imidmKRCIq+zxgdoPZ1T/ut8xeM3tcKpW6s1hhBkaj0Qj7bDebTX+324WmadxvsVigqipcLleN/d4rFoulORiLxTZY8ItOp8MBCpYkiYPj8Xjus9vtlORWoVB4KcTjcQc732dLpSRXvCZaAws6Q4WDdqsO52kNH+oCRFGEz+f7ydwBKRgMPmTXi49GI1x2D/DsznesB06ws2eDbI7w9HYN6bVjvGss4KAjwDAMq81mM2SW5Wa/3weBbz42UL9uYnVpiO2Nr9ANHSGXib2Wgm9tCYIggGKJEVkvlwgi5/FQRmTLxO6hgJVzI1x0T/fJrBtHJxPeL6tI/fsZLA6ot8lkQi8HRVbw94gkWYI5MaHrOjcCGSNRxZosy9y5cErDzn0Dqx7gcwO8WtBp4PndI35GMYqiUMUvBL5yOBz8yRfFNpbPmqgcCFh/IuHa1nR/YXGM8+oUpFhihEQiwcdRLpfVRqOBtWXWq34Gra6AXq8Hp2piZcmKT4cKnE4nwuHwdByVSmWQz+d32WCTlHG/qaHHREN9kgi0sYQfv0R4PB4EAgESQDKXy72fSy6VSnHJVatVf71eR7vd5n66mtfrRSgU4pLLZrOlf7RKK51Ok8g3/yPyR5lMZi7y3wIMAME4EigHWgKnAAAAAElFTkSuQmCC");

define("text!/gcli/ui/images/dot_clear.gif", [], "data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAEBMgA7");

define("text!/gcli/ui/images/minus.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAAZiS0dEANIA0gDS7KbF4AAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGw4xMrIJw5EAAAHcSURBVCjPhZIxSxtxGMZ/976XhJA/RA5EAyJcFksnp64hjUPBoXRyCYLQTyD0UxScu0nFwalCQSgFCVk7dXAwUAiBDA2RO4W7yN1x9+9gcyhU+pteHt4H3pfncay1LOl0OgY4BN4Ar/7KP4BvwNFwOIyWu87S2O12O8DxfD73oygiSRIAarUaxhhWV1fHwMFgMBiWxl6v9y6Koi+3t7ckSUKtVkNVAcjzvNRWVlYwxry9vLz86uzs7HjAZDKZGGstjUaDfxHHMSLC5ubmHdB2VfVwNpuZ5clxHPMcRVFwc3PTXFtbO3RFZHexWJCmabnweAaoVqvlv4vFAhHZdVX1ZZqmOI5DURR8fz/lxbp9Yrz+7bD72SfPcwBU1XdF5N5aWy2KgqIoeBzPEnWVLMseYnAcRERdVR27rrsdxzGqyutP6898+GBsNBqo6i9XVS88z9sOggAR4X94noeqXoiIHPm+H9XrdYIgIAxDwjAkTVPCMESzBy3LMprNJr7v34nIkV5dXd2fn59fG2P2siwjSRIqlQrWWlSVJFcqlQqtVot2u40xZu/s7OxnWbl+v98BjkejkT+dTgmCoDxtY2ODra2tMXBweno6fNJVgP39fQN8eKbkH09OTsqS/wHFRdHPfTSfjwAAAABJRU5ErkJggg==");

define("text!/gcli/ui/images/pinaction.png", [], "data:image/png;base64,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");

define("text!/gcli/ui/images/pinin.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC7mlDQ1BJQ0MgUHJvZmlsZQAAeAGFVM9rE0EU/jZuqdAiCFprDrJ4kCJJWatoRdQ2/RFiawzbH7ZFkGQzSdZuNuvuJrWliOTi0SreRe2hB/+AHnrwZC9KhVpFKN6rKGKhFy3xzW5MtqXqwM5+8943731vdt8ADXLSNPWABOQNx1KiEWlsfEJq/IgAjqIJQTQlVdvsTiQGQYNz+Xvn2HoPgVtWw3v7d7J3rZrStpoHhP1A4Eea2Sqw7xdxClkSAog836Epx3QI3+PY8uyPOU55eMG1Dys9xFkifEA1Lc5/TbhTzSXTQINIOJT1cVI+nNeLlNcdB2luZsbIEL1PkKa7zO6rYqGcTvYOkL2d9H5Os94+wiHCCxmtP0a4jZ71jNU/4mHhpObEhj0cGDX0+GAVtxqp+DXCFF8QTSeiVHHZLg3xmK79VvJKgnCQOMpkYYBzWkhP10xu+LqHBX0m1xOv4ndWUeF5jxNn3tTd70XaAq8wDh0MGgyaDUhQEEUEYZiwUECGPBoxNLJyPyOrBhuTezJ1JGq7dGJEsUF7Ntw9t1Gk3Tz+KCJxlEO1CJL8Qf4qr8lP5Xn5y1yw2Fb3lK2bmrry4DvF5Zm5Gh7X08jjc01efJXUdpNXR5aseXq8muwaP+xXlzHmgjWPxHOw+/EtX5XMlymMFMXjVfPqS4R1WjE3359sfzs94i7PLrXWc62JizdWm5dn/WpI++6qvJPmVflPXvXx/GfNxGPiKTEmdornIYmXxS7xkthLqwviYG3HCJ2VhinSbZH6JNVgYJq89S9dP1t4vUZ/DPVRlBnM0lSJ93/CKmQ0nbkOb/qP28f8F+T3iuefKAIvbODImbptU3HvEKFlpW5zrgIXv9F98LZua6N+OPwEWDyrFq1SNZ8gvAEcdod6HugpmNOWls05Uocsn5O66cpiUsxQ20NSUtcl12VLFrOZVWLpdtiZ0x1uHKE5QvfEp0plk/qv8RGw/bBS+fmsUtl+ThrWgZf6b8C8/UXAeIuJAAAACXBIWXMAAAsTAAALEwEAmpwYAAABZ0lEQVQ4Ea2TPUsDQRCGZ89Eo4FACkULEQs1CH4Uamfjn7GxEYJFIFXgChFsbPwzNnZioREkaiHBQtEiEEiMRm/dZ8OEGAxR4sBxx877Pju7M2estTJIxLrNuVwuMxQEx0ZkzcFHyRtjXt02559RtB2GYanTYzoryOfz+6l4Nbszf2niwffKmpGRo9sVW22mDgqFwp5C2gDMm+P32a3JB1N+n5JifUGeP9JeNxGryPLYjcwMP8rJ07Q9fZltQzyAstOJ2vVu5sKc1ZZkRBrOcKeb+HexPidvkpCN5JUcllZtpZFc5DgBWc5M2eysZuMuofMBSA4NWjx4PUCsXefMlI0QY3ewRg4NWi4ZTQsgrjYXema+e4VqtEMK6KXvu+4B9Bklt90vVKMeD2BI6DOt4rZ/Gk7WyKFBi4fNPIAJY0joM61SCCZ9tI1o0OIB8D+DBIkYaJRbCBH9mZgNt+bb++ufSSF/eX8BYcDeAzuQJVUAAAAASUVORK5CYII=");

define("text!/gcli/ui/images/pinout.png", [], "data:image/png;base64,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");

define("text!/gcli/ui/images/pins.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAQCAYAAABQrvyxAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGYklEQVRIDbVWe0yURxCf/R735o6DO0FBe0RFsaL4iLXGIKa2SY3P6JGa2GpjlJjUV9NosbU++tYUbEnaQIrVaKJBG7WiNFQFUWO1UUEsVg2CAgoeHHLewcH32O58cBdQsX9Y5+7LfrszOzO/2ZnZj1BKgTBiIwVGVvKd49OVVYunDlXn6wdBKh+ogXrv+DOz1melIb+3LM5fNv2XPYE5EHY+L3PJljN5zavHpJjsQNsA/JJEgyC2+WTjy3b0GfoJW8O4aoHtDwiHQrj5lw1LLyyb1bp5zAjJTus9klrVpdD6TqH2ngVO+0dsRJnp06cLIYU4fx7NnRI3bu7UIYOeJ/McnuY88q3k62gc0S4Dgf5qhICQtIXS2lqD7BhSduPk3YfyzXaANhBBJDxYdUqCywB2qS4RdyUuSkTF/VJxcbH5j8N7/75RuFrN3Zh8OS8zqf5m4UpPeenOyP42dbtBeuvVnCdkK1e4PfPouX03mo9se+c33M8wqDk5Ofqed8REUTicQhbySUxp9u3KlMSHTtrFU6Kyn03lz15PPpW25vsZeYSIKyiVURcqeZJOH9lTNZLfnxRjU/uwrjbEUBWsapcSO2Hq4k0VfZg9EzxdDNCEjDxgNqRDme9umz/btwlsHRIEePHgAf73RdnHZ6LTuIUBN7OBQ+c1Fdnp6cZ1BQUdeRuWZi97o3ktDQQkVeFFzqJARd1A5a0Vr7ta6Kp6TZjtZ+NTIOoKF6qDrL7e0QQIUCiqMMKk8Z1Q/SCSKvzocf2B6NEN0SQn/kTO6fKJ0zqjZUlQBSpJ0GjR77w0aoc1Pr6S5/kVJrNpakV5hR+LWKN4t7sLX+p0rx2vqSta64olIulUKUgCSXLWE1R4KPPSj+5vhm2hdDOG+CkQBmhhyyKq6SaFYWTn5bB3QJRNz54AuXKn8TJjhu0Wbv+wNEKQjVhnmKopjo4FxXmetCRnC4F7BhCiCUepqAepRh0TM/gjjzOOSK2NgWZPc05qampRWJHb7dbOffep2ednzLzgczlbrQA6gHYF9BYDh9GY+FjddMweHMscmMuep07gXlMQoqw9ALoYu5MJsak9QmJA2IvAgVmoCRciooyPujJtNCv1uHt3TmK9gegFKrG9kh6oXwZiIEAtBIjORGKNTWR/WeW8XVkbjuJepLAyloM8LmTN//njKZPbraATZaLjCHEww9Ei4FFiPg6Ja5gT6gxYgLgnRDHRQwJXbz2GOw0d4A3K4GXlUtMahJjYVxiYbrwOmxIS10bFnIBOSi6Tl9Jgs0zbOEX18wyEwgLPMrxD1Y4aCK8kmTpgYcpAF27Mzs42Hjx4kA8BICUlJfKArR7LcEvTB1xEC9AoEw9OPagWkVU/D1oesmK6U911zEczMVe01oZjiMggg6ux2Qk379qh4rYKet4GjrhhwEteBgBrH8BssoXEtbHzPpSBRRSpqlNpgAiUoxzHKxLRszoVuggIisxaDQWZqkQvQjAoax3NbDbLLGuUEABNGedXqSyLRupXgDT5JfAGZNLio9B0X8Uiwk4w77MDc1D4yejjWtykPS3DX01UDCY/GPQcVDe0QYT0CIxGFvUorfvBxZsRfVrUuWruMBAb/lXCUofoFNZfzGJtowXOX0vwUSFK4BgyMKm6P6s9wQUZld+jrYyMDC0iIQDaJdG4IyZQfL3RfbFcCBIlRgc+u3CjaTApuZ9KsANgG8PNzHlWWD3tCxd6kafNNiFp5HAalAkkJ0SCV2H3CgOD9Nc/FqrXuyb0Eocvfhq171p5eyuJ1omKJEP5rQGe/FOOnXtq335z8YmvYo9cHb2t8spIb3lVSseZW46FlGY/Sk9P50P2w20UlWJUkUHIushfc5PXGAzCo0PlD2pnpCYfCXga3lu+fPlevEhWrVrFyrN/Orfv87FOW9tlqb2Kc9pV8DzioMk3UNUbXM+8B/ATBr8C8CKdvGXWGD/9sqm3dkxtzA4McMjHMB8D2ftheYXo+qzt3pXvz8/PP/vk+v8537V+yYW87Zu+RZ1ZbrexoKAA/SBpaWn4+aL5w5zGk+/jW59JiMkESW5urpiVlWXENRb1H/Yf2I9txIxz5IdkX3TsraukpsbQjz6090yb4XsAvQoRE0YvJdamtIIbOnRoUVlZ2ftsLVQzIdEXHntsaZdimssVfCpFui109+BnWPsXaWLI/zactygAAAAASUVORK5CYII=");

define("text!/gcli/ui/images/plus.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAAZiS0dEANIA0gDS7KbF4AAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGw4yFTwuJTkAAAH7SURBVCjPdZKxa1NRFMZ/956XZMgFyyMlCZRA4hBx6lBcQ00GoYi4tEstFPwLAs7iLDi7FWuHThaUggihBDI5OWRoQAmBQFISQgvvpbwX3rsOaR4K+o2H8zvfOZxPWWtZqVarGaAJPAEe3ZW/A1+Bd+1221v1qhW4vb1dA44mk0nZ8zyCIAAgk8lgjGF9fb0PHF5cXLQTsF6vP/c879P19TVBEJDJZBARAKIoSmpra2sYY561Wq3PqtFouMBgMBgYay3ZbJZ/yfd9tNaUSqUboOKISPPq6sqsVvZ9H4AvL34B8PTj/QSO45jpdHovn883Ha31znw+JwzDpCEMQx4UloM8zyOdTif3zudztNY7jog8DMMQpRRxHPPt5TCBAEZvxlyOFTsfykRRBICIlB2t9a21Nh3HMXEc8+d7VhJHWCwWyzcohdZaHBHpO46z6fs+IsLj94XECaD4unCHL8FsNouI/HRE5Nx13c3ZbIbWOnG5HKtl+53TSq7rIiLnand31wUGnU7HjEYjlFLJZN/3yRnL1FMYY8jlcmxtbd0AFel2u7dnZ2eXxpi9xWJBEASkUimstYgIQSSkUimKxSKVSgVjzN7p6emPJHL7+/s14KjX65WHwyGz2SxZbWNjg2q12gcOT05O2n9lFeDg4MAAr/4T8rfHx8dJyH8DvvbYGzKvWukAAAAASUVORK5CYII=");

define("text!/gcli/ui/images/throbber.gif", [], "data:image/gif;base64,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");

