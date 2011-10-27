/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */


/**
 * Define a module along with a payload.
 * @param moduleName Name for the payload
 * @param deps Ignored. For compatibility with CommonJS AMD Spec
 * @param payload Function with (require, exports, module) params
 */
function define(moduleName, deps, payload) {
  if (typeof moduleName != "string") {
    console.error(this.depth + " Error: Module name is not a string.");
    console.trace();
    return;
  }

  if (arguments.length == 2) {
    payload = deps;
  }

  if (define.debugDependencies) {
    console.log("define: " + moduleName + " -> " + payload.toString()
        .slice(0, 40).replace(/\n/, '\\n').replace(/\r/, '\\r') + "...");
  }

  if (moduleName in define.modules) {
    console.error(this.depth + " Error: Redefining module: " + moduleName);
  }
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


/**
 * Self executing function in which Domain is defined, and attached to define
 */
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
  Domain.prototype.require = function(deps, callback) {
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
      console.error(this.depth + " Missing module: " + moduleName);
      return null;
    }

    var module = define.modules[moduleName];

    if (define.debugDependencies) {
      console.log(this.depth + " Compiling module: " + moduleName);
    }

    if (typeof module == "function") {
      if (define.debugDependencies) {
        this.depth += ".";
      }

      var exports = {};
      try {
        module(this.require.bind(this), exports, { id: moduleName, uri: "" });
      }
      catch (ex) {
        console.error("Error using module: " + moduleName, ex);
        throw ex;
      }
      module = exports;

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
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/index', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/nls/strings', 'gcli/l10n', 'gcli/types/basic', 'gcli/types/javascript', 'gcli/types/node', 'gcli/cli', 'gcli/ui/command_output_view', 'gcli/ui/popup', 'gcli/ui/inputter', 'gcli/ui/hinter', 'gcli/ui/focus', 'gcli/ui/arg_fetch', 'gcli/ui/menu', 'gcli/ui/domtemplate'], function(require, exports, module) {

  // The API for use by command authors
  exports.addCommand = require('gcli/canon').addCommand;
  exports.removeCommand = require('gcli/canon').removeCommand;

  // Internal startup process. Not exported
  require('gcli/nls/strings');
  require('gcli/l10n').registerStringsSource('gcli/nls/strings');

  require('gcli/types/basic').startup();
  require('gcli/types/javascript').startup();
  require('gcli/types/node').startup();
  require('gcli/cli').startup();

  var Requisition = require('gcli/cli').Requisition;

  var CommandOutputListView = require('gcli/ui/command_output_view').CommandOutputListView;
  var Popup = require('gcli/ui/popup').Popup;
  var Inputter = require('gcli/ui/inputter').Inputter;
  var Hinter = require('gcli/ui/hinter').Hinter;
  var FocusManager = require('gcli/ui/focus').FocusManager;

  var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
  var Menu = require('gcli/ui/menu').Menu;
  var Templater = require('gcli/ui/domtemplate').Templater;


  /**
   * Create a basic UI for GCLI on the web
   */
  exports.createView = function(options) {
    options = options || {};

    if (!options.document) {
      options.document = document;
    }

    // The requisition depends on no UI components
    if (options.requisition == null) {
      options.requisition = new Requisition(options.environment, options.document);
    }
    else if (typeof options.requisition === 'function') {
      options.requisition = new options.requisition(options);
    }

    // Create a FocusManager for the various parts to register with
    if (!options.focusManager && options.useFocusManager) {
      options.focusManager = new FocusManager(options);
    }

    // The inputter should depend only on the requisition
    if (options.inputter == null) {
      options.inputter = new Inputter(options);
    }
    else if (typeof options.inputter === 'function') {
      options.inputter = new options.inputter(options);
    }

    // We need to init the popup children before the Popup itself
    if (options.children == null) {
      options.children = [
        new Hinter(options),
        new CommandOutputListView(options)
      ];
    }
    else {
      for (var i = 0; i < options.children.length; i++) {
        if (typeof options.children[i] === 'function') {
          options.children[i] = new options.children[i](options);
        }
      }
    }

    // The Popup has most dependencies
    if (options.popup == null) {
      options.popup = new Popup(options);
    }
    else if (typeof options.popup === 'function') {
      options.popup = new options.popup(options);
    }

    options.inputter.update();
  };

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/canon', ['require', 'exports', 'module' , 'gcli/util', 'gcli/l10n', 'gcli/types', 'gcli/types/basic'], function(require, exports, module) {
var canon = exports;


var createEvent = require('gcli/util').createEvent;
var l10n = require('gcli/l10n');

var types = require('gcli/types');
var Status = require('gcli/types').Status;
var BooleanType = require('gcli/types/basic').BooleanType;


/**
 * A lookup hash of our registered commands
 */
var commands = {};

/**
 * A sorted list of command names, we regularly want them in order, so pre-sort
 */
var commandNames = [];

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

  this.description = 'description' in this ? this.description : undefined;
  this.description = lookup(this.description, 'canonDescNone');
  this.manual = 'manual' in this ? this.manual : undefined;
  this.manual = lookup(this.manual);

  // At this point this.params has nested param groups. We want to flatten it
  // out and replace the param object literals with Parameter objects
  var paramSpecs = this.params;
  this.params = [];

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
      if (usingGroups) {
        console.error('Parameters can\'t come after param groups.' +
            ' Ignoring ' + this.name + '/' + spec.name);
      }
      else {
        var param = new Parameter(spec, this, null);
        this.params.push(param);
      }
    }
    else {
      spec.params.forEach(function(ispec) {
        var param = new Parameter(ispec, this, spec.group);
        this.params.push(param);
      }, this);

      usingGroups = true;
    }
  }, this);
}

canon.Command = Command;


/**
 * A wrapper for a paramSpec so we can sort out shortened versions names for
 * option switches
 */
function Parameter(paramSpec, command, groupName) {
  this.command = command || { name: 'unnamed' };

  Object.keys(paramSpec).forEach(function(key) {
    this[key] = paramSpec[key];
  }, this);

  this.description = 'description' in this ? this.description : undefined;
  this.description = lookup(this.description, 'canonDescNone');
  this.manual = 'manual' in this ? this.manual : undefined;
  this.manual = lookup(this.manual);
  this.groupName = groupName;

  if (!this.name) {
    throw new Error('In ' + this.command.name +
      ': all params must have a name');
  }

  var typeSpec = this.type;
  this.type = types.getType(typeSpec);
  if (this.type == null) {
    console.error('Known types: ' + types.getTypeNames().join(', '));
    throw new Error('In ' + this.command.name + '/' + this.name +
      ': can\'t find type for: ' + JSON.stringify(typeSpec));
  }

  // boolean parameters have an implicit defaultValue:false, which should
  // not be changed. See the docs.
  if (this.type instanceof BooleanType) {
    if ('defaultValue' in this) {
      console.error('In ' + this.command.name + '/' + this.name +
          ': boolean parameters can not have a defaultValue.' +
          ' Ignoring');
    }
    this.defaultValue = false;
  }

  // Check the defaultValue for validity.
  // Both undefined and null get a pass on this test. undefined is used when
  // there is no defaultValue, and null is used when the parameter is
  // optional, neither are required to parse and stringify.
  if (this.defaultValue != null) {
    try {
      var defaultText = this.type.stringify(this.defaultValue);
      var defaultConversion = this.type.parseString(defaultText);
      if (defaultConversion.getStatus() !== Status.VALID) {
        console.error('In ' + this.command.name + '/' + this.name +
            ': Error round tripping defaultValue. status = ' +
            defaultConversion.getStatus());
      }
    }
    catch (ex) {
      console.error('In ' + this.command.name + '/' + this.name +
        ': ' + ex);
    }
  }
}

/**
 * Does the given name uniquely identify this param (among the other params
 * in this command)
 * @param name The name to check
 */
Parameter.prototype.isKnownAs = function(name) {
  if (name === '--' + this.name) {
    return true;
  }
  return false;
};

/**
 * Is the user required to enter data for this parameter? (i.e. has
 * defaultValue been set to something other than undefined)
 */
Parameter.prototype.isDataRequired = function() {
  return this.defaultValue === undefined;
};

/**
 * Are we allowed to assign data to this parameter using positional
 * parameters?
 */
Parameter.prototype.isPositionalAllowed = function() {
  return this.groupName == null;
};

canon.Parameter = Parameter;


/**
 * Add a command to the canon of known commands.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * @param commandSpec The command and its metadata.
 * @return The new command
 */
canon.addCommand = function addCommand(commandSpec) {
  var command = new Command(commandSpec);
  commands[commandSpec.name] = command;
  commandNames.push(commandSpec.name);
  commandNames.sort();

  canon.canonChange();
  return command;
};

/**
 * Remove an individual command. The opposite of #addCommand().
 * @param commandOrName Either a command name or the command itself.
 */
canon.removeCommand = function removeCommand(commandOrName) {
  var name = typeof commandOrName === 'string' ?
          commandOrName :
          commandOrName.name;
  delete commands[name];
  commandNames = commandNames.filter(function(test) {
    return test !== name;
  });

  canon.canonChange();
};

/**
 * Retrieve a command by name
 * @param name The name of the command to retrieve
 */
canon.getCommand = function getCommand(name) {
  return commands[name];
};

/**
 * Get an array of all the registered commands.
 */
canon.getCommands = function getCommands() {
  // return Object.values(commands);
  return Object.keys(commands).map(function(name) {
    return commands[name];
  }, this);
};

/**
 * Get an array containing the names of the registered commands.
 */
canon.getCommandNames = function getCommandNames() {
  return commandNames.slice(0);
};

/**
 * Enable people to be notified of changes to the list of commands
 */
canon.canonChange = createEvent('canon.canonChange');

/**
 * CommandOutputManager stores the output objects generated by executed
 * commands.
 *
 * CommandOutputManager is exposed (via canon.commandOutputManager) to the the
 * outside world and could (but shouldn't) be used before gcli.startup() has
 * been called. This could should be defensive to that where possible, and we
 * should certainly document if the use of it or similar will fail if used too
 * soon.
 */
function CommandOutputManager() {
  this._event = createEvent('CommandOutputManager');
}

/**
 * Call this method to notify the manager (and therefore all listeners) of a
 * new or updated command output.
 * @param output The command output object that has been created or updated.
 */
CommandOutputManager.prototype.sendCommandOutput = function(output) {
  this._event({ output: output });
};

/**
 * Register a function to be called whenever there is a new command output
 * object.
 */
CommandOutputManager.prototype.addListener = function(fn, ctx) {
  this._event.add(fn, ctx);
};

/**
 * Undo the effects of CommandOutputManager.addListener()
 */
CommandOutputManager.prototype.removeListener = function(fn, ctx) {
  this._event.remove(fn, ctx);
};

canon.CommandOutputManager = CommandOutputManager;

/**
 * We maintain a global command output manager for the majority case where
 * there is only one important set of outputs.
 */
canon.commandOutputManager = new CommandOutputManager();


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/util', ['require', 'exports', 'module' ], function(require, exports, module) {

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

/**
 * Create an event.
 * For use as follows:
 *   function Hat() {
 *   this.putOn = createEvent();
 *   ...
 *   }
 *   Hat.prototype.adorn = function(person) {
 *   this.putOn({ hat: hat, person: person });
 *   ...
 *   }
 *
 *   var hat = new Hat();
 *   hat.putOn.add(function(ev) {
 *   console.log('The hat ', ev.hat, ' has is worn by ', ev.person);
 *   }, scope);
 * @param name Optional name that helps us work out what event this
 * is when debugging.
 */
exports.createEvent = function(name) {
  var handlers = [];

  /**
   * This is how the event is triggered.
   * @param ev The event object to be passed to the event listeners
   */
  var event = function(ev) {
    // Use for rather than forEach because it step debugs better, which is
    // important for debugging events
    for (var i = 0; i < handlers.length; i++) {
      var handler = handlers[i];
      handler.func.call(handler.scope, ev);
    }
  };

  /**
   * Add a new handler function
   * @param func The function to call when this event is triggered
   * @param scope Optional 'this' object for the function call
   */
  event.add = function(func, scope) {
    handlers.push({ func: func, scope: scope });
  };

  /**
   * Remove a handler function added through add(). Both func and scope must
   * be strict equals (===) the values used in the call to add()
   * @param func The function to call when this event is triggered
   * @param scope Optional 'this' object for the function call
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

var NS_XHTML = 'http://www.w3.org/1999/xhtml';

/**
 * Pass-through to createElement or createElementNS
 * @param doc The document in which to create the element
 * @param tag The name of the tag to create
 * @param ns Custom namespace, HTML/XHTML is assumed if this is missing
 * @returns The created element
 */
dom.createElement = function(doc, tag, ns) {
  // If we've not been given a namespace, but the document is XML, then we
  // use an XHTML namespace, otherwise we use HTML
  if (ns == null && doc.xmlVersion != null) {
    ns = NS_XHTML;
  }
  if (ns == null) {
    return doc.createElement(tag);
  }
  else {
    return doc.createElementNS(ns, tag);
  }
};

/**
 * Remove all the child nodes from this node
 * @param el The element that should have it's children removed
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
      el.className += ' ' + name;
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
    el.className = classes.join(' ');
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

    el.className = classes.join(' ');
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
 * @param cssText The CSS declarations to append
 * @param doc The document element to work from
 */
dom.importCss = function(cssText, doc) {
  doc = doc || document;

  var style = dom.createElement(doc, 'style');
  style.appendChild(doc.createTextNode(cssText));

  var head = doc.getElementsByTagName('head')[0] || doc.documentElement;
  head.appendChild(style);

  return style;
};

/**
 * Shim for window.getComputedStyle
 */
dom.computedStyle = function(element, style) {
  var win = element.ownerDocument.defaultView;
  if (win.getComputedStyle) {
    var styles = win.getComputedStyle(element, '') || {};
    return styles[style] || '';
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
      html = '<div xmlns="' + NS_XHTML + '">' + html + '</div>';
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
    elem.attachEvent('on' + type, wrapper);
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
    elem.detachEvent('on' + type, callback._wrapper || callback);
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
if ('KeyEvent' in this) {
  event.KeyEvent = this.KeyEvent;
}
else {
  event.KeyEvent = {
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

exports.event = event;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/l10n', ['require', 'exports', 'module' ], function(require, exports, module) {

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
  var language = (navigator.language || navigator.userLanguage).toLowerCase();
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
  if (!str) {
    throw new Error('No i18n key: ' + key);
  }
  return str;
};

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
        n != 0 ?
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
        n == 0 || n % 100 > 0 && n % 100 < 20 ?
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
      return n == 0 ?
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
        n == 0 || n % 100 > 0 && n % 100 <= 10 ?
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
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/types', ['require', 'exports', 'module' , 'gcli/argument'], function(require, exports, module) {
var types = exports;


var Argument = require('gcli/argument').Argument;


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
  }
};
types.Status = Status;

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

  this._status = status || Status.VALID;
  this.message = message;
  this.predictions = predictions;
}

types.Conversion = Conversion;

/**
 * Ensure that all arguments that are part of this conversion know what they
 * are assigned to.
 * @param assignment The Assignment (param/conversion link) to inform the
 * argument about.
 */
Conversion.prototype.assign = function(assignment) {
  this.arg.assign(assignment);
};

/**
 * Work out if there is information provided in the contained argument.
 */
Conversion.prototype.isDataProvided = function() {
  var argProvided = this.arg.text !== '';
  return this.value !== undefined || argProvided;
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
  return this.value === that.value;
};

/**
 * Check that the argument in this conversion is equal to the value in the
 * provided conversion as defined by the argument (i.e. arg.equals).
 * @param that The conversion to compare arguments with
 */
Conversion.prototype.argEquals = function(that) {
  return this.arg.equals(that.arg);
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
 * @return An array of items, where each item is an object with the following
 * properties:
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
  return this.predictions || [];
};

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

ArrayConversion.prototype.assign = function(assignment) {
  this.conversions.forEach(function(conversion) {
    conversion.assign(assignment);
  }, this);
  this.assignment = assignment;
};

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

types.ArrayConversion = ArrayConversion;


/**
 * Most of our types are 'static' e.g. there is only one type of 'string',
 * however some types like 'selection' and 'deferred' are customizable.
 * The basic Type type isn't useful, but does provide documentation about what
 * types do.
 */
function Type() {
}

/**
 * Convert the given <tt>value</tt> to a string representation.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 */
Type.prototype.stringify = function(value) {
  throw new Error('Not implemented');
};

/**
 * Convert the given <tt>arg</tt> to an instance of this type.
 * Where possible, there should be round-tripping between values and their
 * string representations.
 * @param arg An instance of <tt>Argument</tt> to convert.
 * @return Conversion
 */
Type.prototype.parse = function(arg) {
  throw new Error('Not implemented');
};

/**
 * A convenience method for times when you don't have an argument to parse
 * but instead have a string.
 * @see #parse(arg)
 */
Type.prototype.parseString = function(str) {
  return this.parse(new Argument(str));
},

/**
 * The plug-in system, and other things need to know what this type is
 * called. The name alone is not enough to fully specify a type. Types like
 * 'selection' and 'deferred' need extra data, however this function returns
 * only the name, not the extra data.
 */
Type.prototype.name = undefined;

/**
 * If there is some concept of a higher value, return it,
 * otherwise return undefined.
 */
Type.prototype.increment = function(value) {
  return undefined;
};

/**
 * If there is some concept of a lower value, return it,
 * otherwise return undefined.
 */
Type.prototype.decrement = function(value) {
  return undefined;
};

/**
 * There is interesting information (like predictions) in a conversion of
 * nothing, the output of this can sometimes be customized.
 * @return Conversion
 */
Type.prototype.getDefault = undefined;

types.Type = Type;

/**
 * Private registry of types
 * Invariant: types[name] = type.name
 */
var registeredTypes = {};

types.getTypeNames = function() {
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
types.registerType = function(type) {
  if (typeof type === 'object') {
    if (type instanceof Type) {
      if (!type.name) {
        throw new Error('All registered types must have a name');
      }
      registeredTypes[type.name] = type;
    }
    else {
      throw new Error('Can\'t registerType using: ' + type);
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

types.registerTypes = function registerTypes(newTypes) {
  Object.keys(newTypes).forEach(function(name) {
    var type = newTypes[name];
    type.name = name;
    newTypes.registerType(type);
  });
};

/**
 * Remove a type from the list available to the system
 */
types.deregisterType = function(type) {
  delete registeredTypes[type.name];
};

/**
 * Find a type, previously registered using #registerType()
 */
types.getType = function(typeSpec) {
  var type;
  if (typeof typeSpec === 'string') {
    type = registeredTypes[typeSpec];
    if (typeof type === 'function') {
      type = new type();
    }
    return type;
  }

  if (typeof typeSpec === 'object') {
    if (!typeSpec.name) {
      throw new Error('Missing \'name\' member to typeSpec');
    }

    type = registeredTypes[typeSpec.name];
    if (typeof type === 'function') {
      type = new type(typeSpec);
    }
    return type;
  }

  throw new Error('Can\'t extract type from ' + typeSpec);
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/argument', ['require', 'exports', 'module' ], function(require, exports, module) {
var argument = exports;


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
 * Returns a new Argument like this one but with the text set to
 * <tt>replText</tt> and the end adjusted to fit.
 * @param replText Text to replace the old text value
 */
Argument.prototype.beget = function(replText, options) {
  var prefix = this.prefix;
  var suffix = this.suffix;

  var quote = (replText.indexOf(' ') >= 0 || replText.length == 0) ?
      '\'' : '';

  if (options) {
    prefix = (options.prefixSpace ? ' ' : '') + quote;
    suffix = quote;
  }

  return new Argument(replText, prefix, suffix);
};

/**
 * Is there any visible content to this argument?
 */
Argument.prototype.isBlank = function() {
  return this.text === '' &&
      this.prefix.trim() === '' &&
      this.suffix.trim() === '';
};

/**
 * We need to keep track of which assignment we've been assigned to
 */
Argument.prototype.assign = function(assignment) {
  this.assignment = assignment;
};

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

argument.Argument = Argument;


/**
 * ScriptArgument is a marker that the argument is designed to be Javascript.
 * It also implements the special rules that spaces after the { or before the
 * } are part of the pre/suffix rather than the content.
 */
function ScriptArgument(text, prefix, suffix) {
  this.text = text;
  this.prefix = prefix !== undefined ? prefix : '';
  this.suffix = suffix !== undefined ? suffix : '';

  while (this.text.charAt(0) === ' ') {
    this.prefix = this.prefix + ' ';
    this.text = this.text.substring(1);
  }

  while (this.text.charAt(this.text.length - 1) === ' ') {
    this.suffix = ' ' + this.suffix;
    this.text = this.text.slice(0, -1);
  }
}

ScriptArgument.prototype = Object.create(Argument.prototype);

/**
 * Returns a new Argument like this one but with the text set to
 * <tt>replText</tt> and the end adjusted to fit.
 * @param replText Text to replace the old text value
 */
ScriptArgument.prototype.beget = function(replText, options) {
  var prefix = this.prefix;
  var suffix = this.suffix;

  var quote = (replText.indexOf(' ') >= 0 || replText.length == 0) ?
      '\'' : '';

  if (options && options.normalize) {
    prefix = '{ ';
    suffix = ' }';
  }

  return new ScriptArgument(replText, prefix, suffix);
};

argument.ScriptArgument = ScriptArgument;


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

/**
 * Keep track of which assignment we've been assigned to, and allow the
 * original args to do the same.
 */
MergedArgument.prototype.assign = function(assignment) {
  this.args.forEach(function(arg) {
    arg.assign(assignment);
  }, this);

  this.assignment = assignment;
};

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

argument.MergedArgument = MergedArgument;


/**
 * TrueNamedArguments are for when we have an argument like --verbose which
 * has a boolean value, and thus the opposite of '--verbose' is ''.
 */
function TrueNamedArgument(name, arg) {
  this.arg = arg;
  this.text = arg ? arg.text : '--' + name;
  this.prefix = arg ? arg.prefix : ' ';
  this.suffix = arg ? arg.suffix : '';
}

TrueNamedArgument.prototype = Object.create(Argument.prototype);

TrueNamedArgument.prototype.assign = function(assignment) {
  if (this.arg) {
    this.arg.assign(assignment);
  }
  this.assignment = assignment;
};

TrueNamedArgument.prototype.getArgs = function() {
  // NASTY! getArgs has a fairly specific use: in removing used arguments
  // from a command line. Unlike other arguments which are EITHER used
  // in assignments directly OR grouped in things like MergedArguments,
  // TrueNamedArgument is used raw from the UI, or composed of another arg
  // from the CLI, so we return both here so they can both be removed.
  return this.arg ? [ this, this.arg ] : [ this ];
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

argument.TrueNamedArgument = TrueNamedArgument;


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

argument.FalseNamedArgument = FalseNamedArgument;


/**
 * A named argument is for cases where we have input in one of the following
 * formats:
 * <ul>
 * <li>--param value
 * <li>-p value
 * <li>--pa value
 * <li>-p:value
 * <li>--param=value
 * <li>etc
 * </ul>
 * The general format is:
 * /--?{unique-param-name-prefix}[ :=]{value}/
 * We model this as a normal argument but with a long prefix.
 */
function NamedArgument(nameArg, valueArg) {
  this.nameArg = nameArg;
  this.valueArg = valueArg;

  this.text = valueArg.text;
  this.prefix = nameArg.toString() + valueArg.prefix;
  this.suffix = valueArg.suffix;
}

NamedArgument.prototype = Object.create(Argument.prototype);

NamedArgument.prototype.assign = function(assignment) {
  this.nameArg.assign(assignment);
  this.valueArg.assign(assignment);
  this.assignment = assignment;
};

NamedArgument.prototype.getArgs = function() {
  return [ this.nameArg, this.valueArg ];
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

argument.NamedArgument = NamedArgument;


/**
 * An argument the groups together a number of plain arguments together so they
 * can be jointly assigned to a single array parameter
 */
function ArrayArgument() {
  this.args = [];
}

ArrayArgument.prototype = Object.create(Argument.prototype);

ArrayArgument.prototype.addArgument = function(arg) {
  this.args.push(arg);
};

ArrayArgument.prototype.addArguments = function(args) {
  Array.prototype.push.apply(this.args, args);
};

ArrayArgument.prototype.getArguments = function() {
  return this.args;
};

ArrayArgument.prototype.assign = function(assignment) {
  this.args.forEach(function(arg) {
    arg.assign(assignment);
  }, this);

  this.assignment = assignment;
};

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

  if (!(that instanceof ArrayArgument)) {
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

argument.ArrayArgument = ArrayArgument;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/types/basic', ['require', 'exports', 'module' , 'gcli/l10n', 'gcli/types', 'gcli/argument'], function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ArrayConversion = require('gcli/types').ArrayConversion;

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(StringType);
  types.registerType(NumberType);
  types.registerType(BooleanType);
  types.registerType(BlankType);
  types.registerType(SelectionType);
  types.registerType(DeferredType);
  types.registerType(ArrayType);
};

exports.shutdown = function() {
  types.unregisterType(StringType);
  types.unregisterType(NumberType);
  types.unregisterType(BooleanType);
  types.unregisterType(BlankType);
  types.unregisterType(SelectionType);
  types.unregisterType(DeferredType);
  types.unregisterType(ArrayType);
};


/**
 * 'string' the most basic string type that doesn't need to convert
 */
function StringType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('StringType can not be customized');
  }
}

StringType.prototype = Object.create(Type.prototype);

StringType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.toString();
};

StringType.prototype.parse = function(arg) {
  if (arg.text == null || arg.text === '') {
    return new Conversion(null, arg, Status.INCOMPLETE, '');
  }
  return new Conversion(arg.text, arg);
};

StringType.prototype.name = 'string';

exports.StringType = StringType;


/**
 * We don't currently plan to distinguish between integers and floats
 */
function NumberType(typeSpec) {
  if (typeSpec) {
    this._min = typeSpec.min;
    this._max = typeSpec.max;
    this._step = typeSpec.step || 1;
  }
  else {
    this._step = 1;
  }
}

NumberType.prototype = Object.create(Type.prototype);

NumberType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

NumberType.prototype.getMin = function() {
  if (this._min) {
    if (typeof this._min === 'function') {
      return this._min();
    }
    if (typeof this._min === 'number') {
      return this._min;
    }
  }
  return 0;
};

NumberType.prototype.getMax = function() {
  if (this._max) {
    if (typeof this._max === 'function') {
      return this._max();
    }
    if (typeof this._max === 'number') {
      return this._max;
    }
  }
  return undefined;
};

NumberType.prototype.parse = function(arg) {
  if (arg.text.replace(/\s/g, '').length === 0) {
    return new Conversion(null, arg, Status.INCOMPLETE, '');
  }

  var value = parseInt(arg.text, 10);
  if (isNaN(value)) {
    return new Conversion(null, arg, Status.ERROR,
        l10n.lookupFormat('typesNumberNan', [ arg.text ]));
  }

  if (this.getMax() != null && value > this.getMax()) {
    return new Conversion(null, arg, Status.ERROR,
        l10n.lookupFormat('typesNumberMax', [ value, this.getMax() ]));
  }

  if (value < this.getMin()) {
    return new Conversion(null, arg, Status.ERROR,
        l10n.lookupFormat('typesNumberMin', [ value, this.getMin() ]));
  }

  return new Conversion(value, arg);
};

NumberType.prototype.decrement = function(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return this.getMax() || 1;
  }
  var newValue = value - this._step;
  // Snap to the nearest incremental of the step
  newValue = Math.ceil(newValue / this._step) * this._step;
  return this._boundsCheck(newValue);
};

NumberType.prototype.increment = function(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return this.getMin();
  }
  var newValue = value + this._step;
  // Snap to the nearest incremental of the step
  newValue = Math.floor(newValue / this._step) * this._step;
  if (this.getMax() == null) {
    return newValue;
  }
  return this._boundsCheck(newValue);
};

/**
 * Return the input value so long as it is within the max/min bounds. If it is
 * lower than the minimum, return the minimum. If it is bigger than the maximum
 * then return the maximum.
 */
NumberType.prototype._boundsCheck = function(value) {
  var min = this.getMin();
  if (value < min) {
    return min;
  }
  var max = this.getMax();
  if (value > max) {
    return max;
  }
  return value;
};

NumberType.prototype.name = 'number';

exports.NumberType = NumberType;

/**
 * One of a known set of options
 */
function SelectionType(typeSpec) {
  if (typeSpec) {
    Object.keys(typeSpec).forEach(function(key) {
      this[key] = typeSpec[key];
    }, this);
  }
}

SelectionType.prototype = Object.create(Type.prototype);

SelectionType.prototype.stringify = function(value) {
  var name = null;
  var lookup = this.getLookup();
  lookup.some(function(item) {
    var test = (item.value == null) ? item : item.value;
    if (test === value) {
      name = item.name;
      return true;
    }
    return false;
  }, this);
  return name;
};

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 * @return A map of names to values.
 */
SelectionType.prototype.getLookup = function() {
  if (this.lookup) {
    if (typeof this.lookup === 'function') {
      return this.lookup();
    }
    return this.lookup;
  }

  if (Array.isArray(this.data)) {
    this.lookup = this._dataToLookup(this.data);
    return this.lookup;
  }

  if (typeof(this.data) === 'function') {
    return this._dataToLookup(this.data());
  }

  throw new Error('SelectionType has no data');
};

/**
 * Selection can be provided with either a lookup object (in the 'lookup'
 * property) or an array of strings (in the 'data' property). Internally we
 * always use lookup, so we need a way to convert a 'data' array to a lookup.
 */
SelectionType.prototype._dataToLookup = function(data) {
  return data.map(function(option) {
    return { name: option, value: option };
  });
};

/**
 * Return a list of possible completions for the given arg.
 * This code is very similar to CommandType._findPredictions(). If you are
 * making changes to this code, you should check there too.
 * @param arg The initial input to match
 * @return A trimmed lookup table of string:value pairs
 */
SelectionType.prototype._findPredictions = function(arg) {
  var predictions = [];
  this.getLookup().forEach(function(item) {
    if (item.name.indexOf(arg.text) === 0) {
      predictions.push(item);
    }
  }, this);
  return predictions;
};

SelectionType.prototype.parse = function(arg) {
  var predictions = this._findPredictions(arg);

  if (predictions.length === 1 && predictions[0].name === arg.text) {
    var value = predictions[0].value ? predictions[0].value : predictions[0];
    return new Conversion(value, arg);
  }

  // This is something of a hack it basically allows us to tell the
  // setting type to forget its last setting hack.
  if (this.noMatch) {
    this.noMatch();
  }

  if (predictions.length > 0) {
    // Especially at startup, predictions live over the time that things
    // change so we provide a completion function rather than completion
    // values.
    // This was primarily designed for commands, which have since moved
    // into their own type, so technically we could remove this code,
    // except that it provides more up-to-date answers, and it's hard to
    // predict when it will be required.
    var predictFunc = function() {
      return this._findPredictions(arg);
    }.bind(this);
    return new Conversion(null, arg, Status.INCOMPLETE, '', predictFunc);
  }

  return new Conversion(null, arg, Status.ERROR,
      l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]));
};

/**
 * For selections, up is down and black is white. It's like this, given a list
 * [ a, b, c, d ], it's natural to think that it starts at the top and that
 * going up the list, moves towards 'a'. However 'a' has the lowest index, so
 * for SelectionType, up is down and down is up.
 * Sorry.
 */
SelectionType.prototype.decrement = function(value) {
  var lookup = this.getLookup();
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
SelectionType.prototype.increment = function(value) {
  var lookup = this.getLookup();
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

SelectionType.prototype.name = 'selection';

exports.SelectionType = SelectionType;


/**
 * true/false values
 */
function BooleanType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('BooleanType can not be customized');
  }
}

BooleanType.prototype = Object.create(SelectionType.prototype);

BooleanType.prototype.lookup = [
  { name: 'true', value: true },
  { name: 'false', value: false }
];

BooleanType.prototype.parse = function(arg) {
  if (arg instanceof TrueNamedArgument) {
    return new Conversion(true, arg);
  }
  if (arg instanceof FalseNamedArgument) {
    return new Conversion(false, arg);
  }
  return SelectionType.prototype.parse.call(this, arg);
};

BooleanType.prototype.stringify = function(value) {
  return '' + value;
};

BooleanType.prototype.getDefault = function() {
  return new Conversion(false, new Argument(''));
};

BooleanType.prototype.name = 'boolean';

exports.BooleanType = BooleanType;


/**
 * A type for "we don't know right now, but hope to soon".
 */
function DeferredType(typeSpec) {
  if (typeof typeSpec.defer !== 'function') {
    throw new Error('Instances of DeferredType need typeSpec.defer to be a function that returns a type');
  }
  Object.keys(typeSpec).forEach(function(key) {
    this[key] = typeSpec[key];
  }, this);
}

DeferredType.prototype = Object.create(Type.prototype);

DeferredType.prototype.stringify = function(value) {
  return this.defer().stringify(value);
};

DeferredType.prototype.parse = function(arg) {
  return this.defer().parse(arg);
};

DeferredType.prototype.decrement = function(value) {
  var deferred = this.defer();
  return (deferred.decrement ? deferred.decrement(value) : undefined);
};

DeferredType.prototype.increment = function(value) {
  var deferred = this.defer();
  return (deferred.increment ? deferred.increment(value) : undefined);
};

DeferredType.prototype.increment = function(value) {
  var deferred = this.defer();
  return (deferred.increment ? deferred.increment(value) : undefined);
};

DeferredType.prototype.name = 'deferred';

exports.DeferredType = DeferredType;


/**
 * 'blank' is a type for use with DeferredType when we don't know yet.
 * It should not be used anywhere else.
 */
function BlankType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('BlankType can not be customized');
  }
}

BlankType.prototype = Object.create(Type.prototype);

BlankType.prototype.stringify = function(value) {
  return '';
};

BlankType.prototype.parse = function(arg) {
  return new Conversion(null, arg);
};

BlankType.prototype.name = 'blank';

exports.BlankType = BlankType;


/**
 * A set of objects of the same type
 */
function ArrayType(typeSpec) {
  if (!typeSpec.subtype) {
    console.error('Array.typeSpec is missing subtype. Assuming string.' +
        JSON.stringify(typeSpec));
    typeSpec.subtype = 'string';
  }

  Object.keys(typeSpec).forEach(function(key) {
    this[key] = typeSpec[key];
  }, this);
  this.subtype = types.getType(this.subtype);
}

ArrayType.prototype = Object.create(Type.prototype);

ArrayType.prototype.stringify = function(values) {
  // BUG 664204: Check for strings with spaces and add quotes
  return values.join(' ');
};

ArrayType.prototype.parse = function(arg) {
  if (arg instanceof ArrayArgument) {
    var conversions = arg.getArguments().map(function(subArg) {
      var conversion = this.subtype.parse(subArg);
      // Hack alert. ArrayConversion needs to be able to answer questions
      // about the status of individual conversions in addition to the
      // overall state. This allows us to do that easily.
      subArg.conversion = conversion;
      return conversion;
    }, this);
    return new ArrayConversion(conversions, arg);
  }
  else {
    console.error('non ArrayArgument to ArrayType.parse', arg);
    throw new Error('non ArrayArgument to ArrayType.parse');
  }
};

ArrayType.prototype.getDefault = function() {
  return new ArrayConversion([], new ArrayArgument());
};

ArrayType.prototype.name = 'array';

exports.ArrayType = ArrayType;


});

define('gcli/nls/strings', ['require', 'exports', 'module' ], function(require, exports, module) {
/**
 * This file has detailed comments as to the usage of these strings so when
 * translators work on these strings separately from the code, (but with the
 * comments) they have something to work on.
 * Each string should be commented using single-line comments.
 */
var i18n = {
  root: {
    // Short string used to describe any command or command parameter when
    // no description has been provided.
    canonDescNone: '(No description)',

    // The special '{' command allows entry of JavaScript like traditional
    // developer tool command lines. This describes the '{' command.
    cliEvalJavascript: 'Enter JavaScript directly',

    // When a command has a parameter that has a number of pre-defined options
    // the user interface presents these in a drop-down menu, where the first
    // 'option' is an indicator that a selection should be made. This string
    // describes that first option.
    fieldSelectionSelect: 'Select a %S ...',

    // When a command has a parameter that can be repeated a number of times
    // (e.g. like the 'cat a.txt b.txt' command) the user interface presents
    // buttons to add and remove arguments. This string is used to add
    // arguments.
    fieldArrayAdd: 'Add',

    // When a command has a parameter that can be repeated a number of times
    // (e.g. like the 'cat a.txt b.txt' command) the user interface presents
    // buttons to add and remove arguments. This string is used to remove
    // arguments.
    fieldArrayDel: 'Delete',

    // The command line provides completion for JavaScript commands, however
    // there are times when the scope of what we're completing against can't
    // be used. This error message is displayed when this happens.
    jstypeParseScope: 'Scope lost',

    // When the command line is doing JavaScript completion, sometimes the
    // property to be completed does not exist. This error message is displayed
    // when this happens.
    jstypeParseMissing: 'Can\'t find property \'%S\'',

    // When the command line is doing JavaScript completion using invalid
    // JavaScript, this error message is displayed.
    jstypeBeginSyntax: 'Syntax error',

    // When the command line is doing JavaScript completion using a string
    // that is not properly terminated, this error message is displayed.
    jstypeBeginUnterm: 'Unterminated string literal',

    // When the command line is passed a number, however the input string is
    // not a valid number, this error message is displayed.
    typesNumberNan: 'Can\'t convert "%S" to a number.',

    // When the command line is passed a number, but the number is bigger than
    // the largest allowed number, this error message is displayed.
    typesNumberMax: '%1$S is greater that maximum allowed: %2$S.',

    // When the command line is passed a number, but the number is lower than
    // the smallest allowed number, this error message is displayed.
    typesNumberMin: '%1$S is smaller that minimum allowed: %2$S.',

    // When the command line is passed an option with a limited number of
    // correct values, but the passed value is not one of them, this error
    // message is displayed.
    typesSelectionNomatch: 'Can\'t use \'%S\'.',

    // When the command line is expecting a CSS query string, however the
    // passed string is not valid, this error message is displayed.
    nodeParseSyntax: 'Syntax error in CSS query',

    // When the command line is expecting a CSS string that matches a single
    // node, but more than one node matches, this error message is displayed.
    nodeParseMultiple: 'Too many matches (%S)',

    // When the command line is expecting a CSS string that matches a single
    // node, but no nodes match, this error message is displayed.
    nodeParseNone: 'No matches'
  }
};
exports.root = i18n.root;
});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/types/javascript', ['require', 'exports', 'module' , 'gcli/l10n', 'gcli/types'], function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');

var Conversion = types.Conversion;
var Type = types.Type;
var Status = types.Status;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(JavascriptType);
};

exports.shutdown = function() {
  types.unregisterType(JavascriptType);
};

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
 * Remove registration of object against which JavaScript completions happen
 */
exports.unsetGlobalObject = function() {
  globalObject = undefined;
};


/**
 * 'javascript' handles scripted input
 */
function JavascriptType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('JavascriptType can not be customized');
  }
}

JavascriptType.prototype = Object.create(Type.prototype);

JavascriptType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value;
};

JavascriptType.prototype.parse = function(arg) {
  var typed = arg.text;
  var scope = globalObject;

  // In FX-land we need to unwrap. TODO: Enable in the browser.
  // scope = unwrap(scope);

  // Analyze the input text and find the beginning of the last part that
  // should be completed.
  var beginning = this._findCompletionBeginning(typed);

  // There was an error analyzing the string.
  if (beginning.err) {
    return new Conversion(typed, arg, Status.ERROR, beginning.err);
  }

  // If the current state is not ParseState.NORMAL, then we are inside of a
  // string which means that no completion is possible.
  if (beginning.state !== ParseState.NORMAL) {
    return new Conversion(typed, arg, Status.INCOMPLETE, '');
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
        return new Conversion(typed, arg, Status.ERROR,
                l10n.lookup('jstypeParseScope'));
      }

      // TODO: Re-enable this test
      // Check if prop is a getter function on obj. Functions can change other
      // stuff so we can't execute them to get the next object. Stop here.
      // if (isNonNativeGetter(scope, prop)) {
      //   return new Conversion(typed, arg);
      // }

      try {
        scope = scope[prop];
      }
      catch (ex) {
        return new Conversion(typed, arg, Status.ERROR, '' + ex);
      }
    }
  }
  else {
    matchProp = properties[0].trimLeft();
  }

  // If the reason we just stopped adjusting the scope was a non-simple string,
  // then we're not sure if the input is valid or invalid, so accept it
  if (prop && !prop.match(/^[0-9A-Za-z]*$/)) {
    return new Conversion(typed, arg);
  }

  // However if the prop was a simple string, it is an error
  if (scope == null) {
    return new Conversion(typed, arg, Status.ERROR,
        l10n.lookupFormat('jstypeParseMissing', [ prop ]));
  }

  // If the thing we're looking for isn't a simple string, then we're not going
  // to find it, but we're not sure if it's valid or invalid, so accept it
  if (!matchProp.match(/^[0-9A-Za-z]*$/)) {
    return new Conversion(typed, arg);
  }

  // Skip Iterators and Generators.
  if (this._isIteratorOrGenerator(scope)) {
    return null;
  }

  var matchLen = matchProp.length;
  var prefix = matchLen === 0 ? typed : typed.slice(0, -matchLen);
  var status = Status.INCOMPLETE;
  var message;
  var matches = [];

  for (var prop in scope) {
    if (prop.indexOf(matchProp) === 0) {
      var value;
      try {
        value = scope[prop];
      }
      catch (ex) {
        break;
      }
      var description;
      var incomplete = true;
      if (typeof value === 'function') {
        description = '(function)';
      }
      if (typeof value === 'boolean' || typeof value === 'number') {
        description = '= ' + value;
        incomplete = false;
      }
      else if (typeof value === 'string') {
        if (value.length > 40) {
          value = value.substring(0, 37) + '...';
        }
        description = '= \'' + value + '\'';
        incomplete = false;
      }
      else {
        description = '(' + typeof value + ')';
      }
      matches.push({
        name: prefix + prop,
        value: {
          name: prefix + prop,
          description: description
        },
        incomplete: incomplete
      });
    }
    if (prop === matchProp) {
      status = Status.VALID;
      message = '';
    }
  }

  // Error message if this isn't valid
  if (status !== Status.VALID) {
    message = l10n.lookupFormat('jstypeParseMissing', [ matchProp ]);
  }

  // If the match is the only one possible, and its VALID, predict nothing
  if (matches.length === 1 && status === Status.VALID) {
    matches = undefined;
  }
  else {
    // Can we think of a better sort order than alpha? There are certainly some
    // properties that are far more commonly used ...
    matches.sort(function(p1, p2) {
      return p1.name.localeCompare(p2.name);
    });
  }

  // More than 10 matches are generally not helpful. We should really do a
  // better job of finding matches (bug 682694), but in the mean time there is
  // a performance problem associated with creating a large number of DOM nodes
  // that few people will ever read, so trim the list of matches
  if (matches && matches.length > 10) {
    matches = matches.slice(0, 9);
  }

  return new Conversion(typed, arg, status, message, matches);
};

var ParseState = {
  NORMAL: 0,
  QUOTE: 2,
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
  for (var i = 0; i < text.length; i++) {
    c = text[i];

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

  return {
    state: state,
    startPos: start
  };
};

/**
 * Return true if the passed object is either an iterator or a generator, and
 * false otherwise.
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

JavascriptType.prototype.name = 'javascript';

exports.JavascriptType = JavascriptType;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/types/node', ['require', 'exports', 'module' , 'gcli/l10n', 'gcli/types'], function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(NodeType);
};

exports.shutdown = function() {
  types.unregisterType(NodeType);
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
  doc = undefined;
};


/**
 * A CSS expression that refers to a single node
 */
function NodeType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('NodeType can not be customized');
  }
}

NodeType.prototype = Object.create(Type.prototype);

NodeType.prototype.stringify = function(value) {
  return value.__gcliQuery || 'Error';
};

NodeType.prototype.parse = function(arg) {
  if (arg.text === '') {
    return new Conversion(null, arg, Status.INCOMPLETE,
        l10n.lookup('nodeParseNone'));
  }

  var nodes;
  try {
    nodes = doc.querySelectorAll(arg.text);
  }
  catch (ex) {
    console.error(ex);
    return new Conversion(null, arg, Status.ERROR, l10n.lookup('nodeParseSyntax'));
  }

  if (nodes.length === 0) {
    return new Conversion(null, arg, Status.INCOMPLETE,
        l10n.lookup('nodeParseNone'));
  }

  if (nodes.length === 1) {
    var node = nodes.item(0);
    node.__gcliQuery = arg.text;

    flashNode(node, 'green');

    return new Conversion(node, arg, Status.VALID, '');
  }

  Array.prototype.forEach.call(nodes, function(n) {
    flashNode(n, 'red');
  });

  return new Conversion(null, arg, Status.ERROR,
          l10n.lookupFormat('nodeParseMultiple', [ nodes.length ]));
};

NodeType.prototype.name = 'node';


/**
 * Helper to turn a node background it's complementary color for 1 second.
 * There is likely a better way to do this, but this will do for now.
 */
function flashNode(node, color) {
  if (!node.__gcliHighlighting) {
    node.__gcliHighlighting = true;
    var original = node.style.background;
    node.style.background = color;
    setTimeout(function() {
      node.style.background = original;
      delete node.__gcliHighlighting;
    }, 1000);
  }
}


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/cli', ['require', 'exports', 'module' , 'gcli/util', 'gcli/canon', 'gcli/promise', 'gcli/types', 'gcli/types/basic', 'gcli/argument'], function(require, exports, module) {


var createEvent = require('gcli/util').createEvent;

var canon = require('gcli/canon');
var Promise = require('gcli/promise').Promise;

var types = require('gcli/types');
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var Type = require('gcli/types').Type;
var ArrayType = require('gcli/types/basic').ArrayType;
var StringType = require('gcli/types/basic').StringType;
var BooleanType = require('gcli/types/basic').BooleanType;
var SelectionType = require('gcli/types/basic').SelectionType;

var Argument = require('gcli/argument').Argument;
var ArrayArgument = require('gcli/argument').ArrayArgument;
var NamedArgument = require('gcli/argument').NamedArgument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var MergedArgument = require('gcli/argument').MergedArgument;
var ScriptArgument = require('gcli/argument').ScriptArgument;

var evalCommand;

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(CommandType);
  evalCommand = canon.addCommand(evalCommandSpec);
};

exports.shutdown = function() {
  types.unregisterType(CommandType);
  canon.removeCommand(evalCommandSpec.name);
  evalCommand = undefined;
};


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
 *
 * <h2>Events<h2>
 * Assignment publishes the following event:<ul>
 * <li>assignmentChange: Either the value or the text has changed. It is likely
 * that any UI component displaying this argument will need to be updated.
 * The event object looks like:
 * <tt>{ assignment: ..., conversion: ..., oldConversion: ... }</tt>
 * @constructor
 */
function Assignment(param, paramIndex) {
  this.param = param;
  this.paramIndex = paramIndex;
  this.assignmentChange = createEvent('Assignment.assignmentChange');

  this.setDefault();
}

/**
 * The parameter that we are assigning to
 * @readonly
 */
Assignment.prototype.param = undefined;

Assignment.prototype.conversion = undefined;

/**
 * The index of this parameter in the parent Requisition. paramIndex === -1
 * is the command assignment although this should not be relied upon, it is
 * better to test param instanceof CommandAssignment
 */
Assignment.prototype.paramIndex = undefined;

/**
 * Easy accessor for conversion.arg
 */
Assignment.prototype.getArg = function() {
  return this.conversion.arg;
};

/**
 * Easy accessor for conversion.value
 */
Assignment.prototype.getValue = function() {
  return this.conversion.value;
};

/**
 * Easy (and safe) accessor for conversion.message
 */
Assignment.prototype.getMessage = function() {
  return this.conversion.message ? this.conversion.message : '';
};

/**
 * Easy (and safe) accessor for conversion.getPredictions()
 * @return An array of objects with name and value elements. For example:
 * [ { name:'bestmatch', value:foo1 }, { name:'next', value:foo2 }, ... ]
 */
Assignment.prototype.getPredictions = function() {
  return this.conversion.getPredictions();
};

/**
 * Report on the status of the last parse() conversion.
 * We force mutations to happen through this method rather than have
 * setValue and setArgument functions to help maintain integrity when we
 * have ArrayArguments and don't want to get confused. This way assignments
 * are just containers for a conversion rather than things that store
 * a connection between an arg/value.
 * @see types.Conversion
 */
Assignment.prototype.setConversion = function(conversion) {
  var oldConversion = this.conversion;

  this.conversion = conversion;
  this.conversion.assign(this);

  if (this.conversion.equals(oldConversion)) {
    return;
  }

  this.assignmentChange({
    assignment: this,
    conversion: this.conversion,
    oldConversion: oldConversion
  });
};

/**
 * Find a default value for the conversion either from the parameter, or from
 * the type, or failing that by parsing an empty argument.
 */
Assignment.prototype.setDefault = function() {
  var conversion;
  if (this.param.getDefault) {
    conversion = this.param.getDefault();
  }
  else if (this.param.type.getDefault) {
    conversion = this.param.type.getDefault();
  }
  else {
    conversion = this.param.type.parse(new Argument());
  }

  this.setConversion(conversion);
};

/**
 * Make sure that there is some content for this argument by using an
 * Argument of '' if needed.
 */
Assignment.prototype.ensureVisibleArgument = function() {
  // It isn't clear if we should be sending events from this method.
  // It should only be called when structural changes are happening in which
  // case we're going to ignore the event anyway. But on the other hand
  // perhaps this function shouldn't need to know how it is used, and should
  // do the inefficient thing.
  if (!this.conversion.arg.isBlank()) {
    return false;
  }

  var arg = this.conversion.arg.beget('', {
    prefixSpace: this.param instanceof CommandAssignment
  });
  this.conversion = this.param.type.parse(arg);
  this.conversion.assign(this);

  return true;
};

/**
 * Work out what the status of the current conversion is which involves looking
 * not only at the conversion, but also checking if data has been provided
 * where it should.
 * @param arg For assignments with multiple args (e.g. array assignments) we
 * can narrow the search for status to a single argument.
 */
Assignment.prototype.getStatus = function(arg) {
  if (this.param.isDataRequired() && !this.conversion.isDataProvided()) {
    return Status.ERROR;
  }

  // Selection/Boolean types with a defined range of values will say that
  // '' is INCOMPLETE, but the parameter may be optional, so we don't ask
  // if the user doesn't need to enter something and hasn't done so.
  if (!this.param.isDataRequired() && this.getArg().isBlank()) {
    return Status.VALID;
  }

  return this.conversion.getStatus(arg);
};

/**
 * Basically <tt>value = conversion.predictions[0])</tt> done in a safe way.
 */
Assignment.prototype.complete = function() {
  var predictions = this.conversion.getPredictions();
  if (predictions.length > 0) {
    var arg = this.conversion.arg.beget(predictions[0].name);
    if (!predictions[0].incomplete) {
      arg.suffix = ' ';
    }
    var conversion = this.param.type.parse(arg);
    this.setConversion(conversion);
  }
};

/**
 * Replace the current value with the lower value if such a concept exists.
 */
Assignment.prototype.decrement = function() {
  var replacement = this.param.type.decrement(this.conversion.value);
  if (replacement != null) {
    var str = this.param.type.stringify(replacement);
    var arg = this.conversion.arg.beget(str);
    var conversion = new Conversion(replacement, arg);
    this.setConversion(conversion);
  }
};

/**
 * Replace the current value with the higher value if such a concept exists.
 */
Assignment.prototype.increment = function() {
  var replacement = this.param.type.increment(this.conversion.value);
  if (replacement != null) {
    var str = this.param.type.stringify(replacement);
    var arg = this.conversion.arg.beget(str);
    var conversion = new Conversion(replacement, arg);
    this.setConversion(conversion);
  }
};

/**
 * Helper when we're rebuilding command lines.
 */
Assignment.prototype.toString = function() {
  return this.conversion.toString();
};

exports.Assignment = Assignment;


/**
 * Select from the available commands.
 * This is very similar to a SelectionType, however the level of hackery in
 * SelectionType to make it handle Commands correctly was to high, so we
 * simplified.
 * If you are making changes to this code, you should check there too.
 */
function CommandType() {
}

CommandType.prototype = Object.create(Type.prototype);

CommandType.prototype.name = 'command';

CommandType.prototype.decrement = SelectionType.prototype.decrement;
CommandType.prototype.increment = SelectionType.prototype.increment;
CommandType.prototype._findValue = SelectionType.prototype._findValue;

CommandType.prototype.stringify = function(command) {
  return command.name;
};

/**
 * Trim a list of commands (as from canon.getCommands()) according to those
 * that match the provided arg.
 */
CommandType.prototype._findPredictions = function(arg) {
  var predictions = [];
  canon.getCommands().forEach(function(command) {
    if (command.name.indexOf(arg.text) === 0) {
      // The command type needs to exclude sub-commands when the CLI
      // is blank, but include them when we're filtering. This hack
      // excludes matches when the filter text is '' and when the
      // name includes a space.
      if (arg.text.length !== 0 || command.name.indexOf(' ') === -1) {
        predictions.push(command);
      }
    }
  }, this);
  return predictions;
};

CommandType.prototype.parse = function(arg) {
  // Especially at startup, predictions live over the time that things change
  // so we provide a completion function rather than completion values
  var predictFunc = function() {
    return this._findPredictions(arg);
  }.bind(this);

  var predictions = this._findPredictions(arg);

  if (predictions.length === 0) {
    return new Conversion(null, arg, Status.ERROR,
        'Can\'t use \'' + arg.text + '\'.', predictFunc);
  }

  var command = predictions[0];

  if (predictions.length === 1) {
    // Is it an exact match of an executable command,
    // or just the only possibility?
    if (command.name === arg.text && typeof command.exec === 'function') {
      return new Conversion(command, arg, Status.VALID, '');
    }
    return new Conversion(null, arg, Status.INCOMPLETE, '', predictFunc);
  }

  // It's valid if the text matches, even if there are several options
  if (command.name === arg.text) {
    return new Conversion(command, arg, Status.VALID, '', predictFunc);
  }

  return new Conversion(null, arg, Status.INCOMPLETE, '', predictFunc);
};


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
var evalCommandSpec = {
  name: '{',
  params: [
    {
      name: 'javascript',
      type: 'javascript',
      description: ''
    }
  ],
  returnType: 'html',
  description: { key: 'cliEvalJavascript' },
  exec: function(args, context) {
    // &#x2192; is right arrow. We use explicit entities to ensure XML validity
    var resultPrefix = '<em>{ ' + args.javascript + ' }</em> &#x2192; ';
    try {
      var result = customEval(args.javascript);

      if (result === null) {
        return resultPrefix + 'null.';
      }

      if (result === undefined) {
        return resultPrefix + 'undefined.';
      }

      if (typeof result === 'function') {
        // &#160; is &nbsp;
        return resultPrefix +
            (result + '').replace(/\n/g, '<br>').replace(/ /g, '&#160;');
      }

      return resultPrefix + result;
    }
    catch (ex) {
      return resultPrefix + 'Exception: ' + ex.message;
    }
  }
};


/**
 * This is a special assignment to reflect the command itself.
 */
function CommandAssignment() {
  this.param = new canon.Parameter({
    name: '__command',
    type: 'command',
    description: 'The command to execute'
  });
  this.paramIndex = -1;
  this.assignmentChange = createEvent('CommandAssignment.assignmentChange');

  this.setDefault();
}

CommandAssignment.prototype = Object.create(Assignment.prototype);

CommandAssignment.prototype.getStatus = function(arg) {
  return Status.combine(
    Assignment.prototype.getStatus.call(this, arg),
    this.conversion.value && !this.conversion.value.exec ?
      Status.INCOMPLETE : Status.VALID
  );
};


/**
 * Special assignment used when ignoring parameters that don't have a home
 */
function UnassignedAssignment() {
  this.param = new canon.Parameter({
    name: '__unassigned',
    type: 'string'
  });
  this.paramIndex = -1;
  this.assignmentChange = createEvent('UnassignedAssignment.assignmentChange');

  this.setDefault();
}

UnassignedAssignment.prototype = Object.create(Assignment.prototype);

UnassignedAssignment.prototype.getStatus = function(arg) {
  return Status.ERROR;
};

UnassignedAssignment.prototype.setUnassigned = function(args) {
  if (!args || args.length === 0) {
    this.setDefault();
  }
  else {
    var conversion = this.param.type.parse(new MergedArgument(args));
    this.setConversion(conversion);
  }
};


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
 * <li>commandChange: The command has changed. It is likely that a UI
 * structure will need updating to match the parameters of the new command.
 * The event object looks like { command: A }
 * <li>assignmentChange: This is a forward of the Assignment.assignmentChange
 * event. It is fired when any assignment (except the commandAssignment)
 * changes.
 * <li>inputChange: The text to be mirrored in a command line has changed.
 * The event object looks like { newText: X }.
 * </ul>
 *
 * @param environment An opaque object passed to commands using ExecutionContext
 * @param document A DOM Document passed to commands using ExecutionContext in
 * order to allow creation of DOM nodes.
 * @constructor
 */
function Requisition(environment, document) {
  this.environment = environment;
  this.document = document;

  // The command that we are about to execute.
  // @see setCommandConversion()
  this.commandAssignment = new CommandAssignment();

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
  this._unassigned = new UnassignedAssignment();

  // Temporarily set this to true to prevent _onAssignmentChange resetting
  // argument positions
  this._structuralChangeInProgress = false;

  this.commandAssignment.assignmentChange.add(this._onCommandAssignmentChange, this);
  this.commandAssignment.assignmentChange.add(this._onAssignmentChange, this);

  this.commandOutputManager = canon.commandOutputManager;

  this.assignmentChange = createEvent('Requisition.assignmentChange');
  this.commandChange = createEvent('Requisition.commandChange');
  this.inputChange = createEvent('Requisition.inputChange');
}

/**
 * Some number that is higher than the most args we'll ever have. Would use
 * MAX_INTEGER if that made sense
 */
var MORE_THAN_THE_MOST_ARGS_POSSIBLE = 1000000;

/**
 * Avoid memory leaks
 */
Requisition.prototype.destroy = function() {
  this.commandAssignment.assignmentChange.remove(this._onCommandAssignmentChange, this);
  this.commandAssignment.assignmentChange.remove(this._onAssignmentChange, this);

  delete this.document;
  delete this.environment;
};

/**
 * When any assignment changes, we might need to update the _args array to
 * match and inform people of changes to the typed input text.
 */
Requisition.prototype._onAssignmentChange = function(ev) {
  // Don't report an event if the value is unchanged
  if (ev.oldConversion != null &&
      ev.conversion.valueEquals(ev.oldConversion)) {
    return;
  }

  if (this._structuralChangeInProgress) {
    return;
  }

  this.assignmentChange(ev);

  // Both for argument position and the inputChange event, we only care
  // about changes to the argument.
  if (ev.conversion.argEquals(ev.oldConversion)) {
    return;
  }

  this._structuralChangeInProgress = true;

  // Refactor? See bug 660765
  // Do preceding arguments need to have dummy values applied so we don't
  // get a hole in the command line?
  if (ev.assignment.param.isPositionalAllowed()) {
    for (var i = 0; i < ev.assignment.paramIndex; i++) {
      var assignment = this.getAssignment(i);
      if (assignment.param.isPositionalAllowed()) {
        if (assignment.ensureVisibleArgument()) {
          this._args.push(assignment.getArg());
        }
      }
    }
  }

  // Remember where we found the first match
  var index = MORE_THAN_THE_MOST_ARGS_POSSIBLE;
  for (var i = 0; i < this._args.length; i++) {
    if (this._args[i].assignment === ev.assignment) {
      if (i < index) {
        index = i;
      }
      this._args.splice(i, 1);
      i--;
    }
  }

  if (index === MORE_THAN_THE_MOST_ARGS_POSSIBLE) {
    this._args.push(ev.assignment.getArg());
  }
  else {
    // Is there a way to do this that doesn't involve a loop?
    var newArgs = ev.conversion.arg.getArgs();
    for (var i = 0; i < newArgs.length; i++) {
      this._args.splice(index + i, 0, newArgs[i]);
    }
  }
  this._structuralChangeInProgress = false;

  this.inputChange();
};

/**
 * When the command changes, we need to keep a bunch of stuff in sync
 */
Requisition.prototype._onCommandAssignmentChange = function(ev) {
  this._assignments = {};

  var command = this.commandAssignment.getValue();
  if (command) {
    for (var i = 0; i < command.params.length; i++) {
      var param = command.params[i];
      var assignment = new Assignment(param, i);
      assignment.assignmentChange.add(this._onAssignmentChange, this);
      this._assignments[param.name] = assignment;
    }
  }
  this.assignmentCount = Object.keys(this._assignments).length;

  this.commandChange({
    requisition: this,
    oldValue: ev.oldValue,
    newValue: command
  });
//  this.inputChange();
};

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
},

/**
 * Where parameter name == assignment names - they are the same
 */
Requisition.prototype.getParameterNames = function() {
  return Object.keys(this._assignments);
},

/**
 * A *shallow* clone of the assignments.
 * This is useful for systems that wish to go over all the assignments
 * finding values one way or another and wish to trim an array as they go.
 */
Requisition.prototype.cloneAssignments = function() {
  return Object.keys(this._assignments).map(function(name) {
    return this._assignments[name];
  }, this);
};

/**
 * The overall status is the most severe status.
 * There is no such thing as an INCOMPLETE overall status because the
 * definition of INCOMPLETE takes into account the cursor position to say 'this
 * isn't quite ERROR because the user can fix it by typing', however overall,
 * this is still an error status.
 */
Requisition.prototype.getStatus = function() {
  var status = Status.VALID;
  this.getAssignments(true).forEach(function(assignment) {
    var assignStatus = assignment.getStatus();
    if (assignment.getStatus() > status) {
      status = assignStatus;
    }
  }, this);
  if (status === Status.INCOMPLETE) {
    status = Status.ERROR;
  }
  return status;
};

/**
 * Extract the names and values of all the assignments, and return as
 * an object.
 */
Requisition.prototype.getArgsObject = function() {
  var args = {};
  this.getAssignments().forEach(function(assignment) {
    args[assignment.param.name] = assignment.getValue();
  }, this);
  return args;
};

/**
 * Access the arguments as an array.
 * @param includeCommand By default only the parameter arguments are
 * returned unless (includeCommand === true), in which case the list is
 * prepended with commandAssignment.getArg()
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
 * Reset all the assignments to their default values
 */
Requisition.prototype.setDefaultArguments = function() {
  this.getAssignments().forEach(function(assignment) {
    assignment.setDefault();
  }, this);
};

/**
 * Extract a canonical version of the input
 */
Requisition.prototype.toCanonicalString = function() {
  var line = [];

  var cmd = this.commandAssignment.getValue() ?
      this.commandAssignment.getValue().name :
      this.commandAssignment.getArg().text;
  line.push(cmd);

  Object.keys(this._assignments).forEach(function(name) {
    var assignment = this._assignments[name];
    var type = assignment.param.type;
    // Bug 664377: This will cause problems if there is a non-default value
    // after a default value. Also we need to decide when to use
    // named parameters in place of positional params. Both can wait.
    if (assignment.getValue() !== assignment.param.defaultValue) {
      line.push(' ');
      line.push(type.stringify(assignment.getValue()));
    }
  }, this);

  // Canonically, if we've opened with a { then we should have a } to close
  var command = this.commandAssignment.getValue();
  if (cmd === '{') {
    if (this.getAssignment(0).getArg().suffix.indexOf('}') === -1) {
      line.push(' }');
    }
  }

  return line.join('');
};

/**
 * Input trace gives us an array of Argument tracing objects, one for each
 * character in the typed input, from which we can derive information about how
 * to display this typed input. It's a bit like toString on steroids.
 * <p>
 * The returned object has the following members:<ul>
 * <li>char: The character to which this arg trace refers.
 * <li>arg: The Argument to which this character is assigned.
 * <li>part: One of ['prefix'|'text'|suffix'] - how was this char understood
 * </ul>
 * <p>
 * The Argument objects are as output from #_tokenize() rather than as applied
 * to Assignments by #_assign() (i.e. they are not instances of NamedArgument,
 * ArrayArgument, etc).
 * <p>
 * To get at the arguments applied to the assignments simply call
 * <tt>arg.assignment.arg</tt>. If <tt>arg.assignment.arg !== arg</tt> then
 * the arg applied to the assignment will contain the original arg.
 * See #_assign() for details.
 */
Requisition.prototype.createInputArgTrace = function() {
  if (!this._args) {
    throw new Error('createInputMap requires a command line. See source.');
    // If this is a problem then we can fake command line input using
    // something like the code in #toCanonicalString().
  }

  var args = [];
  this._args.forEach(function(arg) {
    for (var i = 0; i < arg.prefix.length; i++) {
      args.push({ arg: arg, char: arg.prefix[i], part: 'prefix' });
    }
    for (var i = 0; i < arg.text.length; i++) {
      args.push({ arg: arg, char: arg.text[i], part: 'text' });
    }
    for (var i = 0; i < arg.suffix.length; i++) {
      args.push({ arg: arg, char: arg.suffix[i], part: 'suffix' });
    }
  });

  return args;
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
 * Return an array of Status scores so we can create a marked up
 * version of the command line input.
 */
Requisition.prototype.getInputStatusMarkup = function() {
  var argTraces = this.createInputArgTrace();
  // We only take a status of INCOMPLETE to be INCOMPLETE when the cursor is
  // actually in the argument. Otherwise it's an error.
  // Generally the 'argument at the cursor' is the argument before the cursor
  // unless it is before the first char, in which case we take the first.
  var cursor = this.input.cursor.start === 0 ?
      0 :
      this.input.cursor.start - 1;
  var cTrace = argTraces[cursor];

  var statuses = [];
  for (var i = 0; i < argTraces.length; i++) {
    var argTrace = argTraces[i];
    var arg = argTrace.arg;
    var status = Status.VALID;
    if (argTrace.part === 'text') {
      status = arg.assignment.getStatus(arg);
      // Promote INCOMPLETE to ERROR  ...
      if (status === Status.INCOMPLETE) {
        // If the cursor is not in a position to be able to complete it
        if (arg !== cTrace.arg || cTrace.part !== 'text') {
          // And if we're not in the command
          if (!(arg.assignment instanceof CommandAssignment)) {
            status = Status.ERROR;
          }
        }
      }
    }

    statuses.push(status);
  }

  return statuses;
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

    // suffix looks forwards
    if (this._args.length > i + 1) {
      // first to the next argument
      assignment = this._args[i + 1].assignment;
    }
    else if (assignment &&
        assignment.paramIndex + 1 < this.assignmentCount) {
      // then to the next assignment
      assignment = this.getAssignment(assignment.paramIndex + 1);
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
      ' cursor=' + cursor + ' text.length=' + this.toString().length);
  }

  return reply;
};

/**
 * Entry point for keyboard accelerators or anything else that wants to execute
 * a command.
 * @param input Object containing data about how to execute the command.
 * Properties of input include:
 * - args: Arguments for the command
 * - typed: The typed command
 * - visible: Ensure that the output from this command is visible
 */
Requisition.prototype.exec = function(input) {
  var command;
  var args;
  var visible = true;

  if (input) {
    if (input.args != null) {
      // Fast track by looking up the command directly since passed args
      // means there is no command line to parse.
      command = canon.getCommand(input.typed);
      if (!command) {
        console.error('Command not found: ' + command);
      }
      args = input.args;

      // Default visible to false since this is exec is probably the
      // result of a keyboard shortcut
      visible = 'visible' in input ? input.visible : false;
    }
    else {
      this.update(input);
    }
  }

  if (!command) {
    command = this.commandAssignment.getValue();
    args = this.getArgsObject();
  }

  if (!command) {
    return false;
  }

  var outputObject = {
    command: command,
    args: args,
    typed: this.toCanonicalString(),
    completed: false,
    start: new Date()
  };

  this.commandOutputManager.sendCommandOutput(outputObject);

  var onComplete = (function(output, error) {
    if (visible) {
      outputObject.end = new Date();
      outputObject.duration = outputObject.end.getTime() - outputObject.start.getTime();
      outputObject.error = error;
      outputObject.output = output;
      outputObject.completed = true;
      this.commandOutputManager.sendCommandOutput(outputObject);
    }
  }).bind(this);

  try {
    var context = new ExecutionContext(this.environment, this.document);
    var reply = command.exec(args, context);

    if (reply != null && reply.isPromise) {
      reply.then(
        function(data) { onComplete(data, false); },
        function(error) { onComplete(error, true); });

      // Add progress to our promise and add a handler for it here
      // See bug 659300
    }
    else {
      onComplete(reply, false);
    }
  }
  catch (ex) {
    onComplete(ex, true);
  }

  this.clear();
  return true;
};

/**
 * Called by the UI when ever the user interacts with a command line input
 * @param input A structure that details the state of the input field.
 * It should look something like: { typed:a, cursor: { start:b, end:c } }
 * Where a is the contents of the input field, and b and c are the start
 * and end of the cursor/selection respectively.
 * <p>The general sequence is:
 * <ul>
 * <li>_tokenize(): convert _typed into _parts
 * <li>_split(): convert _parts into _command and _unparsedArgs
 * <li>_assign(): convert _unparsedArgs into requisition
 * </ul>
 */
Requisition.prototype.update = function(input) {
  this.input = input;
  if (this.input.cursor == null) {
    this.input.cursor = { start: input.length, end: input.length };
  }

  this._structuralChangeInProgress = true;

  this._args = this._tokenize(input.typed);

  var args = this._args.slice(0); // i.e. clone
  this._split(args);
  this._assign(args);

  this._structuralChangeInProgress = false;

  this.inputChange();
};

/**
 * Empty the current buffer, and notify listeners that we're now empty
 */
Requisition.prototype.clear = function() {
  this.update({ typed: '', cursor: { start: 0, end: 0 } });
};

/**
 * Requisition._tokenize() is a state machine. These are the states.
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
Requisition.prototype._tokenize = function(typed) {
  // For blank input, place a dummy empty argument into the list
  if (typed == null || typed.length === 0) {
    return [ new Argument('', '', '') ];
  }

  if (isSimple(typed)) {
    return [ new Argument(typed, '', '') ];
  }

  var mode = In.WHITESPACE;

  // First we un-escape. This list was taken from:
  // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Core_Language_Features#Unicode
  // We are generally converting to their real values except for the strings
  // '\'', '\"', '\ ', '{' and '}' which we are converting to unicode private
  // characters so we can distinguish them from '"', ' ', '{', '}' and ''',
  // which are special. They need swapping back post-split - see unescape2()
  typed = typed
      .replace(/\\\\/g, '\\')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\v/g, '\v')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\ /g, '\uF000')
      .replace(/\\'/g, '\uF001')
      .replace(/\\"/g, '\uF002')
      .replace(/\\{/g, '\uF003')
      .replace(/\\}/g, '\uF004');

  function unescape2(escaped) {
    return escaped
        .replace(/\uF000/g, ' ')
        .replace(/\uF001/g, '\'')
        .replace(/\uF002/g, '"')
        .replace(/\uF003/g, '{')
        .replace(/\uF004/g, '}');
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
          var str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, ''));
          mode = In.WHITESPACE;
          start = i;
          prefix = '';
        }
        break;

      case In.SINGLE_Q:
        if (c === '\'') {
          var str = unescape2(typed.substring(start, i));
          args.push(new Argument(str, prefix, c));
          mode = In.WHITESPACE;
          start = i + 1;
          prefix = '';
        }
        break;

      case In.DOUBLE_Q:
        if (c === '"') {
          var str = unescape2(typed.substring(start, i));
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
            var str = unescape2(typed.substring(start, i));
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
        var str = unescape2(typed.substring(start, i + 1));
        args.push(new ScriptArgument(str, prefix, ''));
      }
      else {
        var str = unescape2(typed.substring(start, i + 1));
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
  // Handle the special case of the user typing { javascript(); }
  // We use the hidden 'eval' command directly rather than shift()ing one of
  // the parameters, and parse()ing it.
  if (args[0] instanceof ScriptArgument) {
    // Special case: if the user enters { console.log('foo'); } then we need to
    // use the hidden 'eval' command
    var conversion = new Conversion(evalCommand, new Argument());
    this.commandAssignment.setConversion(conversion);
    return;
  }

  var argsUsed = 1;
  var conversion;

  while (argsUsed <= args.length) {
    var arg = (argsUsed === 1) ?
      args[0] :
      new MergedArgument(args, 0, argsUsed);
    conversion = this.commandAssignment.param.type.parse(arg);

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

  this.commandAssignment.setConversion(conversion);

  for (var i = 0; i < argsUsed; i++) {
    args.shift();
  }

  // This could probably be re-written to consume args as we go
};

/**
 * Work out which arguments are applicable to which parameters.
 */
Requisition.prototype._assign = function(args) {
  if (!this.commandAssignment.getValue()) {
    this._unassigned.setUnassigned(args);
    return;
  }

  if (args.length === 0) {
    this.setDefaultArguments();
    this._unassigned.setDefault();
    return;
  }

  // Create an error if the command does not take parameters, but we have
  // been given them ...
  if (this.assignmentCount === 0) {
    this._unassigned.setUnassigned(args);
    return;
  }

  // Special case: if there is only 1 parameter, and that's of type
  // text, then we put all the params into the first param
  if (this.assignmentCount === 1) {
    var assignment = this.getAssignment(0);
    if (assignment.param.type instanceof StringType) {
      var arg = (args.length === 1) ?
        args[0] :
        new MergedArgument(args);
      var conversion = assignment.param.type.parse(arg);
      assignment.setConversion(conversion);
      this._unassigned.setDefault();
      return;
    }
  }

  // Positional arguments can still be specified by name, but if they are
  // then we need to ignore them when working them out positionally
  var names = this.getParameterNames();

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
        names = names.filter(function(test) {
          return test !== assignment.param.name;
        });

        // boolean parameters don't have values, default to false
        if (assignment.param.type instanceof BooleanType) {
          arg = new TrueNamedArgument(null, arg);
        }
        else {
          var valueArg = null;
          if (i + 1 >= args.length) {
            valueArg = args.splice(i, 1)[0];
          }
          arg = new NamedArgument(arg, valueArg);
        }

        if (assignment.param.type instanceof ArrayType) {
          var arrayArg = arrayArgs[assignment.param.name];
          if (!arrayArg) {
            arrayArg = new ArrayArgument();
            arrayArgs[assignment.param.name] = arrayArg;
          }
          arrayArg.addArgument(arg);
        }
        else {
          var conversion = assignment.param.type.parse(arg);
          assignment.setConversion(conversion);
        }
      }
      else {
        // Skip this parameter and handle as a positional parameter
        i++;
      }
    }
  }, this);

  // What's left are positional parameters assign in order
  names.forEach(function(name) {
    var assignment = this.getAssignment(name);

    // If not set positionally, and we can't set it non-positionally,
    // we have to default it to prevent previous values surviving
    if (!assignment.param.isPositionalAllowed()) {
      assignment.setDefault();
      return;
    }

    // If this is a positional array argument, then it swallows the
    // rest of the arguments.
    if (assignment.param.type instanceof ArrayType) {
      var arrayArg = arrayArgs[assignment.param.name];
      if (!arrayArg) {
        arrayArg = new ArrayArgument();
        arrayArgs[assignment.param.name] = arrayArg;
      }
      arrayArg.addArguments(args);
      args = [];
    }
    else {
      var arg = (args.length > 0) ?
          args.splice(0, 1)[0] :
          new Argument();

      var conversion = assignment.param.type.parse(arg);
      assignment.setConversion(conversion);
    }
  }, this);

  // Now we need to assign the array argument (if any)
  Object.keys(arrayArgs).forEach(function(name) {
    var assignment = this.getAssignment(name);
    var conversion = assignment.param.type.parse(arrayArgs[name]);
    assignment.setConversion(conversion);
  }, this);

  if (args.length > 0) {
    this._unassigned.setUnassigned(args);
  }
  else {
    this._unassigned.setDefault();
  }
};

exports.Requisition = Requisition;


/**
 * Functions and data related to the execution of a command
 */
function ExecutionContext(environment, document) {
  this.environment = environment;
  this.document = document;
}

ExecutionContext.prototype.createPromise = function() {
  return new Promise();
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/promise', ['require', 'exports', 'module' ], function(require, exports, module) {


/**
 * Create an unfulfilled promise
 * @constructor
 */
function Promise() {
  this._status = Promise.PENDING;
  this._value = undefined;
  this._onSuccessHandlers = [];
  this._onErrorHandlers = [];

  // Debugging help
  this._id = Promise._nextId++;
  Promise._outstanding[this._id] = this;
}

/**
 * We give promises and ID so we can track which are outstanding
 */
Promise._nextId = 0;

/**
 * Outstanding promises. Handy list for debugging only
 */
Promise._outstanding = [];

/**
 * Recently resolved promises. Also for debugging only
 */
Promise._recent = [];

/**
 * A promise can be in one of 2 states.
 * The ERROR and SUCCESS states are terminal, the PENDING state is the only
 * start state.
 */
Promise.ERROR = -1;
Promise.PENDING = 0;
Promise.SUCCESS = 1;

/**
 * Yeay for RTTI
 */
Promise.prototype.isPromise = true;

/**
 * Have we either been resolve()ed or reject()ed?
 */
Promise.prototype.isComplete = function() {
  return this._status != Promise.PENDING;
};

/**
 * Have we resolve()ed?
 */
Promise.prototype.isResolved = function() {
  return this._status == Promise.SUCCESS;
};

/**
 * Have we reject()ed?
 */
Promise.prototype.isRejected = function() {
  return this._status == Promise.ERROR;
};

/**
 * Take the specified action of fulfillment of a promise, and (optionally)
 * a different action on promise rejection
 */
Promise.prototype.then = function(onSuccess, onError) {
  if (typeof onSuccess === 'function') {
    if (this._status === Promise.SUCCESS) {
      onSuccess.call(null, this._value);
    }
    else if (this._status === Promise.PENDING) {
      this._onSuccessHandlers.push(onSuccess);
    }
  }

  if (typeof onError === 'function') {
    if (this._status === Promise.ERROR) {
      onError.call(null, this._value);
    }
    else if (this._status === Promise.PENDING) {
      this._onErrorHandlers.push(onError);
    }
  }

  return this;
};

/**
 * Like then() except that rather than returning <tt>this</tt> we return
 * a promise which resolves when the original promise resolves
 */
Promise.prototype.chainPromise = function(onSuccess) {
  var chain = new Promise();
  chain._chainedFrom = this;
  this.then(function(data) {
    try {
      chain.resolve(onSuccess(data));
    }
    catch (ex) {
      chain.reject(ex);
    }
  }, function(ex) {
    chain.reject(ex);
  });
  return chain;
};

/**
 * Supply the fulfillment of a promise
 */
Promise.prototype.resolve = function(data) {
  return this._complete(this._onSuccessHandlers,
                        Promise.SUCCESS, data, 'resolve');
};

/**
 * Renege on a promise
 */
Promise.prototype.reject = function(data) {
  return this._complete(this._onErrorHandlers, Promise.ERROR, data, 'reject');
};

/**
 * Internal method to be called on resolve() or reject()
 * @private
 */
Promise.prototype._complete = function(list, status, data, name) {
  // Complain if we've already been completed
  if (this._status != Promise.PENDING) {
    if (typeof 'console' !== 'undefined') {
      console.error('Promise complete. Attempted ' + name + '() with ', data);
      console.error('Prev status = ', this._status, ', value = ', this._value);
    }
    throw new Error('Promise already complete');
  }

  this._status = status;
  this._value = data;

  // Call all the handlers, and then delete them
  list.forEach(function(handler) {
    handler.call(null, this._value);
  }, this);
  delete this._onSuccessHandlers;
  delete this._onErrorHandlers;

  // Remove the given {promise} from the _outstanding list, and add it to the
  // _recent list, pruning more than 20 recent promises from that list
  delete Promise._outstanding[this._id];
  Promise._recent.push(this);
  while (Promise._recent.length > 20) {
    Promise._recent.shift();
  }

  return this;
};

/**
 * Takes an array of promises and returns a promise that that is fulfilled once
 * all the promises in the array are fulfilled
 * @param promiseList The array of promises
 * @return the promise that is fulfilled when all the array is fulfilled
 */
Promise.group = function(promiseList) {
  if (!(promiseList instanceof Array)) {
    promiseList = Array.prototype.slice.call(arguments);
  }

  // If the original array has nothing in it, return now to avoid waiting
  if (promiseList.length === 0) {
    return new Promise().resolve([]);
  }

  var groupPromise = new Promise();
  var results = [];
  var fulfilled = 0;

  var onSuccessFactory = function(index) {
    return function(data) {
      results[index] = data;
      fulfilled++;
      // If the group has already failed, silently drop extra results
      if (groupPromise._status !== Promise.ERROR) {
        if (fulfilled === promiseList.length) {
          groupPromise.resolve(results);
        }
      }
    };
  };

  promiseList.forEach(function(promise, index) {
    var onSuccess = onSuccessFactory(index);
    var onError = groupPromise.reject.bind(groupPromise);
    promise.then(onSuccess, onError);
  });

  return groupPromise;
};

exports.Promise = Promise;

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/command_output_view', ['require', 'exports', 'module' , 'gcli/util', 'gcli/canon', 'gcli/ui/domtemplate', 'text!gcli/ui/command_output_view.css', 'text!gcli/ui/command_output_view.html'], function(require, exports, module) {

var dom = require('gcli/util').dom;
var event = require('gcli/util').event;

var canon = require('gcli/canon');
var Templater = require('gcli/ui/domtemplate').Templater;

var commandOutputViewCss = require('text!gcli/ui/command_output_view.css');
var commandOutputViewHtml = require('text!gcli/ui/command_output_view.html');


/**
 * Work out the path for images.
 * This should probably live in some utility area somewhere, but it's kind of
 * dependent on the implementation of require, and there isn't currently any
 * better place for it.
 */
function imageUrl(path) {
  try {
    return require('text!gcli/ui/' + path);
  }
  catch (ex) {
    var filename = module.id.split('/').pop() + '.js';
    var imagePath;

    if (module.uri.substr(-filename.length) !== filename) {
      console.error('Can\'t work out path from module.uri/module.id');
      return path;
    }

    if (module.uri) {
      var end = module.uri.length - filename.length - 1;
      return module.uri.substr(0, end) + '/' + path;
    }

    return filename + '/' + path;
  }
}


/**
 * A wrapper for a set of rows|command outputs.
 * Register with the canon to be notified when commands have output to be
 * displayed.
 */
function CommandOutputListView(options) {
  this.document = options.document;
  this.inputter = options.inputter;
  this.requisition = options.requisition;
  this.commandOutputManager = options.commandOutputManager || canon.commandOutputManager;

  this.element = options.element || 'gcliCommandOutput';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.document.getElementById(name);

    if (!this.element) {
      this.autoHide = true;
      this.element = dom.createElement(this.document, 'div');
    }
  }

  dom.addCssClass(this.element, 'gcliCommandOutput');

  this.commandOutputManager.addListener(this.onOutputCommandChange, this);

  if (commandOutputViewCss != null) {
    this.style = dom.importCss(commandOutputViewCss, this.document);
  }

  var templates = dom.createElement(this.document, 'div');
  dom.setInnerHtml(templates, commandOutputViewHtml);
  this._row = templates.querySelector('.gcliRow');
}

/**
 * Avoid memory leaks
 */
CommandOutputListView.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.document;
  delete this._row;
};

/**
 * Monitor for new command executions
 */
CommandOutputListView.prototype.onOutputCommandChange = function(ev) {
  if (!ev.output.view) {
    ev.output.view = new CommandOutputView(ev.output, this);
  }
  ev.output.view.onChange(ev);
};

/**
 * Popup likes to be able to control the height of its children
 */
CommandOutputListView.prototype.setHeight = function(height) {
  this.element.style.height = height + 'px';
};

exports.CommandOutputListView = CommandOutputListView;


/**
 * Adds a row to the CLI output display
 */
function CommandOutputView(outputData, commandOutputListView) {
  this.outputData = outputData;
  this.listView = commandOutputListView;

  this.imageUrl = imageUrl;

  // Elements attached to this by the templater.
  this.elems = {
    rowin: null,
    rowout: null,
    output: null,
    hide: null,
    show: null,
    duration: null,
    throb: null,
    prompt: null
  };

  new Templater().processNode(this.listView._row.cloneNode(true), this);

  this.listView.element.appendChild(this.elems.rowin);
  this.listView.element.appendChild(this.elems.rowout);
}

/**
 * A single click on an invocation line in the console copies the command
 * to the command line
 */
CommandOutputView.prototype.copyToInput = function() {
  if (this.listView.inputter) {
    this.listView.inputter.setInput(this.outputData.typed);
  }
};

/**
 * A double click on an invocation line in the console executes the command
 */
CommandOutputView.prototype.execute = function(ev) {
  if (this.listView.requisition) {
    this.listView.requisition.exec({ typed: this.outputData.typed });
  }
};

CommandOutputView.prototype.hideOutput = function(ev) {
  this.elems.output.style.display = 'none';
  dom.addCssClass(this.elems.hide, 'cmd_hidden');
  dom.removeCssClass(this.elems.show, 'cmd_hidden');

  event.stopPropagation(ev);
};

CommandOutputView.prototype.showOutput = function(ev) {
  this.elems.output.style.display = 'block';
  dom.removeCssClass(this.elems.hide, 'cmd_hidden');
  dom.addCssClass(this.elems.show, 'cmd_hidden');

  event.stopPropagation(ev);
};

CommandOutputView.prototype.remove = function(ev) {
  this.listView.element.removeChild(this.elems.rowin);
  this.listView.element.removeChild(this.elems.rowout);
  event.stopPropagation(ev);
};

CommandOutputView.prototype.onChange = function(ev) {
  dom.setInnerHtml(this.elems.duration, this.outputData.duration != null ?
    'completed in ' + (this.outputData.duration / 1000) + ' sec ' :
    '');

  if (this.outputData.completed) {
    dom.addCssClass(this.elems.prompt, 'gcliComplete');
  }
  if (this.outputData.error) {
    dom.addCssClass(this.elems.prompt, 'gcliError');
  }

  dom.clearElement(this.elems.output);

  var node;
  if (this.outputData.output != null) {
    if (this.outputData.output instanceof HTMLElement) {
      this.elems.output.appendChild(this.outputData.output);
    }
    else {
      node = dom.createElement(this.listView.document, 'p');
      dom.setInnerHtml(node, this.outputData.output.toString());
      this.elems.output.appendChild(node);
    }
  }

  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.listView.element.scrollHeight,
      this.listView.element.clientHeight);
  this.listView.element.scrollTop =
      scrollHeight - this.listView.element.clientHeight;

  dom.setCssClass(this.elems.output, 'cmd_error', this.outputData.error);

  this.elems.throb.style.display = this.outputData.completed ? 'none' : 'block';
};

exports.CommandOutputView = CommandOutputView;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/domtemplate', ['require', 'exports', 'module' ], function(require, exports, module) {


// WARNING: do not 'use_strict' without reading the notes in _envEval();

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
            value = this._stripBraces(value);
            this._property(value, data, node);
            node.removeAttribute('save');
          } else if (name.substring(0, 2) === 'on') {
            // Event registration relies on property doing a bind
            value = this._stripBraces(value);
            var func = this._property(value, data);
            if (typeof func !== 'function') {
              this._handleError('Expected ' + value +
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
            var newValue = value.replace(/\$\{[^}]*\}/g, function(path) {
              return this._envEval(path.slice(2, -1), data, value);
            }.bind(this));
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

    if (node.nodeType === Node.TEXT_NODE) {
      this._processTextNode(node, data);
    }
  } finally {
    delete data.__element;
    this.stack.pop();
  }
};

/**
 * Handle <x if="${...}">
 * @param node An element with an 'if' attribute
 * @param data The data to use with _envEval()
 * @returns true if processing should continue, false otherwise
 */
Templater.prototype._processIf = function(node, data) {
  this.stack.push('if');
  try {
    var originalValue = node.getAttribute('if');
    var value = this._stripBraces(originalValue);
    var recurse = true;
    try {
      var reply = this._envEval(value, data, originalValue);
      recurse = !!reply;
    } catch (ex) {
      this._handleError('Error with \'' + value + '\'', ex);
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
 * @param data The data to use with _envEval()
 */
Templater.prototype._processForEach = function(node, data) {
  this.stack.push('foreach');
  try {
    var originalValue = node.getAttribute('foreach');
    var value = originalValue;

    var paramName = 'param';
    if (value.charAt(0) === '$') {
      // No custom loop variable name. Use the default: 'param'
      value = this._stripBraces(value);
    } else {
      // Extract the loop variable name from 'NAME in ${ARRAY}'
      var nameArr = value.split(' in ');
      paramName = nameArr[0].trim();
      value = this._stripBraces(nameArr[1].trim());
    }
    node.removeAttribute('foreach');
    try {
      var evaled = this._envEval(value, data, originalValue);
      this._handleAsync(evaled, node, function(reply, siblingNode) {
        this._processForEachLoop(reply, node, siblingNode, data, paramName);
      }.bind(this));
      node.parentNode.removeChild(node);
    } catch (ex) {
      this._handleError('Error with \'' + value + '\'', ex);
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
 * _processForEach()). Handle <LOOP> elements (which are taken out of the DOM),
 * clone the template, and pass the processing on to processNode().
 * @param member The data item to use in templating
 * @param template The node to copy for each set member
 * @param siblingNode The parent node to which we add things
 * @param data the data to use for node processing
 * @param paramName The name given to 'member' by the foreach attribute
 * @param frame A name to push on the stack for debugging
 */
Templater.prototype._processForEachMember = function(member, template, siblingNode, data, paramName, frame) {
  this.stack.push(frame);
  try {
    this._handleAsync(member, siblingNode, function(reply, node) {
      data[paramName] = reply;
      if (template.nodeName.toLowerCase() === 'loop') {
        for (var i = 0; i < template.childNodes.length; i++) {
          var clone = template.childNodes[i].cloneNode(true);
          node.parentNode.insertBefore(clone, node);
          this.processNode(clone, data);
        }
      } else {
        var clone = template.cloneNode(true);
        clone.removeAttribute('foreach');
        node.parentNode.insertBefore(clone, node);
        this.processNode(clone, data);
      }
      delete data[paramName];
    }.bind(this));
  } finally {
    this.stack.pop();
  }
};

/**
 * Take a text node and replace it with another text node with the ${...}
 * sections parsed out. We replace the node by altering node.parentNode but
 * we could probably use a DOM Text API to achieve the same thing.
 * @param node The Text node to work on
 * @param data The data to use in calls to _envEval()
 */
Templater.prototype._processTextNode = function(node, data) {
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
        part = this._envEval(part.slice(1), data, node.data);
      }
      this._handleAsync(part, node, function(reply, siblingNode) {
        reply = this._toNode(reply, siblingNode.ownerDocument);
        siblingNode.parentNode.insertBefore(reply, siblingNode);
      }.bind(this));
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
Templater.prototype._toNode = function(thing, document) {
  if (thing == null) {
    thing = '' + thing;
  }
  // if thing isn't a DOM element then wrap its string value in one
  if (typeof thing.cloneNode !== 'function') {
    thing = document.createTextNode(thing.toString());
  }
  return thing;
};

/**
 * A function to handle the fact that some nodes can be promises, so we check
 * and resolve if needed using a marker node to keep our place before calling
 * an inserter function.
 * @param thing The object which could be real data or a promise of real data
 * we use it directly if it's not a promise, or resolve it if it is.
 * @param siblingNode The element before which we insert new elements.
 * @param inserter The function to to the insertion. If thing is not a promise
 * then _handleAsync() is just 'inserter(thing, siblingNode)'
 */
Templater.prototype._handleAsync = function(thing, siblingNode, inserter) {
  if (typeof thing.then === 'function') {
    // Placeholder element to be replaced once we have the real data
    var tempNode = siblingNode.ownerDocument.createElement('span');
    siblingNode.parentNode.insertBefore(tempNode, siblingNode);
    thing.then(function(delayed) {
      inserter(delayed, tempNode);
      tempNode.parentNode.removeChild(tempNode);
    }.bind(this));
  }
  else {
    inserter(thing, siblingNode);
  }
};

/**
 * Warn of string does not begin '${' and end '}'
 * @param str the string to check.
 * @return The string stripped of ${ and }, or untouched if it does not match
 */
Templater.prototype._stripBraces = function(str) {
  if (!str.match(/\$\{.*\}/g)) {
    this._handleError('Expected ' + str + ' to match ${...}');
    return str;
  }
  return str.slice(2, -1);
};

/**
 * Combined getter and setter that works with a path through some data set.
 * For example:
 * <ul>
 * <li>_property('a.b', { a: { b: 99 }}); // returns 99
 * <li>_property('a', { a: { b: 99 }}); // returns { b: 99 }
 * <li>_property('a', { a: { b: 99 }}, 42); // returns 99 and alters the
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
Templater.prototype._property = function(path, data, newValue) {
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
        return value.bind(data);
      }
      return value;
    }
    if (!value) {
      this._handleError('Can\'t find path=' + path);
      return null;
    }
    return this._property(path.slice(1), value, newValue);
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
 * @param script The string to be evaluated.
 * @param data The environment in which to eval the script.
 * @param frame Optional debugging string in case of failure.
 * @return The return value of the script, or the error message if the script
 * execution failed.
 */
Templater.prototype._envEval = function(script, data, frame) {
  with (data) {
    try {
      this.stack.push(frame);
      return eval(script);
    } catch (ex) {
      this._handleError('Template error evaluating \'' + script + '\'' +
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
Templater.prototype._handleError = function(message, ex) {
  this._logError(message);
  this._logError('In: ' + this.stack.join(' > '));
  if (ex) {
    this._logError(ex);
  }
};


/**
 * A generic way of reporting errors, for easy overloading in different
 * environments.
 * @param message the error message to report.
 */
Templater.prototype._logError = function(message) {
  console.log(message);
};

exports.Templater = Templater;


});
define("text!gcli/ui/command_output_view.css", [], "" +
  ".gcliCommandOutput {" +
  "  overflow: auto;" +
  "  top: 0;" +
  "  height: 100%;" +
  "}" +
  "" +
  ".gcliRowIn {" +
  "  margin-top: 5px;" +
  "  margin-right: 5px;" +
  "  color: #333;" +
  "  background-color: #EEE;" +
  "  padding: 3px 8px 1px 1px;" +
  "  border: 1px solid #aaa;" +
  "  border-radius: 4px;" +
  "  -moz-border-radius: 4px;" +
  "  -webkit-border-radius: 4px;" +
  "}" +
  "" +
  ".gcliRowIn > img {" +
  "  cursor: pointer;" +
  "}" +
  "" +
  ".gcliHover {" +
  "  display: none;" +
  "  float: right;" +
  "  padding: 2px 2px 0 2px;" +
  "}" +
  "" +
  ".gcliRowIn:hover > .gcliHover {" +
  "  display: inline;" +
  "}" +
  "" +
  ".gcliRowIn:hover > .gcliHover.gcliHidden {" +
  "  display: none;" +
  "}" +
  "" +
  ".gcliOutTyped {" +
  "  color: #000;" +
  "  font-family: consolas, courier, monospace;" +
  "}" +
  "" +
  ".gcliRowOutput {" +
  "  padding-left: 10px;" +
  "  line-height: 1.2em;" +
  "  font-size: 95%;" +
  "}" +
  "" +
  ".gcliRowOutput strong," +
  ".gcliRowOutput b," +
  ".gcliRowOutput th," +
  ".gcliRowOutput h1," +
  ".gcliRowOutput h2," +
  ".gcliRowOutput h3 {" +
  "  color: #000;" +
  "}" +
  "" +
  ".gcliRowOutput a {" +
  "  font-weight: bold;" +
  "  color: #666;" +
  "  text-decoration: none;" +
  "}" +
  "" +
  ".gcliRowOutput a:hover {" +
  "  text-decoration: underline;" +
  "  cursor: pointer;" +
  "}" +
  "" +
  ".gcliRowOutput input[type=password]," +
  ".gcliRowOutput input[type=text]," +
  ".gcliRowOutput textarea {" +
  "  color: #000;" +
  "  font-size: 120%;" +
  "  background: transparent;" +
  "  padding: 3px;" +
  "  border-radius: 5px;" +
  "  -moz-border-radius: 5px;" +
  "  -webkit-border-radius: 5px;" +
  "}" +
  "" +
  ".gcliRowOutput table," +
  ".gcliRowOutput td," +
  ".gcliRowOutput th {" +
  "  border: 0;" +
  "  padding: 0 2px;" +
  "}" +
  "" +
  ".gcliRowOutput .right {" +
  "  text-align: right;" +
  "}" +
  "" +
  ".gcliGt {" +
  "  font-family: consolas, courier, monospace;" +
  "  color: #00F;" +
  "  font-weight: bold;" +
  "  font-size: 120%;" +
  "  padding-left: 2px;" +
  "}" +
  "" +
  ".gcliGt.gcliComplete {" +
  "  color: #060;" +
  "}" +
  "" +
  ".gcliGt.gcliError {" +
  "  color: #F00;" +
  "}" +
  "" +
  ".gcliDuration {" +
  "  font-size: 80%;" +
  "}" +
  "");

define("text!gcli/ui/command_output_view.html", [], "" +
  "<div class=\"gcliRow\">" +
  "  <!-- The div for the input (i.e. what was typed) -->" +
  "  <div class=\"gcliRowIn\" save=\"${elems.rowin}\" aria-live=\"assertive\"" +
  "      onclick=\"${copyToInput}\" ondblclick=\"${execute}\">" +
  "" +
  "    <!-- What the user actually typed -->" +
  "    <span save=\"${elems.prompt}\" class=\"gcliGt ${elems.error ? 'gcliError' : ''} ${elems.completed ? 'gcliCompleted' : ''}\">&#x00BB;</span>" +
  "    <span class=\"gcliOutTyped\">${outputData.typed}</span>" +
  "" +
  "    <!-- The extra details that appear on hover -->" +
  "    <span class=\"gcliDuration gcliHover\" save=\"${elems.duration}\"></span>" +
  "    <!--" +
  "    <img class=\"gcliHover\" onclick=\"${hideOutput}\" save=\"${elems.hide}\"" +
  "        alt=\"Hide command output\" _src=\"${imageUrl('images/minus.png')}\"/>" +
  "    <img class=\"gcliHover gcliHidden\" onclick=\"${showOutput}\" save=\"${elems.show}\"" +
  "        alt=\"Show command output\" _src=\"${imageUrl('images/plus.png')}\"/>" +
  "    <img class=\"gcliHover\" onclick=\"${remove}\"" +
  "        alt=\"Remove this command from the history\"" +
  "        _src=\"${imageUrl('images/closer.png')}\"/>" +
  "    -->" +
  "    <img style=\"float:right;\" _src=\"${imageUrl('images/throbber.gif')}\" save=\"${elems.throb}\"/>" +
  "  </div>" +
  "" +
  "  <!-- The div for the command output -->" +
  "  <div class=\"gcliRowOut\" save=\"${elems.rowout}\" aria-live=\"assertive\">" +
  "    <div class=\"gcliRowOutput\" save=\"${elems.output}\"></div>" +
  "  </div>" +
  "</div>" +
  "");

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/popup', ['require', 'exports', 'module' , 'gcli/util'], function(require, exports, module) {
var cliView = exports;


var dom = require('gcli/util').dom;
var event = require('gcli/util').event;


/**
 * Popup is responsible for containing the popup hints that are displayed
 * above the command line.
 * Some implementations of GCLI require an element to be visible whenever the
 * GCLI has the focus.
 * This can be somewhat tricky because the definition of 'has the focus' is
 * one where a group of elements could have the focus.
 */
function Popup(options) {
  this.document = options.document || document;

  this.inputter = options.inputter;
  this.children = options.children;
  this.style = options.style || Popup.style.doubleColumnFirstFixedLeft;

  this.autoHide = false;

  this.element = options.popupElement || 'gcliOutput';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.document.getElementById(name);

    if (!this.element) {
      this.autoHide = true;
      this.element = dom.createElement(this.document, 'div');
      this.element.id = name;
      if (this.inputter) {
        this.inputter.appendAfter(this.element);
      }

      this.element.style.position = 'absolute';
      this.element.style.zIndex = '999';
    }
  }

  // Allow options to override the autoHide option
  if (options.autoHide != null) {
    this.autoHide = options.autoHide;
  }

  this.children.forEach(function(child) {
    if (child.element) {
      this.element.appendChild(child.element);
    }
  }, this);

  this.win = this.element.ownerDocument.defaultView;

  // Keep the popup element the right size when the window changes
  this.resizer = this.resizer.bind(this);
  if (this.autoHide) {
    event.addListener(this.win, 'resize', this.resizer);
  }

  this.focusManager = options.focusManager;
  if (this.focusManager) {
    this.focusManager.onFocus.add(this.show, this);
    this.focusManager.onBlur.add(this.hide, this);
    this.focusManager.addMonitoredElement(this.element, 'popup');
  }

  if (this.style === Popup.style.doubleColumnFirstFixedLeft) {
    var left = this.children[0].element;
    left.style.position = 'absolute';
    left.style.bottom = '0';
    left.style.left = '0';
    left.style.maxWidth = '300px';

    var right = this.children[1].element;
    right.style.position = 'absolute';
    right.style.bottom = '0';
    right.style.left = '320px';
    right.style.right = '0';

    // What height should the output panel be, by default?
    this._outputHeight = options.outputHeight || 300;
  }
  else if (this.style === Popup.style.singleColumnVariable) {
    this._outputHeight = -1;
  }
  else {
    throw new Error('Invalid style setting');
  }

  // Adjust to the current outputHeight only when we created the output
  if (this.autoHide) {
    this.setOutputHeight(this._outputHeight);
  }
}

/**
 * Unregister all event listeners
 */
Popup.prototype.destroy = function() {
  event.removeListener(this.win, 'resize', this.resizer);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element);
    this.focusManager.onFocus.remove(this.show, this);
    this.focusManager.onBlur.remove(this.hide, this);
  }

  delete this.document;
  delete this.element;
};

/**
 * A way to customize chunks of CSS in one go.
 * This is a bit of a hack, perhaps we'll move to injected CSS or something
 * later when we know more about what needs customizing.
 */
Popup.style = {
  doubleColumnFirstFixedLeft: 'doubleColumnFirstFixedLeft',
  singleColumnVariable: 'singleColumnVariable'
};

/**
 * Configuration point - how high should the output window be?
 */
Popup.prototype.setOutputHeight = function(outputHeight) {
  if (outputHeight == null) {
    this._outputHeight = outputHeight;
  }

  if (this._outputHeight === -1) {
    return;
  }

  this.element.style.height = this._outputHeight + 'px';
  this.children.forEach(function(child) {
    if (child.setHeight) {
      child.setHeight(this._outputHeight);
    }
  }, this);
};

/**
 * Tweak CSS to show the output popup
 */
Popup.prototype.show = function() {
  this.element.style.display = 'inline-block';
};

/**
 * Hide the popup using a CSS tweak
 */
Popup.prototype.hide = function() {
  this.element.style.display = 'none';
};

/**
 * To be called on window resize or any time we want to align the elements
 * with the input box.
 */
Popup.prototype.resizer = function() {
  var rect = this.inputter.element.getBoundingClientRect();
  rect.width = rect.right - rect.left;
  rect.height = rect.bottom - rect.top;

  this.element.style.top = 'auto';
  var bottom = this.document.documentElement.clientHeight - rect.top;
  this.element.style.bottom = bottom + 'px';
  this.element.style.left = rect.left + 'px';

  if (this.style === Popup.style.doubleColumnFirstFixedLeft) {
    this.element.style.width = (rect.width - 80) + 'px';
  }
};

cliView.Popup = Popup;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/inputter', ['require', 'exports', 'module' , 'gcli/util', 'gcli/types', 'gcli/history', 'text!gcli/ui/inputter.css'], function(require, exports, module) {
var cliView = exports;


var event = require('gcli/util').event;
var dom = require('gcli/util').dom;
var KeyEvent = event.KeyEvent;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;

var inputterCss = require('text!gcli/ui/inputter.css');


/**
 * A wrapper to take care of the functions concerning an input element
 */
function Inputter(options) {
  this.requisition = options.requisition;

  // Suss out where the input element is
  this.element = options.inputElement || 'gcliInput';
  if (typeof this.element === 'string') {
    this.document = options.document || document;
    var name = this.element;
    this.element = this.document.getElementById(name);
    if (!this.element) {
      throw new Error('No element with id=' + name + '.');
    }
  }
  else {
    // Assume we've been passed in the correct node
    this.document = this.element.ownerDocument;
  }

  if (inputterCss != null) {
    this.style = dom.importCss(inputterCss, this.document);
  }

  this.element.spellcheck = false;

  // Used to distinguish focus from TAB in CLI. See onKeyUp()
  this.lastTabDownAt = 0;

  // Used to effect caret changes. See _processCaretChange()
  this._caretChange = null;

  // Ensure that TAB/UP/DOWN isn't handled by the browser
  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);
  event.addListener(this.element, 'keydown', this.onKeyDown);
  event.addListener(this.element, 'keyup', this.onKeyUp);

  if (options.completer == null) {
    options.completer = new Completer(options);
  }
  else if (typeof options.completer === 'function') {
    options.completer = new options.completer(options);
  }
  this.completer = options.completer;
  this.completer.decorate(this);

  // Use the provided history object, or instantiate our own
  this.history = options.history = options.history || new History(options);
  this._scrollingThroughHistory = false;

  // Cursor position affects hint severity
  this.onMouseUp = function(ev) {
    this.completer.update(this.getInputState());
  }.bind(this);
  event.addListener(this.element, 'mouseup', this.onMouseUp);

  this.focusManager = options.focusManager;
  if (this.focusManager) {
    this.focusManager.addMonitoredElement(this.element, 'input');
  }

  this.requisition.inputChange.add(this.onInputChange, this);
}

/**
 * Avoid memory leaks
 */
Inputter.prototype.destroy = function() {
  this.requisition.inputChange.remove(this.onInputChange, this);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element, 'input');
  }

  event.removeListener(this.element, 'keydown', this.onKeyDown);
  event.removeListener(this.element, 'keyup', this.onKeyUp);
  delete this.onKeyDown;
  delete this.onKeyUp;

  this.history.destroy();
  this.completer.destroy();

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.document;
  delete this.element;
};

/**
 * Utility to add an element into the DOM after the input element
 */
Inputter.prototype.appendAfter = function(element) {
  this.element.parentNode.insertBefore(element, this.element.nextSibling);
};

/**
 * Handler for the Requisition.inputChange event
 */
Inputter.prototype.onInputChange = function() {
  if (this._caretChange == null) {
    // We weren't expecting a change so this was requested by the hint system
    // we should move the cursor to the end of the 'changed section', and the
    // best we can do for that right now is the end of the current argument.
    this._caretChange = Caret.TO_ARG_END;
  }
  this._setInputInternal(this.requisition.toString());
};

/**
 * Internal function to set the input field to a value.
 * This function checks to see if the current value is the same as the new
 * value, and makes no changes if they are the same (except for caret/completer
 * updating - see below). If changes are to be made, they are done in a timeout
 * to avoid XUL bug 676520.
 * This function assumes that the data model is up to date with the new value.
 * It does attempts to leave the caret position in the same position in the
 * input string unless this._caretChange === Caret.TO_ARG_END. This is required
 * for completion events.
 * It does not change the completer decoration unless this._updatePending is
 * set. This is required for completion events.
 */
Inputter.prototype._setInputInternal = function(str, update) {
  if (!this.document) {
    return; // This can happen post-destroy()
  }

  if (this.element.value && this.element.value === str) {
    this._processCaretChange(this.getInputState(), false);
    return;
  }

  // Updating in a timeout fixes a XUL issue (bug 676520) where textbox gives
  // incorrect values for its content
  this.document.defaultView.setTimeout(function() {
    if (!this.document) {
      return; // This can happen post-destroy()
    }

    // Bug 678520 - We could do better caret handling by recording the caret
    // position in terms of offset into an assignment, and then replacing into
    // a similar place
    var input = this.getInputState();
    input.typed = str;
    this._processCaretChange(input);
    this.element.value = str;

    if (update) {
      this.update();
    }
  }.bind(this), 0);
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
 * @param forceUpdate Do we call this.completer.update even when the cursor has
 * not changed (useful when input.typed has changed)
 */
Inputter.prototype._processCaretChange = function(input, forceUpdate) {
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

    case null:
    case Caret.NO_CHANGE:
      start = input.cursor.start;
      end = input.cursor.end;
      break;
  }

  start = (start > input.typed.length) ? input.typed.length : start;
  end = (end > input.typed.length) ? input.typed.length : end;

  var newInput = { typed: input.typed, cursor: { start: start, end: end }};
  if (start !== input.cursor.start || end !== input.cursor.end || forceUpdate) {
    this.completer.update(newInput);
  }

  dom.setSelectionStart(this.element, newInput.cursor.start);
  dom.setSelectionEnd(this.element, newInput.cursor.end);

  this._caretChange = null;
  return newInput;
};

/**
 * Set the input field to a value.
 * This function updates the data model and the completer decoration. It sets
 * the caret to the end of the input. It does not make any similarity checks
 * so calling this function with it's current value resets the cursor position.
 * It does not execute the input or affect the history.
 * This function should not be called internally, by Inputter and never as a
 * result of a keyboard event on this.element or bug 676520 could be triggered.
 */
Inputter.prototype.setInput = function(str) {
  this.element.value = str;
  this.update();
};

/**
 * Focus the input element
 */
Inputter.prototype.focus = function() {
  this.element.focus();
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Inputter.prototype.onKeyDown = function(ev) {
  if (ev.keyCode === KeyEvent.DOM_VK_UP || ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    event.stopEvent(ev);
  }
  if (ev.keyCode === KeyEvent.DOM_VK_TAB) {
    this.lastTabDownAt = 0;
    if (!ev.shiftKey) {
      event.stopEvent(ev);
      // Record the timestamp of this TAB down so onKeyUp can distinguish
      // focus from TAB in the CLI.
      this.lastTabDownAt = ev.timeStamp;
    }
    if (ev.metaKey || ev.altKey || ev.crtlKey) {
      if (this.document.commandDispatcher) {
        this.document.commandDispatcher.advanceFocus();
      }
      else {
        this.element.blur();
      }
    }
  }
};

/**
 * The main keyboard processing loop
 */
Inputter.prototype.onKeyUp = function(ev) {
  // RETURN does a special exec/highlight thing
  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    var worst = this.requisition.getStatus();
    // Deny RETURN unless the command might work
    if (worst === Status.VALID) {
      this._scrollingThroughHistory = false;
      this.history.add(this.element.value);
      this.requisition.exec();
    }
    // See bug 664135 - On pressing return with an invalid input, GCLI
    // should select the incorrect part of the input for an easy fix
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB && !ev.shiftKey) {
    // If the TAB keypress took the cursor from another field to this one,
    // then they get the keydown/keypress, and we get the keyup. In this
    // case we don't want to do any completion.
    // If the time of the keydown/keypress of TAB was close (i.e. within
    // 1 second) to the time of the keyup then we assume that we got them
    // both, and do the completion.
    if (this.lastTabDownAt + 1000 > ev.timeStamp) {
      this.getCurrentAssignment().complete();
      // It's possible for TAB to not change the input, in which case the
      // onInputChange event will not fire, and the caret move will not be
      // processed. So we check that this is done
      this._caretChange = Caret.TO_ARG_END;
      this._processCaretChange(this.getInputState(), true);
    }
    this.lastTabDownAt = 0;
    this._scrollingThroughHistory = false;
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this._setInputInternal(this.history.backward(), true);
    }
    else {
      this.getCurrentAssignment().increment();
    }
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this._setInputInternal(this.history.forward(), true);
    }
    else {
      this.getCurrentAssignment().decrement();
    }
    return;
  }

  this._scrollingThroughHistory = false;
  this._caretChange = Caret.NO_CHANGE;
  this.update();
};

/**
 * Accessor for the assignment at the cursor.
 * i.e Requisition.getAssignmentAt(cursorPos);
 */
Inputter.prototype.getCurrentAssignment = function() {
  var start = dom.getSelectionStart(this.element);
  return this.requisition.getAssignmentAt(start);
};

/**
 * Actually parse the input and make sure we're all up to date
 */
Inputter.prototype.update = function() {
  var input = this.getInputState();
  this.requisition.update(input);
  this.completer.update(input);
};

/**
 * Pull together an input object, which may include XUL hacks
 */
Inputter.prototype.getInputState = function() {
  var input = {
    typed: this.element.value,
    cursor: {
      start: dom.getSelectionStart(this.element),
      end: dom.getSelectionEnd(this.element)
    }
  };

  // Workaround for potential XUL bug 676520 where textbox gives incorrect
  // values for its content
  if (input.typed == null) {
    input.typed = '';
    console.log('fixing input.typed=""', input);
  }

  return input;
};

cliView.Inputter = Inputter;


/**
 * Completer is an 'input-like' element that sits  an input element annotating
 * it with visual goodness.
 * @param {object} options An object that contains various options which
 * customizes how the completer functions.
 * Properties on the options object:
 * - document (required) DOM document to be used in creating elements
 * - requisition (required) A GCLI Requisition object whose state is monitored
 * - completeElement (optional) An element to use
 * - completionPrompt (optional) The prompt to show before a completion.
 *   Defaults to '&#x00bb;' (double greater-than, a.k.a right guillemet).
 */
function Completer(options) {
  this.document = options.document;
  this.requisition = options.requisition;
  this.elementCreated = false;

  this.element = options.completeElement || 'gcliComplete';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.document.getElementById(name);

    if (!this.element) {
      this.elementCreated = true;
      this.element = dom.createElement(this.document, 'div');
      this.element.className = 'gcliCompletion gcliVALID';
      this.element.setAttribute('tabindex', '-1');
      this.element.setAttribute('aria-live', 'polite');
    }
  }

  this.completionPrompt = typeof options.completionPrompt === 'string'
    ? options.completionPrompt
    : '&#x00bb;';

  if (options.inputBackgroundElement) {
    this.backgroundElement = options.inputBackgroundElement;
  }
  else {
    this.backgroundElement = this.element;
  }
}

/**
 * Avoid memory leaks
 */
Completer.prototype.destroy = function() {
  delete this.document;
  delete this.element;
  delete this.backgroundElement;

  if (this.elementCreated) {
    event.removeListener(this.document.defaultView, 'resize', this.resizer);
  }

  delete this.inputter;
};

/**
 * A list of the styles that decorate() should copy to make the completion
 * element look like the input element. backgroundColor is a spiritual part of
 * this list, but see comment in decorate().
 */
Completer.copyStyles = [ 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle' ];

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Completer.prototype.decorate = function(inputter) {
  this.inputter = inputter;
  var input = inputter.element;

  // If we were told which element to use, then assume it is already
  // correctly positioned. Otherwise insert it alongside the input element
  if (this.elementCreated) {
    this.inputter.appendAfter(this.element);

    Completer.copyStyles.forEach(function(style) {
      this.element.style[style] = dom.computedStyle(input, style);
    }, this);

    // The completer text is by default invisible so we make it the same color
    // as the input background.
    this.element.style.color = input.style.backgroundColor;

    // If there is a separate backgroundElement, then we make the element
    // transparent, otherwise it inherits the color of the input node
    // It's not clear why backgroundColor doesn't work when used from
    // computedStyle, but it doesn't. Patches welcome!
    this.element.style.backgroundColor = (this.backgroundElement != this.element) ?
        'transparent' :
        input.style.backgroundColor;
    input.style.backgroundColor = 'transparent';

    // Make room for the prompt
    input.style.paddingLeft = '20px';

    this.resizer = this.resizer.bind(this);
    event.addListener(this.document.defaultView, 'resize', this.resizer);
    this.resizer();
  }
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Completer.prototype.resizer = function() {
  var rect = this.inputter.element.getBoundingClientRect();
  // -4 to line up with 1px of padding and border, top and bottom
  var height = rect.bottom - rect.top - 4;

  this.element.style.top = rect.top + 'px';
  this.element.style.height = height + 'px';
  this.element.style.lineHeight = height + 'px';
  this.element.style.left = rect.left + 'px';
  this.element.style.width = (rect.right - rect.left) + 'px';
};

/**
 * Is the completion given, a "strict" completion of the user inputted value?
 * A completion is considered "strict" only if it the user inputted value is an
 * exact prefix of the completion (ignoring leading whitespace)
 */
function isStrictCompletion(inputValue, completion) {
  // Strip any leading whitespace from the user inputted value because the
  // completion will never have leading whitespace.
  inputValue = inputValue.replace(/^\s*/, '');
  // Strict: "ec" -> "echo"
  // Non-Strict: "ls *" -> "ls foo bar baz"
  return completion.indexOf(inputValue) === 0;
}

/**
 * Bring the completion element up to date with what the requisition says
 */
Completer.prototype.update = function(input) {
  var current = this.requisition.getAssignmentAt(input.cursor.start);
  var predictions = current.getPredictions();

  var completion = '<span class="gcliPrompt">' + this.completionPrompt + '</span> ';
  if (input.typed.length > 0) {
    var scores = this.requisition.getInputStatusMarkup();
    completion += this.markupStatusScore(scores, input);
  }

  if (input.typed.length > 0 && predictions.length > 0) {
    var tab = predictions[0].name;
    var existing = current.getArg().text;
    if (isStrictCompletion(existing, tab) && input.cursor.start === input.typed.length) {
      // Display the suffix of the prediction as the completion.
      var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;
      var suffix = tab.slice(existing.length - numLeadingSpaces);
      completion += '<span class="gcliCompl">' + suffix + '</span>';
    } else {
      // Display the '-> prediction' at the end of the completer element
      completion += ' &#xa0;<span class="gcliCompl">&#x21E5; ' +
          tab + '</span>';
    }
  }

  // A hack to add a grey '}' to the end of the command line when we've opened
  // with a { but haven't closed it
  var command = this.requisition.commandAssignment.getValue();
  if (command && command.name === '{') {
    if (this.requisition.getAssignment(0).getArg().suffix.indexOf('}') === -1) {
      completion += '<span class="gcliCloseBrace">}</span>';
    }
  }

  dom.setInnerHtml(this.element, '<span>' + completion + '</span>');
};

/**
 * Mark-up an array of Status values with spans
 */
Completer.prototype.markupStatusScore = function(scores, input) {
  var completion = '';
  if (scores.length === 0) {
    return completion;
  }

  var i = 0;
  var lastStatus = -1;
  while (true) {
    if (lastStatus !== scores[i]) {
      var state = scores[i];
      if (!state) {
        console.error('No state at i=' + i + '. scores.len=' + scores.length);
        state = Status.VALID;
      }
      completion += '<span class="gcli' + state.toString() + '">';
      lastStatus = scores[i];
    }
    var char = input.typed[i];
    if (char === ' ') {
      char = '&#xa0;';
    }
    completion += char;
    i++;
    if (i === input.typed.length) {
      completion += '</span>';
      break;
    }
    if (lastStatus !== scores[i]) {
      completion += '</span>';
    }
  }

  return completion;
};

cliView.Completer = Completer;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/history', ['require', 'exports', 'module' ], function(require, exports, module) {

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
//  delete this._buffer;
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

});define("text!gcli/ui/inputter.css", [], "" +
  ".gcliCompletion {" +
  "  position: absolute;" +
  "  z-index: -1000;" +
  "  background-color: #DDD;" +
  "  border: 1px transparent solid;" +
  "  padding: 1px 1px 1px 2px;" +
  "}" +
  "" +
  ".gcliCompletion {" +
  "  color: #DDD;" +
  "}" +
  "" +
  ".gcliINCOMPLETE {" +
  "  border-bottom: 2px dotted #999;" +
  "}" +
  "" +
  ".gcliERROR {" +
  "  border-bottom: 2px dotted #F00;" +
  "}" +
  "" +
  ".gcliPrompt {" +
  "  color: #66F;" +
  "  font-weight: bold;" +
  "}" +
  "" +
  ".gcliCompl {" +
  "  color: #999;" +
  "}" +
  "" +
  ".gcliCloseBrace {" +
  "  color: #999;" +
  "}" +
  "");

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/hinter', ['require', 'exports', 'module' , 'gcli/util', 'gcli/ui/arg_fetch', 'gcli/ui/menu', 'text!gcli/ui/hinter.css'], function(require, exports, module) {


var dom = require('gcli/util').dom;

var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var CommandMenu = require('gcli/ui/menu').CommandMenu;

var hinterCss = require('text!gcli/ui/hinter.css');

/**
 * A container to show either an ArgFetcher or a Menu depending on the state
 * of the requisition.
 */
function Hinter(options) {
  options = options || {};

  this.document = options.document;
  this.requisition = options.requisition;

  if (hinterCss != null) {
    this.style = dom.importCss(hinterCss, this.document);
  }

  this.menu = options.menu || new CommandMenu(this.document, this.requisition);
  this.argFetcher = options.argFetcher || new ArgFetcher(this.document, this.requisition);

  /*
  <div class="gcliHintParent" _save="element">
    <div class="gcliHints" _save="hinter">
      ${menu.element}
      ${argFetcher.element}
    </div>
  </div>
   */
  this.element = dom.createElement(this.document, 'div');
  this.element.className = 'gcliHintParent';

  this.hinter = dom.createElement(this.document, 'div');
  this.hinter.className = 'gcliHints';
  this.element.appendChild(this.hinter);

  this.hinter.appendChild(this.menu.element);
  this.hinter.appendChild(this.argFetcher.element);

  this.menu.onCommandChange();
}

/**
 * Avoid memory leaks
 */
Hinter.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.document;
  delete this.element;
  delete this.hinter;
};

/**
 * Popup likes to be able to control the height of its children
 */
Hinter.prototype.setHeight = function(height) {
  this.element.style.maxHeight = height + 'px';
};

exports.Hinter = Hinter;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/arg_fetch', ['require', 'exports', 'module' , 'gcli/util', 'gcli/types', 'gcli/ui/field', 'gcli/ui/domtemplate', 'text!gcli/ui/arg_fetch.css', 'text!gcli/ui/arg_fetch.html'], function(require, exports, module) {
var argFetch = exports;


var dom = require('gcli/util').dom;
var Status = require('gcli/types').Status;

var getField = require('gcli/ui/field').getField;
var Templater = require('gcli/ui/domtemplate').Templater;

var editorCss = require('text!gcli/ui/arg_fetch.css');
var argFetchHtml = require('text!gcli/ui/arg_fetch.html');


/**
 * A widget to display an inline dialog which allows the user to fill out
 * the arguments to a command.
 * @param document The document to use in creating widgets
 * @param requisition The Requisition to fill out
 */
function ArgFetcher(document, requisition) {
  this.document = document;
  this.requisition = requisition;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  dom.createElement(this.document, 'div');
  this.element.className = 'gcliCliEle';
  // We cache the fields we create so we can destroy them later
  this.fields = [];

  this.tmpl = new Templater();
  // Populated by template
  this.okElement = null;

  // Pull the HTML into the DOM, but don't add it to the document
  if (editorCss != null) {
    this.style = dom.importCss(editorCss, this.document);
  }

  var templates = dom.createElement(this.document, 'div');
  dom.setInnerHtml(templates, argFetchHtml);
  this.reqTempl = templates.querySelector('#gcliReqTempl');

  this.requisition.commandChange.add(this.onCommandChange, this);
  this.requisition.inputChange.add(this.onInputChange, this);
}

/**
 * Avoid memory leaks
 */
ArgFetcher.prototype.destroy = function() {
  this.requisition.inputChange.remove(this.onInputChange, this);
  this.requisition.commandChange.remove(this.onCommandChange, this);

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.fields.forEach(function(field) { field.destroy(); });

  delete this.document;
  delete this.element;
  delete this.okElement;
  delete this.reqTempl;
};

/**
 * Called whenever the command part of the requisition changes
 */
ArgFetcher.prototype.onCommandChange = function(ev) {
  var command = this.requisition.commandAssignment.getValue();
  if (!command || !command.exec) {
    this.element.style.display = 'none';
  }
  else {
    if (ev && ev.oldValue === ev.newValue) {
      // Just the text has changed
      return;
    }

    this.fields.forEach(function(field) { field.destroy(); });
    this.fields = [];

    var reqEle = this.reqTempl.cloneNode(true);
    this.tmpl.processNode(reqEle, this);
    dom.clearElement(this.element);
    this.element.appendChild(reqEle);

    var status = this.requisition.getStatus();
    this.okElement.disabled = (status === Status.VALID);

    this.element.style.display = 'block';
  }
};

/**
 * Called whenever the text input of the requisition changes
 */
ArgFetcher.prototype.onInputChange = function(ev) {
  var command = this.requisition.commandAssignment.getValue();
  if (command && command.exec) {
    var status = this.requisition.getStatus();
    this.okElement.disabled = (status !== Status.VALID);
  }
};

/**
 * Called by the template process in #onCommandChange() to get an instance
 * of field for each assignment.
 */
ArgFetcher.prototype.getInputFor = function(assignment) {
  var newField = getField(assignment.param.type, {
    document: this.document,
    type: assignment.param.type,
    name: assignment.param.name,
    requisition: this.requisition,
    required: assignment.param.isDataRequired(),
    named: !assignment.param.isPositionalAllowed()
  });

  // BUG 664198 - remove on delete
  newField.fieldChanged.add(function(ev) {
    assignment.setConversion(ev.conversion);
  }, this);
  assignment.assignmentChange.add(function(ev) {
    newField.setConversion(ev.conversion);
  }.bind(this));

  this.fields.push(newField);
  newField.setConversion(this.assignment.conversion);

  // Bug 681894: we add the field as a property of the assignment so that
  // #linkMessageElement() can call 'field.setMessageElement(element)'
  assignment.field = newField;

  return newField.element;
};

/**
 * Called by the template to setup an mutable message field
 */
ArgFetcher.prototype.linkMessageElement = function(assignment, element) {
  // Bug 681894: See comment in getInputFor()
  var field = assignment.field;
  delete assignment.field;
  if (field == null) {
    console.error('Missing field for ' + assignment.param.name);
    return 'Missing field';
  }
  field.setMessageElement(element);
  return '';
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onFormOk = function(ev) {
  this.requisition.exec();
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onFormCancel = function(ev) {
  this.requisition.clear();
};

argFetch.ArgFetcher = ArgFetcher;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/field', ['require', 'exports', 'module' , 'gcli/util', 'gcli/l10n', 'gcli/argument', 'gcli/types', 'gcli/types/basic', 'gcli/types/javascript', 'gcli/ui/menu'], function(require, exports, module) {


var dom = require('gcli/util').dom;
var createEvent = require('gcli/util').createEvent;
var l10n = require('gcli/l10n');

var Argument = require('gcli/argument').Argument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var FalseNamedArgument = require('gcli/argument').FalseNamedArgument;
var ArrayArgument = require('gcli/argument').ArrayArgument;

var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ArrayConversion = require('gcli/types').ArrayConversion;

var StringType = require('gcli/types/basic').StringType;
var NumberType = require('gcli/types/basic').NumberType;
var BooleanType = require('gcli/types/basic').BooleanType;
var BlankType = require('gcli/types/basic').BlankType;
var SelectionType = require('gcli/types/basic').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;
var ArrayType = require('gcli/types/basic').ArrayType;
var JavascriptType = require('gcli/types/javascript').JavascriptType;

var Menu = require('gcli/ui/menu').Menu;


/**
 * A Field is a way to get input for a single parameter.
 * This class is designed to be inherited from. It's important that all
 * subclasses have a similar constructor signature because they are created
 * via getField(...)
 * @param document The document we use in calling createElement
 * @param type The type to use in conversions
 * @param named Is this parameter named? That is to say, are positional
 * arguments disallowed, if true, then we need to provide updates to the
 * command line that explicitly name the parameter in use (e.g. --verbose, or
 * --name Fred rather than just true or Fred)
 * @param name If this parameter is named, what name should we use
 * @param requ The requisition that we're attached to
 */
function Field(document, type, named, name, requ) {
}

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
  delete this.messageElement;
};

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
    if (message == null) {
      message = '';
    }
    dom.setInnerHtml(this.messageElement, message);
  }
};

/**
 * Method to be called by subclasses when their input changes, which allows us
 * to properly pass on the fieldChanged event.
 */
Field.prototype.onInputChange = function() {
  var conversion = this.getConversion();
  this.fieldChanged({ conversion: conversion });
  this.setMessage(conversion.message);
};

/**
 * 'static/abstract' method to allow implementations of Field to lay a claim
 * to a type. This allows claims of various strength to be weighted up.
 * See the Field.*MATCH values.
 */
Field.claim = function() {
  throw new Error('Field should not be used directly');
};
Field.MATCH = 5;
Field.DEFAULT_MATCH = 4;
Field.IF_NOTHING_BETTER = 1;
Field.NO_MATCH = 0;


/**
 * Managing the current list of Fields
 */
var fieldCtors = [];
function addField(fieldCtor) {
  if (typeof fieldCtor !== 'function') {
    console.error('addField erroring on ', fieldCtor);
    throw new Error('addField requires a Field constructor');
  }
  fieldCtors.push(fieldCtor);
}

function removeField(field) {
  if (typeof field !== 'string') {
    fields = fields.filter(function(test) {
      return test !== field;
    });
    delete fields[field];
  }
  else if (field instanceof Field) {
    removeField(field.name);
  }
  else {
    console.error('removeField erroring on ', field);
    throw new Error('removeField requires an instance of Field');
  }
}

function getField(type, options) {
  var ctor;
  var highestClaim = -1;
  fieldCtors.forEach(function(fieldCtor) {
    var claim = fieldCtor.claim(type);
    if (claim > highestClaim) {
      highestClaim = claim;
      ctor = fieldCtor;
    }
  });

  if (!ctor) {
    console.error('Unknown field type ', type, ' in ', fieldCtors);
    throw new Error('Can\'t find field for ' + type);
  }

  return new ctor(type, options);
}

exports.Field = Field;
exports.addField = addField;
exports.removeField = removeField;
exports.getField = getField;


/**
 * A field that allows editing of strings
 */
function StringField(type, options) {
  this.document = options.document;
  this.type = type;
  this.arg = new Argument();

  this.element = dom.createElement(this.document, 'input');
  this.element.type = 'text';
  this.element.style.width = '100%';

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.fieldChanged = createEvent('StringField.fieldChanged');
}

StringField.prototype = Object.create(Field.prototype);

StringField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

StringField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

StringField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget(this.element.value, { prefixSpace: true });
  return this.type.parse(this.arg);
};

StringField.claim = function(type) {
  return type instanceof StringType ? Field.MATCH : Field.IF_NOTHING_BETTER;
};

exports.StringField = StringField;
addField(StringField);


/**
 * A field that allows editing of numbers using an [input type=number] field
 */
function NumberField(type, options) {
  this.document = options.document;
  this.type = type;
  this.arg = new Argument();

  this.element = dom.createElement(this.document, 'input');
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

  this.fieldChanged = createEvent('NumberField.fieldChanged');
}

NumberField.prototype = Object.create(Field.prototype);

NumberField.claim = function(type) {
  return type instanceof NumberType ? Field.MATCH : Field.NO_MATCH;
};

NumberField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('keyup', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

NumberField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

NumberField.prototype.getConversion = function() {
  this.arg = this.arg.beget(this.element.value, { prefixSpace: true });
  return this.type.parse(this.arg);
};

exports.NumberField = NumberField;
addField(NumberField);


/**
 * A field that uses a checkbox to toggle a boolean field
 */
function BooleanField(type, options) {
  this.document = options.document;
  this.type = type;
  this.name = options.name;
  this.named = options.named;

  this.element = dom.createElement(this.document, 'input');
  this.element.type = 'checkbox';
  this.element.id = 'gcliForm' + this.name;

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.fieldChanged = createEvent('BooleanField.fieldChanged');
}

BooleanField.prototype = Object.create(Field.prototype);

BooleanField.claim = function(type) {
  return type instanceof BooleanType ? Field.MATCH : Field.NO_MATCH;
};

BooleanField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

BooleanField.prototype.setConversion = function(conversion) {
  this.element.checked = conversion.value;
  this.setMessage(conversion.message);
};

BooleanField.prototype.getConversion = function() {
  var value = this.element.checked;
  var arg = this.named ?
    value ? new TrueNamedArgument(this.name) : new FalseNamedArgument() :
    new Argument(' ' + value);
  return new Conversion(value, arg);
};

exports.BooleanField = BooleanField;
addField(BooleanField);


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
  this.document = options.document;
  this.type = type;
  this.items = [];

  this.element = dom.createElement(this.document, 'select');
  this.element.style.width = '180px';
  this._addOption({
    name: l10n.lookupFormat('fieldSelectionSelect', [ options.name ])
  });
  var lookup = this.type.getLookup();
  lookup.forEach(this._addOption, this);

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('change', this.onInputChange, false);

  this.fieldChanged = createEvent('SelectionField.fieldChanged');
}

SelectionField.prototype = Object.create(Field.prototype);

SelectionField.claim = function(type) {
  return type instanceof SelectionType ? Field.DEFAULT_MATCH : Field.NO_MATCH;
};

SelectionField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.element.removeEventListener('change', this.onInputChange, false);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
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
  var arg = new Argument(item.name, ' ');
  var value = item.value ? item.value : item;
  return new Conversion(value, arg);
};

SelectionField.prototype._addOption = function(item) {
  item.index = this.items.length;
  this.items.push(item);

  var option = dom.createElement(this.document, 'option');
  option.innerHTML = item.name;
  option.value = item.index;
  this.element.appendChild(option);
};

exports.SelectionField = SelectionField;
addField(SelectionField);


/**
 * A field that allows editing of javascript
 */
function JavascriptField(type, options) {
  this.document = options.document;
  this.type = type;
  this.requ = options.requisition;

  this.onInputChange = this.onInputChange.bind(this);
  this.arg = new Argument('', '{ ', ' }');

  this.element = dom.createElement(this.document, 'div');

  this.input = dom.createElement(this.document, 'input');
  this.input.type = 'text';
  this.input.addEventListener('keyup', this.onInputChange, false);
  this.input.style.marginBottom = '0px';
  this.input.style.width = options.name.length === 0 ? '240px' : '160px';
  this.element.appendChild(this.input);

  this.menu = new Menu(this.document, { field: true });
  this.element.appendChild(this.menu.element);

  this.setConversion(this.type.parse(new Argument('')));

  this.fieldChanged = createEvent('JavascriptField.fieldChanged');

  // i.e. Register this.onItemClick as the default action for a menu click
  this.menu.onItemClick = this.onItemClick.bind(this);
}

JavascriptField.prototype = Object.create(Field.prototype);

JavascriptField.claim = function(type) {
  return type instanceof JavascriptType ? Field.MATCH : Field.NO_MATCH;
};

JavascriptField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.input.removeEventListener('keyup', this.onInputChange, false);
  this.menu.destroy();
  delete this.element;
  delete this.input;
  delete this.menu;
  delete this.document;
  delete this.onInputChange;
};

JavascriptField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.input.value = conversion.arg.text;

  var prefixLen = 0;
  if (this.type instanceof JavascriptType) {
    var typed = conversion.arg.text;
    var lastDot = typed.lastIndexOf('.');
    if (lastDot !== -1) {
      prefixLen = lastDot;
    }
  }

  var items = [];
  var predictions = conversion.getPredictions();
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
  if (conversion.getStatus() === Status.ERROR) {
    this.setMessage(conversion.message);
  }
};

JavascriptField.prototype.onItemClick = function(ev) {
  this.item = ev.currentTarget.item;
  this.arg = this.arg.beget(this.item.complete, { normalize: true });
  var conversion = this.type.parse(this.arg);
  this.fieldChanged({ conversion: conversion });
  this.setMessage(conversion.message);
};

JavascriptField.prototype.onInputChange = function(ev) {
  this.item = ev.currentTarget.item;
  var conversion = this.getConversion();
  this.fieldChanged({ conversion: conversion });
  this.setMessage(conversion.message);
};

JavascriptField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget(this.input.value, { normalize: true });
  return this.type.parse(this.arg);
};

JavascriptField.DEFAULT_VALUE = '__JavascriptField.DEFAULT_VALUE';

exports.JavascriptField = JavascriptField;
addField(JavascriptField);


/**
 * A field that works with deferred types by delaying resolution until that
 * last possible time
 */
function DeferredField(type, options) {
  this.document = options.document;
  this.type = type;
  this.options = options;
  this.requisition = options.requisition;
  this.requisition.assignmentChange.add(this.update, this);

  this.element = dom.createElement(this.document, 'div');
  this.update();

  this.fieldChanged = createEvent('DeferredField.fieldChanged');
}

DeferredField.prototype = Object.create(Field.prototype);

DeferredField.prototype.update = function() {
  var subtype = this.type.defer();
  if (subtype === this.subtype) {
    return;
  }

  if (this.field) {
    this.field.destroy();
  }

  this.subtype = subtype;
  this.field = getField(subtype, this.options);
  this.field.fieldChanged.add(this.fieldChanged, this);

  dom.clearElement(this.element);
  this.element.appendChild(this.field.element);
};

DeferredField.claim = function(type) {
  return type instanceof DeferredType ? Field.MATCH : Field.NO_MATCH;
};

DeferredField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.requisition.assignmentChange.remove(this.update, this);
  delete this.element;
  delete this.document;
  delete this.onInputChange;
};

DeferredField.prototype.setConversion = function(conversion) {
  this.field.setConversion(conversion);
};

DeferredField.prototype.getConversion = function() {
  return this.field.getConversion();
};

exports.DeferredField = DeferredField;
addField(DeferredField);


/**
 * For use with deferred types that do not yet have anything to resolve to.
 * BlankFields are not for general use.
 */
function BlankField(type, options) {
  this.document = options.document;
  this.type = type;
  this.element = dom.createElement(this.document, 'div');

  this.fieldChanged = createEvent('BlankField.fieldChanged');
}

BlankField.prototype = Object.create(Field.prototype);

BlankField.claim = function(type) {
  return type instanceof BlankType ? Field.MATCH : Field.NO_MATCH;
};

BlankField.prototype.setConversion = function() { };

BlankField.prototype.getConversion = function() {
  return new Conversion(null);
};

exports.BlankField = BlankField;
addField(BlankField);


/**
 * Adds add/delete buttons to a normal field allowing there to be many values
 * given for a parameter.
 */
function ArrayField(type, options) {
  this.document = options.document;
  this.type = type;
  this.options = options;
  this.requ = options.requisition;

  this._onAdd = this._onAdd.bind(this);
  this.members = [];

  // <div class=gcliArrayParent save="${element}">
  this.element = dom.createElement(this.document, 'div');
  this.element.className = 'gcliArrayParent';

  // <button class=gcliArrayMbrAdd onclick="${_onAdd}" save="${addButton}">Add
  this.addButton = dom.createElement(this.document, 'button');
  this.addButton.className = 'gcliArrayMbrAdd';
  this.addButton.addEventListener('click', this._onAdd, false);
  this.addButton.innerHTML = l10n.lookup('fieldArrayAdd');
  this.element.appendChild(this.addButton);

  // <div class=gcliArrayMbrs save="${mbrElement}">
  this.container = dom.createElement(this.document, 'div');
  this.container.className = 'gcliArrayMbrs';
  this.element.appendChild(this.container);

  this.onInputChange = this.onInputChange.bind(this);

  this.fieldChanged = createEvent('ArrayField.fieldChanged');
}

ArrayField.prototype = Object.create(Field.prototype);

ArrayField.claim = function(type) {
  return type instanceof ArrayType ? Field.MATCH : Field.NO_MATCH;
};

ArrayField.prototype.destroy = function() {
  Field.prototype.destroy.call(this);
  this.addButton.removeEventListener('click', this._onAdd, false);
};

ArrayField.prototype.setConversion = function(conversion) {
  // BUG 653568: this is too brutal - it removes focus from any the current field
  dom.clearElement(this.container);
  this.members = [];

  conversion.conversions.forEach(function(subConversion) {
    this._onAdd(null, subConversion);
  }, this);
};

ArrayField.prototype.getConversion = function() {
  var conversions = [];
  var arrayArg = new ArrayArgument();
  for (var i = 0; i < this.members.length; i++) {
    var conversion = this.members[i].field.getConversion();
    conversions.push(conversion);
    arrayArg.addArgument(conversion.arg);
  }
  return new ArrayConversion(conversions, arrayArg);
};

ArrayField.prototype._onAdd = function(ev, subConversion) {
  // <div class=gcliArrayMbr save="${element}">
  var element = dom.createElement(this.document, 'div');
  element.className = 'gcliArrayMbr';
  this.container.appendChild(element);

  // ${field.element}
  var field = getField(this.type.subtype, this.options);
  field.fieldChanged.add(function() {
    var conversion = this.getConversion();
    this.fieldChanged({ conversion: conversion });
    this.setMessage(conversion.message);
  }, this);

  if (subConversion) {
    field.setConversion(subConversion);
  }
  element.appendChild(field.element);

  // <div class=gcliArrayMbrDel onclick="${_onDel}">
  var delButton = dom.createElement(this.document, 'button');
  delButton.className = 'gcliArrayMbrDel';
  delButton.addEventListener('click', this._onDel, false);
  delButton.innerHTML = l10n.lookup('fieldArrayDel');
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

exports.ArrayField = ArrayField;
addField(ArrayField);


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/menu', ['require', 'exports', 'module' , 'gcli/util', 'gcli/types', 'gcli/argument', 'gcli/canon', 'gcli/ui/domtemplate', 'text!gcli/ui/menu.css', 'text!gcli/ui/menu.html'], function(require, exports, module) {


var dom = require('gcli/util').dom;

var Conversion = require('gcli/types').Conversion;
var Argument = require('gcli/argument').Argument;
var canon = require('gcli/canon');

var Templater = require('gcli/ui/domtemplate').Templater;

var menuCss = require('text!gcli/ui/menu.css');
var menuHtml = require('text!gcli/ui/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 * @param document The document from which we create elements.
 * @param options A way to customize the menu display. Valid options are:
 * - field:true Turns the menu display into a drop-down for use inside a
 * JavascriptField.
 */
function Menu(document, options) {
  this.element =  dom.createElement(document, 'div');
  this.element.className = 'gcliMenu';
  if (options && options.field) {
    this.element.className += ' gcliMenuField';
  }

  // Pull the HTML into the DOM, but don't add it to the document
  if (menuCss != null) {
    this.style = dom.importCss(menuCss, document);
  }

  var templates = dom.createElement(document, 'div');
  dom.setInnerHtml(templates, menuHtml);
  this.optTempl = templates.querySelector('#gcliOptTempl');

  // Contains the items that should be displayed
  this.items = null;
}

/**
 * Avoid memory leaks
 */
Menu.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.element;
  delete this.items;
  delete this.optTempl;
};

/**
 * The default is to do nothing when someone clicks on the menu.
 * Plug an implementation in here before calling show() to do something useful.
 * This is called from template.html
 * @param ev The click event from the browser
 */
Menu.prototype.onItemClick = function(ev) {
};

/**
 * Display a number of items in the menu (or hide the menu if there is nothing
 * to display)
 * @param items The items to show in the menu
 * @param error An error message to display
 */
Menu.prototype.show = function(items, error) {
  this.error = error;
  this.items = items;

  if (this.error == null && this.items.length === 0) {
    this.element.style.display = 'none';
    return;
  }

  var options = this.optTempl.cloneNode(true);
  new Templater().processNode(options, this);

  dom.clearElement(this.element);
  this.element.appendChild(options);

  this.element.style.display = 'block';
};

/**
 * Hide the menu
 */
Menu.prototype.hide = function() {
  this.element.style.display = 'none';
};

exports.Menu = Menu;


/**
 * CommandMenu is a special menu that integrates with a Requisition to display
 * available commands.
 */
function CommandMenu(document, requisition) {
  Menu.call(this, document);
  this.requisition = requisition;

  this.requisition.commandChange.add(this.onCommandChange, this);
  canon.canonChange.add(this.onCommandChange, this);
}

CommandMenu.prototype = Object.create(Menu.prototype);

/**
 * Avoid memory leaks
 */
CommandMenu.prototype.destroy = function() {
  this.requisition.commandChange.remove(this.onCommandChange, this);
  canon.canonChange.remove(this.onCommandChange, this);

  Menu.prototype.destroy.call(this);
};

/**
 * We want to fill-in the clicked command in the cli input when the user clicks
 */
CommandMenu.prototype.onItemClick = function(ev) {
  var type = this.requisition.commandAssignment.param.type;

  var text = type.stringify(ev.currentTarget.item);
  var arg = new Argument(text);
  arg.suffix = ' ';

  var conversion = type.parse(arg);
  this.requisition.commandAssignment.setConversion(conversion);
};

/**
 * Update the various hint components to reflect the changed command
 */
CommandMenu.prototype.onCommandChange = function(ev) {
  var command = this.requisition.commandAssignment.getValue();
  if (!command || !command.exec) {
    var error;
    var predictions = this.requisition.commandAssignment.getPredictions();

    if (predictions.length === 0) {
      error = this.requisition.commandAssignment.getMessage();
      var commandType = this.requisition.commandAssignment.param.type;
      var conversion = commandType.parse(new Argument());
      predictions = conversion.getPredictions();
    }

    predictions.sort(function(command1, command2) {
      return command1.name.localeCompare(command2.name);
    });
    var items = [];
    predictions.forEach(function(item) {
      if (item.description && !item.hidden) {
        items.push(item);
      }
    }, this);

    this.show(items, error);
  }
  else {
    if (ev && ev.oldValue === ev.newValue) {
      return; // Just the text has changed
    }

    this.hide();
  }
};

exports.CommandMenu = CommandMenu;


});
define("text!gcli/ui/menu.css", [], "" +
  ".gcliOption {" +
  "  overflow: hidden;" +
  "  white-space: nowrap;" +
  "  cursor: pointer;" +
  "  padding: 2px;" +
  "}" +
  "" +
  ".gcliOption:hover {" +
  "  background-color: rgb(230, 230, 230);" +
  "}" +
  "" +
  ".gcliOptionName {" +
  "  padding-right: 5px;" +
  "}" +
  "" +
  ".gcliOptionDesc {" +
  "  font-size: 80%;" +
  "  color: #999;" +
  "}" +
  "" +
  ".gcliMenuError {" +
  "  overflow: hidden;" +
  "  white-space: nowrap;" +
  "  padding: 8px 2px 2px 2px;" +
  "  font-size: 80%;" +
  "  color: red;" +
  "}" +
  "" +
  ".gcliMenuField {" +
  "  background-color: white;" +
  "  color: black;" +
  "  border: 1px solid #aaa;" +
  "  padding: 2px;" +
  "  max-height: 300px;" +
  "  overflow-y: auto;" +
  "  max-width: 220px;" +
  "  overflow-x: hidden;" +
  "  margin: 0px 10px;" +
  "  border-top: 0px !important;" +
  "  border-bottom-right-radius: 5px;" +
  "  border-bottom-left-radius: 5px;" +
  "  font: -webkit-small-control;" +
  "}" +
  "");

define("text!gcli/ui/menu.html", [], "" +
  "<!--" +
  "Template for the beginnings of a command menu." +
  "This will work with things other than a command - many things are a set of" +
  "things with a name and description." +
  "In the command context it is evaluated once for every keypress in the cli" +
  "when a command has not been entered." +
  "-->" +
  "<div id=\"gcliOptTempl\" aria-live=\"polite\">" +
  "  <div class=\"gcliOption\" foreach=\"item in ${items}\" onclick=\"${onItemClick}\"" +
  "      title=\"${item.manual || ''}\">" +
  "    ${__element.item = item; ''}" +
  "    <span class=\"gcliOptionName\">${item.name}</span>" +
  "    <span class=\"gcliOptionDesc\">${item.description}</span>" +
  "  </div>" +
  "  <div class=\"gcliMenuError\" if=\"${error}\">${error}</div>" +
  "</div>" +
  "");

define("text!gcli/ui/arg_fetch.css", [], "" +
  ".gcliCmdDesc {" +
  "  font-weight: bold;" +
  "  text-align: center;" +
  "  margin-bottom: 5px;" +
  "  border-bottom: 1px solid #ddd;" +
  "  padding-bottom: 3px;" +
  "}" +
  "" +
  ".gcliParamGroup {" +
  "  font-weight: bold;" +
  "}" +
  "" +
  ".gcliParamName {" +
  "  text-align: right;" +
  "  font-size: 90%;" +
  "}" +
  "" +
  ".gcliParamError {" +
  "  font-size: 80%;" +
  "  color: #900;" +
  "}" +
  "" +
  ".gcliParamSubmit {" +
  "  text-align: right;" +
  "}" +
  "" +
  ".gcliGroupSymbol {" +
  "  font-size: 90%;" +
  "  color: #666;" +
  "}" +
  "" +
  ".gcliRequired {" +
  "  font-size: 80%;" +
  "  color: #666;" +
  "}" +
  "" +
  ".gcliParams {" +
  "  width: 100%;" +
  "}" +
  "");

define("text!gcli/ui/arg_fetch.html", [], "" +
  "<!--" +
  "Template for an Assignment." +
  "Evaluated each time the commandAssignment changes" +
  "-->" +
  "<div id=\"gcliReqTempl\" aria-live=\"polite\">" +
  "  <div>" +
  "    <div class=\"gcliCmdDesc\">" +
  "      ${requisition.commandAssignment.getValue().description}" +
  "    </div>" +
  "    <table class=\"gcliParams\">" +
  "      <tbody class=\"gcliAssignment\"" +
  "          foreach=\"assignment in ${requisition.getAssignments()}\">" +
  "        <!-- Parameter -->" +
  "        <tr class=\"gcliGroupRow\">" +
  "          <td class=\"gcliParamName\">" +
  "            <label for=\"gcliForm${assignment.param.name}\">" +
  "              ${assignment.param.description ? assignment.param.description + ':' : ''}" +
  "            </label>" +
  "          </td>" +
  "          <td class=\"gcliParamInput\">${getInputFor(assignment)}</td>" +
  "          <td>" +
  "            <span class=\"gcliRequired\" if=\"${assignment.param.isDataRequired()}\"> *</span>" +
  "          </td>" +
  "        </tr>" +
  "        <tr class=\"gcliGroupRow\">" +
  "          <td class=\"gcliParamError\" colspan=\"2\">" +
  "            ${linkMessageElement(assignment, __element)}" +
  "          </td>" +
  "        </tr>" +
  "      </tbody>" +
  "      <tfoot>" +
  "        <tr>" +
  "          <td colspan=\"3\" class=\"gcliParamSubmit\">" +
  "            <input type=\"submit\" value=\"Cancel\" onclick=\"${onFormCancel}\"/>" +
  "            <input type=\"submit\" value=\"OK\" onclick=\"${onFormOk}\" save=\"${okElement}\"/>" +
  "          </td>" +
  "        </tr>" +
  "      </tfoot>" +
  "    </table>" +
  "  </div>" +
  "</div>" +
  "");

define("text!gcli/ui/hinter.css", [], "" +
  ".gcliHintParent {" +
  "  color: #000;" +
  "  background: rgba(250, 250, 250, 0.8);" +
  "  border: 1px solid #AAA;" +
  "  border-top-right-radius: 5px;" +
  "  border-top-left-radius: 5px;" +
  "  margin-left: 10px;" +
  "  margin-right: 10px;" +
  "  display: inline-block;" +
  "  overflow: hidden;" +
  "}" +
  "" +
  ".gcliHints {" +
  "  overflow: auto;" +
  "  padding: 10px;" +
  "  display: inline-block;" +
  "}" +
  "" +
  ".gcliHints ul {" +
  "  margin: 0;" +
  "  padding: 0 15px;" +
  "}" +
  "");

/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gcli/ui/focus', ['require', 'exports', 'module' , 'gcli/util'], function(require, exports, module) {


var util = require('gcli/util');

/**
 * FocusManager solves the problem of tracking focus among a set of nodes.
 * The specific problem we are solving is when the hint element must be visible
 * if either the command line or any of the inputs in the hint element has the
 * focus, and invisible at other times, without hiding and showing the hint
 * element even briefly as the focus changes between them.
 * It does this simply by postponing the hide events by 250ms to see if
 * something else takes focus.
 * @param options An optional object containing configuration values. Valid
 * properties on the options object are:
 * - document
 * - blurDelay
 * - debug
 * - initialFocus
 */
function FocusManager(options) {
  options = options || {};

  this._debug = options.debug || false;
  this._blurDelayTimeout = null; // Result of setTimeout in delaying a blur
  this._monitoredElements = [];  // See addMonitoredElement()

  this.hasFocus = false;
  this.blurDelay = options.blurDelay || 250;
  this.document = options.document || document;

  this.onFocus = util.createEvent('FocusManager.onFocus');
  this.onBlur = util.createEvent('FocusManager.onBlur');

  // We take a focus event anywhere to be an indication that we might be about
  // to lose focus
  this._onDocumentFocus = function() {
    this.reportBlur('document');
  }.bind(this);
  this.document.addEventListener('focus', this._onDocumentFocus, true);
}

/**
 * Avoid memory leaks
 */
FocusManager.prototype.destroy = function() {
  this.document.removeEventListener('focus', this._onDocumentFocus, true);
  delete this.document;

  for (var i = 0; i < this._monitoredElements.length; i++) {
    var monitor = this._monitoredElements[i];
    console.error('Hanging monitored element: ', monitor.element);

    monitor.element.removeEventListener('focus', monitor.onFocus, true);
    monitor.element.removeEventListener('blur', monitor.onBlur, true);
  }

  if (this._blurDelayTimeout) {
    clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }
};

/**
 * The easy way to include an element in the set of things that are part of the
 * aggregate focus. Using [add|remove]MonitoredElement() is a simpler way of
 * option than calling report[Focus|Blur]()
 * @param element The element on which to track focus|blur events
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.addMonitoredElement = function(element, where) {
  if (this._debug) {
    console.log('FocusManager.addMonitoredElement(' + (where || 'unknown') + ')');
  }

  var monitor = {
    element: element,
    where: where,
    onFocus: function() { this.reportFocus(where); }.bind(this),
    onBlur: function() { this.reportBlur(where); }.bind(this)
  };

  element.addEventListener('focus', monitor.onFocus, true);
  element.addEventListener('blur', monitor.onBlur, true);
  this._monitoredElements.push(monitor);
};

/**
 * Undo the effects of addMonitoredElement()
 * @param element The element to stop tracking
 */
FocusManager.prototype.removeMonitoredElement = function(element) {
  var monitor;
  var matchIndex;

  for (var i = 0; i < this._monitoredElements.length; i++) {
    if (this._monitoredElements[i].element === element) {
      monitor = this._monitoredElements[i];
      matchIndex = i;
    }
  }

  if (!monitor) {
    if (this._debug) {
      console.error('Missing monitor for element. ', element);
    }
    return;
  }

  this._monitoredElements.splice(matchIndex, 1);
  element.removeEventListener('focus', monitor.onFocus, true);
  element.removeEventListener('blur', monitor.onBlur, true);
};

/**
 * Some component has received a 'focus' event. This sets the internal status
 * straight away and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.reportFocus = function(where) {
  if (this._debug) {
    console.log('FocusManager.reportFocus(' + (where || 'unknown') + ')');
  }

  if (this._blurDelayTimeout) {
    if (this._debug) {
      console.log('FocusManager.cancelBlur');
    }
    clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }

  if (!this.hasFocus) {
    this.hasFocus = true;
    this.onFocus();
  }
};

/**
 * Some component has received a 'blur' event. This waits for a while to see if
 * we are going to get any subsequent 'focus' events and then sets the internal
 * status and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.reportBlur = function(where) {
  if (this._debug) {
    console.log('FocusManager.reportBlur(' + where + ')');
  }

  if (this.hasFocus) {
    if (this._blurDelayTimeout) {
      if (this._debug) {
        console.log('FocusManager.blurPending');
      }
      return;
    }

    this._blurDelayTimeout = setTimeout(function() {
      if (this._debug) {
        console.log('FocusManager.blur');
      }
      this.hasFocus = false;
      this.onBlur();
      this._blurDelayTimeout = null;
    }.bind(this), this.blurDelay);
  }
};

exports.FocusManager = FocusManager;


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('demo/index', ['require', 'exports', 'module' , 'gcli/index', 'demo/commands/basic', 'demo/commands/bugs', 'demo/commands/demo', 'demo/commands/experimental', 'demo/commands/help'], function(require, exports, module) {

  require('gcli/index');

  require('demo/commands/basic').startup();
  require('demo/commands/bugs').startup();
  require('demo/commands/demo').startup();
  require('demo/commands/experimental').startup();

  var help = require('demo/commands/help');
  help.startup();
  help.helpMessages.prefix = "<h2>Welcome to GCLI</h2>" +
    "<p>GCLI is an experiment to create a highly usable JavaScript command line for developers." +
    "<p>Useful links: " +
    "<a target='_blank' href='https://github.com/joewalker/gcli'>source</a> (BSD), " +
    "<a target='_blank' href='https://github.com/joewalker/gcli/blob/master/docs/index.md'>documentation</a> (for users/embedders), " +
    "<a target='_blank' href='https://wiki.mozilla.org/DevTools/Features/GCLI'>Mozilla feature page</a> (for GCLI in the web console).";

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('demo/commands/basic', ['require', 'exports', 'module' , 'gcli/index'], function(require, exports, module) {


var gcli = require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(echo);
  gcli.addCommand(alert);
};

exports.shutdown = function() {
  gcli.removeCommand(echo);
  gcli.removeCommand(alert);
};


/**
 * Arm window.alert with metadata
 */
var alert = {
  name: 'alert',
  description: {
    'root': 'Show an alert dialog'
  },
  params: [
    {
      name: 'message',
      type: 'string',
      description: {
        'root': 'Message to display'
      }
    }
  ],
  exec: function(args, context) {
    window.alert(args.message);
  }
};

/**
 * 'echo' command
 */
var echo = {
  name: 'echo',
  description: {
    root: 'Show a message',
  },
  params: [
    {
      name: 'message',
      type: 'string',
      description: {
        root: 'Message'
      }
    }
  ],
  returnType: 'string',
  exec: function echo(args, context) {
    return args.message;
  }
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('demo/commands/bugs', ['require', 'exports', 'module' , 'gcli/index', 'gcli/util'], function(require, exports, module) {


var gcli = require('gcli/index');
var dom = require('gcli/util').dom;

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(bugzCommandSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(bugzCommandSpec);
};


/**
 * 'bugz' command.
 */
var bugzCommandSpec = {
  name: 'bugz',
  returnType: 'html',
  description: 'List the GCLI bugs open in Bugzilla',
  exec: function(args, context) {
    var promise = context.createPromise();

    function onFailure(msg) {
      promise.resolve(msg);
    }

    // A quick hack to help us add up predictions
    var predictions = {
      completed: { best:0, likely:0, worst:0 },
      outstanding: { best:0, likely:0, worst:0 }
    };

    var query = 'status_whiteboard=[GCLI-META]' +
      '&bug_status=UNCONFIRMED' +
      '&bug_status=NEW' +
      '&bug_status=ASSIGNED' +
      '&bug_status=REOPENED';

    queryBugzilla(query, function(json) {
      json.bugs.sort(function(bug1, bug2) {
        return bug1.priority.localeCompare(bug2.priority);
      });

      var doc = context.document;
      var div = dom.createElement(doc, 'div');

      var p = dom.createElement(doc, 'p');
      p.appendChild(doc.createTextNode('Open GCLI meta-bugs (i.e. '));
      var a = dom.createElement(doc, 'a');
      a.setAttribute('target', '_blank');
      a.setAttribute('href', 'https://bugzilla.mozilla.org/buglist.cgi?list_id=459033&status_whiteboard_type=allwordssubstr&query_format=advanced&status_whiteboard=[GCLI-META]&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED');
      a.appendChild(doc.createTextNode('this search'));
      p.appendChild(a);
      p.appendChild(doc.createTextNode('):'));
      div.appendChild(p);

      var ul = dom.createElement(doc, 'ul');
      json.bugs.forEach(function(bug) {
        var li = liFromBug(doc, bug, predictions);

        // This is the spinner graphic
        var img = dom.createElement(doc, 'img');
        img.setAttribute('src', 'data:image/gif;base64,R0lGODlhEAAQA' +
            'PMAAP///wAAAAAAAIKCgnJycqioqLy8vM7Ozt7e3pSUlOjo6GhoaAAA' +
            'AAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHd' +
            'pdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAAEKxDISa' +
            'u9OE/Bu//cQBTGgWDhWJ5XSpqoIL6s5a7xjLeyCvOgIEdDLBqPlAgAI' +
            'fkECQoAAAAsAAAAABAAEAAABCsQyEmrvThPwbv/XJEMxIFg4VieV0qa' +
            'qCC+rOWu8Yy3sgrzoCBHQywaj5QIACH5BAkKAAAALAAAAAAQABAAAAQ' +
            'rEMhJq704T8G7/9xhFMlAYOFYnldKmqggvqzlrvGMt7IK86AgR0MsGo' +
            '+UCAAh+QQJCgAAACwAAAAAEAAQAAAEMRDISau9OE/Bu/+cghxGkQyEF' +
            'Y7lmVYraaKqIMpufbc0bLOzFyXGE25AyI5myWw6KREAIfkECQoAAAAs' +
            'AAAAABAAEAAABDYQyEmrvThPwbv/nKQgh1EkA0GFwFie6SqIpImq29z' +
            'WMC6xLlssR3vdZEWhDwBqejTQqHRKiQAAIfkECQoAAAAsAAAAABAAEA' +
            'AABDYQyEmrvThPwbv/HKUgh1EkAyGF01ie6SqIpImqACu5dpzPrRoMp' +
            'wPwhjLa6yYDOYuaqHRKjQAAIfkECQoAAAAsAAAAABAAEAAABDEQyEmr' +
            'vThPwbv/nKUgh1EkAxFWY3mmK9WaqCqIJA3fbP7aOFctNpn9QEiPZsl' +
            'sOikRACH5BAkKAAAALAAAAAAQABAAAAQrEMhJq704T8G7/xymIIexEO' +
            'E1lmdqrSYqiGTsVnA7q7VOszKQ8KYpGo/ICAAh+QQJCgAAACwAAAAAE' +
            'AAQAAAEJhDISau9OE/Bu/+cthBDEmZjeWKpKYikC6svGq9XC+6e5v/A' +
            'ICUCACH5BAkKAAAALAAAAAAQABAAAAQrEMhJq704T8G7/xy2EENSGOE' +
            '1lmdqrSYqiGTsVnA7q7VOszKQ8KYpGo/ICAAh+QQJCgAAACwAAAAAEA' +
            'AQAAAEMRDISau9OE/Bu/+ctRBDUhgHElZjeaYr1ZqoKogkDd9s/to4V' +
            'y02mf1ASI9myWw6KREAIfkECQoAAAAsAAAAABAAEAAABDYQyEmrvThP' +
            'wbv/HLUQQ1IYByKF01ie6SqIpImqACu5dpzPrRoMpwPwhjLa6yYDOYu' +
            'aqHRKjQAAIfkECQoAAAAsAAAAABAAEAAABDYQyEmrvThPwbv/nLQQQ1' +
            'IYB0KFwFie6SqIpImq29zWMC6xLlssR3vdZEWhDwBqejTQqHRKiQAAI' +
            'fkECQoAAAAsAAAAABAAEAAABDEQyEmrvThPwbv/3EIMSWEciBWO5ZlW' +
            'K2miqiDKbn23NGyzsxclxhNuQMiOZslsOikRADsAAAAAAAAAAAA=');
        li.appendChild(img);

        queryBugzilla('blocked=' + bug.id, function(json) {
          var subul = dom.createElement(doc, 'ul');
          json.bugs.forEach(function(bug) {
            subul.appendChild(liFromBug(doc, bug, predictions));
          });
          li.appendChild(subul);
          li.removeChild(img);
        }, onFailure);

        ul.appendChild(li);
      });

      div.appendChild(ul);

      var table = dom.createElement(doc, 'table');
      var header = dom.createElement(doc, 'tr');
      header.innerHTML = '<th>Days</th><th>Best</th><th>Likely</th><th>Worst</th>';
      table.appendChild(header);
      div.appendChild(table);

      var compRow = dom.createElement(doc, 'tr');
      var completed = dom.createElement(doc, 'td');
      completed.innerHTML = 'Completed';
      compRow.appendChild(completed);
      predictions.completed.bestTd = dom.createElement(doc, 'td');
      compRow.appendChild(predictions.completed.bestTd);
      predictions.completed.likelyTd = dom.createElement(doc, 'td');
      compRow.appendChild(predictions.completed.likelyTd);
      predictions.completed.worstTd = dom.createElement(doc, 'td');
      compRow.appendChild(predictions.completed.worstTd);
      table.appendChild(compRow);

      var outstRow = dom.createElement(doc, 'tr');
      var outstanding = dom.createElement(doc, 'td');
      outstanding.innerHTML = 'Outstanding';
      outstRow.appendChild(outstanding);
      predictions.outstanding.bestTd = dom.createElement(doc, 'td');
      outstRow.appendChild(predictions.outstanding.bestTd);
      predictions.outstanding.likelyTd = dom.createElement(doc, 'td');
      outstRow.appendChild(predictions.outstanding.likelyTd);
      predictions.outstanding.worstTd = dom.createElement(doc, 'td');
      outstRow.appendChild(predictions.outstanding.worstTd);
      table.appendChild(outstRow);

      predictions.summary = dom.createElement(doc, 'p');
      div.appendChild(predictions.summary);

      promise.resolve(div);
    }, onFailure);

    return promise;
  }
};

/**
 * Simple wrapper for querying bugzilla.
 * @see https://wiki.mozilla.org/Bugzilla:REST_API
 * @see https://wiki.mozilla.org/Bugzilla:REST_API:Search
 * @see http://www.bugzilla.org/docs/developer.html
 * @see https://harthur.wordpress.com/2011/03/31/bz-js/
 * @see https://github.com/harthur/bz.js
 */
function queryBugzilla(query, onSuccess, onFailure) {
  var url = 'https://api-dev.bugzilla.mozilla.org/0.9/bug?' + query;

  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.setRequestHeader('Accept', 'application/json');
  req.setRequestHeader('Content-type', 'application/json');
  req.onreadystatechange = function(event) {
    if (req.readyState == 4) {
      if (req.status >= 300 || req.status < 200) {
        onFailure('Error: ' + JSON.stringify(req));
        return;
      }

      var json;
      try {
        json = JSON.parse(req.responseText);
      }
      catch (ex) {
        onFailure('Invalid response: ' + ex + ': ' + req.responseText);
        return;
      }

      if (json.error) {
        onFailure('Error: ' + json.error.message);
        return;
      }

      onSuccess(json);
    }
  }.bind(this);
  req.send();
}

/**
 * Create an <li> element from the given bug object
 */
function liFromBug(doc, bug, predictions) {
  var done = [ 'RESOLVED', 'VERIFIED', 'CLOSED' ].indexOf(bug.status) !== -1;
  var li = dom.createElement(doc, 'li');
  if (done) {
    li.style.textDecoration = 'line-through';
    li.style.color = 'grey';
  }
  if (bug.status === 'ASSIGNED') {
    li.style.fontWeight = 'bold';
  }
  var a = dom.createElement(doc, 'a');
  a.setAttribute('target', '_blank');
  a.setAttribute('href', 'https://bugzilla.mozilla.org/show_bug.cgi?id=' + bug.id);
  a.appendChild(doc.createTextNode(bug.id));
  li.appendChild(a);
  li.appendChild(doc.createTextNode(' ' + bug.summary + ' '));
  if (bug.whiteboard.indexOf('[minotaur]') !== -1) {
    var bestReply = /best:([0-9]*)d/.exec(bug.whiteboard);
    var best = (bestReply == null ? 0 : bestReply[1]);
    var likelyReply = /likely:([0-9]*)d/.exec(bug.whiteboard);
    var likely = (likelyReply == null ? 0 : likelyReply[1]);
    var worstReply = /worst:([0-9]*)d/.exec(bug.whiteboard);
    var worst = (worstReply == null ? 0 : worstReply[1]);
    try {
      best = parseInt(best, 10);
      likely = parseInt(likely, 10);
      worst = parseInt(worst, 10);
    }
    catch (ex) {
      console.error(ex);
      best = 0;
      likely = 0;
      worst = 0;
    }
    if (done) {
      predictions.completed.best += best;
      predictions.completed.likely += likely;
      predictions.completed.worst += worst;
    }
    else {
      predictions.outstanding.best += best;
      predictions.outstanding.likely += likely;
      predictions.outstanding.worst += worst;
    }
    var minsum = dom.createElement(doc, 'span');
    minsum.setAttribute('style', 'color: #080;');
    minsum.appendChild(doc.createTextNode(' M:' + best + '/' + likely + '/' + worst));
    li.appendChild(minsum);

    predictions.completed.bestTd.innerHTML = '' + predictions.completed.best;
    predictions.completed.likelyTd.innerHTML = '' + predictions.completed.likely;
    predictions.completed.worstTd.innerHTML = '' + predictions.completed.worst;
    predictions.outstanding.bestTd.innerHTML = '' + predictions.outstanding.best;
    predictions.outstanding.likelyTd.innerHTML = '' + predictions.outstanding.likely;
    predictions.outstanding.worstTd.innerHTML = '' + predictions.outstanding.worst;

    var percentComplete = Math.floor((
        (100 * predictions.completed.best / (predictions.completed.best + predictions.outstanding.best)) +
        (100 * predictions.completed.likely / (predictions.completed.likely + predictions.outstanding.likely)) +
        (100 * predictions.completed.worst / (predictions.completed.best + predictions.outstanding.worst))
      ) / 3);
    predictions.summary.innerHTML = 'Complete: ' + percentComplete + '%';
  }
  return li;
}


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('demo/commands/demo', ['require', 'exports', 'module' , 'gcli/index'], function(require, exports, module) {


var gcli = require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(gcliTop);
  gcli.addCommand(gcliOnestring);
  gcli.addCommand(gcliTwostrings);
  gcli.addCommand(gcliTwonums);
  gcli.addCommand(gcliSelboolnum);
  gcli.addCommand(gcliNode);
};

exports.shutdown = function() {
  gcli.removeCommand(gcliTop);
  gcli.removeCommand(gcliOnestring);
  gcli.removeCommand(gcliTwostrings);
  gcli.removeCommand(gcliTwonums);
  gcli.removeCommand(gcliSelboolnum);
  gcli.removeCommand(gcliNode);
};


/**
 * Parent Command
 */
var gcliTop = {
  name: 'gcli',
  description: 'Commands for playing with the UI'
};


/**
 * 'gcli onestring' command
 */
var gcliOnestring = {
  name: 'gcli onestring',
  description: 'Single string parameter',
  params: [
    { name: 'text', type: 'string', description: 'Demo param' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() + 'text=' + args.text;
  }
};

/**
 * 'gcli twostrings' command
 */
var gcliTwostrings = {
  name: 'gcli twostrings',
  description: '2 string parameters',
  params: [
    { name: 'p1', type: 'string', description: 'First param' },
    { name: 'p2', type: 'string', description: 'Second param' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=\'' + args.p1 + '\', p2=\'' + args.p2 + '\'';
  }
};

/**
 * 'gcli twonums' command
 */
var gcliTwonums = {
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
      type: { name: 'number', min: -20, max: 42, step: 5 },
      description: 'Second param'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=' + args.p1 + ', p2=' + args.p2;
  }
};

/**
 * 'gcli selboolnum' command
 */
var gcliSelboolnum = {
  name: 'gcli selboolnum',
  description: 'A selection, a boolean and a number',
  params: [
    {
      name: 'p1',
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
      name: 'p2',
      type: { name: 'number', min: -4, max: 42, step: 5 },
      description: 'Third param'
    },
    {
      name: 'p3',
      type: 'boolean',
      description: 'Second param'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=' + args.p1 + ', p2=' + args.p2 + ', p3=' + args.p3;
  }
};

/**
 * 'gcli node' command
 */
var gcliNode = {
  name: 'gcli node',
  description: 'Single node parameter',
  params: [
    { name: 'node', type: 'node', description: 'Demo param' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() + 'node=' + args.node;
  }
};


var messages = [
  'GCLI wants you to trick it out in some way.</br>',
  'GCLI is your web command line.</br>',
  'GCLI would love to be like Zsh on the Web.</br>',
  'GCLI is written on the Web platform, so you can tweak it.</br>'
];
function motivate() {
  var index = Math.floor(Math.random() * messages.length);
  return messages[index];
}


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('demo/commands/experimental', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/types'], function(require, exports, module) {
var experimental = exports;


var canon = require('gcli/canon');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Conversion = require('gcli/types').Conversion;

/**
 * Registration and de-registration.
 */
experimental.startup = function(data, reason) {
  types.registerType(commitObject);
  types.registerType(existingFile);

  canon.addCommand(git);
  canon.addCommand(gitAdd);
  canon.addCommand(gitCommit);

  canon.addCommand(vi);

  canon.addCommand(sleep);
};

experimental.shutdown = function(data, reason) {
  canon.removeCommand(sleep);

  canon.removeCommand(vi);

  canon.removeCommand(git);
  canon.removeCommand(gitAdd);
  canon.removeCommand(gitCommit);

  types.unregisterType(commitObject);
  types.unregisterType(existingFile);
};


/**
 * commitObject really needs some smarts, but for now it is a clone of string
 */
var commitObject = new Type();

commitObject.stringify = function(value) {
  return value;
};

commitObject.parse = function(arg) {
  return new Conversion(arg.text, arg);
};

commitObject.name = 'commitObject';

/**
 * existingFile really needs some smarts, but for now it is a clone of string
 */
var existingFile = new Type();

existingFile.stringify = function(value) {
  return value;
};

existingFile.parse = function(arg) {
  return new Conversion(arg.text, arg);
};

existingFile.name = 'existingFile';


/**
 * Parent 'git' command
 */
var git = {
  name: 'git',
  description: 'Distributed revision control in a browser',
  manual: 'Git is a fast, scalable, distributed revision control system' +
    ' with an unusually rich command set that provides both' +
    ' high-level operations and full access to internals.'
};

/**
 * 'git add' command
 */
var gitAdd = {
  name: 'git add',
  description: 'Add file contents to the index',
  manual: 'This command updates the index using the current content found in the working tree, to prepare the content staged for the next commit. It typically adds the current content of existing paths as a whole, but with some options it can also be used to add content with only part of the changes made to the working tree files applied, or remove paths that do not exist in the working tree anymore.' +
      '<br/>The "index" holds a snapshot of the content of the working tree, and it is this snapshot that is taken as the contents of the next commit. Thus after making any changes to the working directory, and before running the commit command, you must use the add command to add any new or modified files to the index.' +
      '<br/>This command can be performed multiple times before a commit. It only adds the content of the specified file(s) at the time the add command is run; if you want subsequent changes included in the next commit, then you must run git add again to add the new content to the index.' +
      '<br/>The git status command can be used to obtain a summary of which files have changes that are staged for the next commit.' +
      '<br/>The git add command will not add ignored files by default. If any ignored files were explicitly specified on the command line, git add will fail with a list of ignored files. Ignored files reached by directory recursion or filename globbing performed by Git (quote your globs before the shell) will be silently ignored. The git add command can be used to add ignored files with the -f (force) option.' +
      '<br/>Please see git-commit(1) for alternative ways to add content to a commit.',
  params: [
    {
      name: 'filepattern',
      type: { name: 'array', subtype: 'string' },
      description: 'Files to add',
      manual: 'Fileglobs (e.g.  *.c) can be given to add all matching files. Also a leading directory name (e.g.  dir to add dir/file1 and dir/file2) can be given to add all files in the directory, recursively.'
    },
    {
      group: 'Common Options',
      params: [
        {
          name: 'all',
          short: 'a',
          type: 'boolean',
          description: 'All (unignored) files',
          manual: 'That means that it will find new files as well as staging modified content and removing files that are no longer in the working tree.'
        },
        {
          name: 'verbose',
          short: 'v',
          type: 'boolean',
          description: 'Verbose output'
        },
        {
          name: 'dry-run',
          short: 'n',
          type: 'boolean',
          description: 'Dry run',
          manual: 'Don\'t actually add the file(s), just show if they exist and/or will be ignored.'
        },
        {
          name: 'force',
          short: 'f',
          type: 'boolean',
          description: 'Allow ignored files',
          manual: 'Allow adding otherwise ignored files.'
        }
      ]
    },
    {
      group: 'Advanced Options',
      params: [
        {
          name: 'update',
          short: 'u',
          type: 'boolean',
          description: 'Match only files already added',
          manual: 'That means that it will never stage new files, but that it will stage modified new contents of tracked files and that it will remove files from the index if the corresponding files in the working tree have been removed.<br/>If no <filepattern> is given, default to "."; in other words, update all tracked files in the current directory and its subdirectories.'
        },
        {
          name: 'refresh',
          type: 'boolean',
          description: 'Refresh only (don\'t add)',
          manual: 'Don\'t add the file(s), but only refresh their stat() information in the index.'
        },
        {
          name: 'ignore-errors',
          type: 'boolean',
          description: 'Ignore errors',
          manual: 'If some files could not be added because of errors indexing them, do not abort the operation, but continue adding the others. The command shall still exit with non-zero status.'
        },
        {
          name: 'ignore-missing',
          type: 'boolean',
          description: 'Ignore missing',
          manual: 'By using this option the user can check if any of the given files would be ignored, no matter if they are already present in the work tree or not. This option can only be used together with --dry-run.'
        }
      ]
    }
  ],
  exec: function(args, context) {
    return "This is only a demo of UI generation.";
  }
};


/**
 * 'git commit' command
 */
var gitCommit = {
  name: 'git commit',
  description: 'Record changes to the repository',
  manual: 'Stores the current contents of the index in a new commit along with a log message from the user describing the changes.' +
      '<br/>The content to be added can be specified in several ways:' +
      '<br/>1. by using git add to incrementally "add" changes to the index before using the commit command (Note: even modified files must be "added");' +
      '<br/>2. by using git rm to remove files from the working tree and the index, again before using the commit command;' +
      '<br/>3. by listing files as arguments to the commit command, in which case the commit will ignore changes staged in the index, and instead record the current content of the listed files (which must already be known to git);' +
      '<br/>4. by using the -a switch with the commit command to automatically "add" changes from all known files (i.e. all files that are already listed in the index) and to automatically "rm" files in the index that have been removed from the working tree, and then perform the actual commit;' +
      '<br/>5. by using the --interactive switch with the commit command to decide one by one which files should be part of the commit, before finalizing the operation. Currently, this is done by invoking git add --interactive.' +
      '<br/>The --dry-run option can be used to obtain a summary of what is included by any of the above for the next commit by giving the same set of parameters (options and paths).' +
      '<br/>If you make a commit and then find a mistake immediately after that, you can recover from it with git reset.',
  params: [
    {
      name: 'file',
      short: 'F',
      type: { name: 'array', subtype: 'existingFile' },
      description: 'Files to commit',
      manual: 'When files are given on the command line, the command commits the contents of the named files, without recording the changes already staged. The contents of these files are also staged for the next commit on top of what have been staged before.'
    },
    {
      group: 'Common Options',
      params: [
        {
          name: 'all',
          short: 'a',
          type: 'boolean',
          description: 'All (unignored) files',
          manual: 'Tell the command to automatically stage files that have been modified and deleted, but new files you have not told git about are not affected.'
        },
        {
          name: 'message',
          short: 'm',
          type: 'string',
          description: 'Commit message',
          manual: 'Use the given message as the commit message.'
        },
        {
          name: 'signoff',
          short: 's',
          type: 'string',
          description: 'Signed off by',
          manual: 'Add Signed-off-by line by the committer at the end of the commit log message.'
        }
      ]
    },
    {
      group: 'Advanced Options',
      params: [
        {
          name: 'author',
          type: 'string',
          description: 'Override the author',
          manual: 'Specify an explicit author using the standard A U Thor <author@example.com[1]> format. Otherwise <author> is assumed to be a pattern and is used to search for an existing commit by that author (i.e. rev-list --all -i --author=<author>); the commit author is then copied from the first such commit found.'
        },
        {
          name: 'date',
          type: 'string', // Make this of date type
          description: 'Override the date',
          manual: 'Override the author date used in the commit.'
        },
        {
          name: 'amend',
          type: 'boolean',
          description: 'Amend tip',
          manual: 'Used to amend the tip of the current branch. Prepare the tree object you would want to replace the latest commit as usual (this includes the usual -i/-o and explicit paths), and the commit log editor is seeded with the commit message from the tip of the current branch. The commit you create replaces the current tip -- if it was a merge, it will have the parents of the current tip as parents -- so the current top commit is discarded.'
        },
        {
          name: 'verbose',
          short: 'v',
          type: 'boolean',
          description: 'Verbose',
          manual: 'Show unified diff between the HEAD commit and what would be committed at the bottom of the commit message template. Note that this diff output doesn\'t have its lines prefixed with #.'
        },
        {
          name: 'quiet',
          short: 'q',
          type: 'boolean',
          description: 'Quiet',
          manual: 'Suppress commit summary message.'
        },
        {
          name: 'dry-run',
          type: 'boolean',
          description: 'Dry run',
          manual: 'Do not create a commit, but show a list of paths that are to be committed, paths with local changes that will be left uncommitted and paths that are untracked.'
        },
        {
          name: 'untracked-files',
          short: 'u',
          type: {
            name: 'selection',
            data: [ 'no', 'normal', 'all' ]
          },
          description: 'Show untracked files',
          manual: 'The mode parameter is optional, and is used to specify the handling of untracked files. The possible options are: <em>no</em> - Show no untracked files.<br/><em>normal</em> Shows untracked files and directories<br/><em>all</em> Also shows individual files in untracked directories.'
        }
      ]
    },
  ],
  exec: function(args, context) {
    return "This is only a demo of UI generation.";
  }
};


/**
 * 'vi' command
 */
var vi = {
  name: 'vi',
  description: 'Edit a file',
  params: [
    {
      name: 'file',
      type: 'existingFile',
      description: 'The file to edit'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return '' +
      '<textarea rows=3 cols=80 style="font-family:monospace">' +
      'One day it could be very useful to have an editor embedded in GCLI' +
      '</textarea>';
  }
};


/**
 * 'sleep' command
 */
var sleep = {
  name: 'sleep',
  description: 'Wait for a while',
  params: [
    {
      name: 'length',
      type: { name: 'number', min: 1 },
      description: 'How long to wait (s)'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    var promise = context.createPromise();
    window.setTimeout(function() {
      promise.resolve('done');
    }, args.length * 1000);
    return promise;
  }
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('demo/commands/help', ['require', 'exports', 'module' , 'gcli/canon'], function(require, exports, module) {
var help = exports;


var canon = require('gcli/canon');

/**
 * Registration and de-registration.
 */
help.startup = function() {
  canon.addCommand(helpCommandSpec);
};

help.shutdown = function() {
  canon.removeCommand(helpCommandSpec);
};


/**
 * We export a way to customize the help message with some HTML text
 */
help.helpMessages = {
  prefix: null,
  suffix: null
};

/**
 * 'help' command
 */
var helpCommandSpec = {
  name: 'help',
  params: [
    {
      name: 'search',
      type: 'string',
      description: 'Search string',
      defaultValue: null
    },
    {
      group: 'Options',
      params: [
        {
          name: 'hidden',
          type: 'boolean',
          description: 'Include hidden'
        }
      ]
    }
  ],
  returnType: 'html',
  description: 'Get help on the available commands',
  exec: function(args, context) {
    var output = [];

    var command = canon.getCommand(args.search);
    if (command && command.exec) {
      // caught a real command
      output.push(command.description ?
          command.description :
          'No description for ' + args.search);
    } else {
      if (!args.search && help.helpMessages.prefix) {
        output.push(help.helpMessages.prefix);
      }

      if (command) {
        // We must be looking at sub-commands
        output.push('<h2>Sub-Commands of ' + command.name + '</h2>');
        output.push('<p>' + command.description + '</p>');
      }
      else if (args.search) {
        output.push('<h2>Commands starting with \'' + args.search + '\':</h2>');
      }
      else {
        output.push('<h2>Available Commands:</h2>');
      }

      var commandNames = canon.getCommandNames();
      commandNames.sort();

      output.push('<table>');
      for (var i = 0; i < commandNames.length; i++) {
        command = canon.getCommand(commandNames[i]);
        if (!args.hidden && command.hidden) {
          continue;
        }
        if (command.description === undefined) {
          // Ignore editor actions
          continue;
        }
        if (args.search && command.name.indexOf(args.search) !== 0) {
          // Filtered out by the user
          continue;
        }
        if (!args.search && command.name.indexOf(' ') != -1) {
          // sub command
          continue;
        }
        if (command && command.name == args.search) {
          // sub command, and we've already given that help
          continue;
        }

        output.push('<tr>');
        output.push('<th class="right">' + command.name + '</th>');
        output.push('<td>' + command.description + '</td>');
        output.push('</tr>');
      }
      output.push('</table>');

      if (!args.search && help.helpMessages.suffix) {
        output.push(help.helpMessages.suffix);
      }
    }

    return output.join('');
  }
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/index', ['require', 'exports', 'module' , 'gcli/index', 'test/examiner', 'gclitest/testTokenize', 'gclitest/testSplit', 'gclitest/testCli', 'gclitest/testHistory', 'gclitest/testRequire'], function(require, exports, module) {

  // We need to make sure GCLI is initialized before we begin testing it
  require('gcli/index');

  var examiner = require('test/examiner');

  examiner.addSuite('gclitest/testTokenize', require('gclitest/testTokenize'));
  examiner.addSuite('gclitest/testSplit', require('gclitest/testSplit'));
  examiner.addSuite('gclitest/testCli', require('gclitest/testCli'));
  examiner.addSuite('gclitest/testHistory', require('gclitest/testHistory'));

  examiner.addSuite('gclitest/testRequire', require('gclitest/testRequire'));

  examiner.run();

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('test/examiner', ['require', 'exports', 'module' ], function(require, exports, module) {
var examiner = exports;


/**
 * Test harness data
 */
examiner.suites = {};

/**
 * The gap between tests when running async
 */
var delay = 10;

var currentTest = null;

var stati = {
  notrun: { index: 0, name: 'Skipped' },
  executing: { index: 1, name: 'Executing' },
  asynchronous: { index: 2, name: 'Waiting' },
  pass: { index: 3, name: 'Pass' },
  fail: { index: 4, name: 'Fail' }
};

/**
 * Add a test suite. Generally used like:
 * test.addSuite('foo', require('path/to/foo'));
 */
examiner.addSuite = function(name, suite) {
  examiner.suites[name] = new Suite(name, suite);
};

/**
 * Run all the tests synchronously
 */
examiner.run = function() {
  Object.keys(examiner.suites).forEach(function(suiteName) {
    var suite = examiner.suites[suiteName];
    suite.run();
  }.bind(this));
  return examiner.suites;
};

/**
 * Run all the tests asynchronously
 */
examiner.runAsync = function(callback) {
  this.runAsyncInternal(0, callback);
};

/**
 * Run all the test suits asynchronously
 */
examiner.runAsyncInternal = function(i, callback) {
  if (i >= Object.keys(examiner.suites).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var suiteName = Object.keys(examiner.suites)[i];
  examiner.suites[suiteName].runAsync(function() {
    setTimeout(function() {
      examiner.runAsyncInternal(i + 1, callback);
    }.bind(this), delay);
  }.bind(this));
};

/**
 *
 */
examiner.reportToText = function() {
  return JSON.stringify(examiner.toRemote());
};

/**
 * Create a JSON object suitable for serialization
 */
examiner.toRemote = function() {
  return {
    suites: Object.keys(examiner.suites).map(function(suiteName) {
      return examiner.suites[suiteName].toRemote();
    }.bind(this))
  };
};

/**
 * Used by assert to record a failure against the current test
 */
examiner.recordError = function(message) {
  if (!currentTest) {
    console.error('No currentTest for ' + message);
    return;
  }

  currentTest.status = stati.fail;

  if (Array.isArray(message)) {
    currentTest.messages.push.apply(currentTest.messages, message);
  }
  else {
    currentTest.messages.push(message);
  }
};

/**
 * A suite is a group of tests
 */
function Suite(suiteName, suite) {
  this.name = suiteName;
  this.suite = suite;

  this.tests = {};
  Object.keys(suite).forEach(function(testName) {
    if (testName !== 'setup' && testName !== 'shutdown') {
      var test = new Test(this, testName, suite[testName]);
      this.tests[testName] = test;
    }
  }.bind(this));
}

/**
 * Run all the tests in this suite synchronously
 */
Suite.prototype.run = function() {
  if (typeof this.suite.setup == "function") {
    this.suite.setup();
  }

  Object.keys(this.tests).forEach(function(testName) {
    var test = this.tests[testName];
    test.run();
  }.bind(this));

  if (typeof this.suite.shutdown == "function") {
    this.suite.shutdown();
  }
};

/**
 * Run all the tests in this suite asynchronously
 */
Suite.prototype.runAsync = function(callback) {
  if (typeof this.suite.setup == "function") {
    this.suite.setup();
  }

  this.runAsyncInternal(0, function() {
    if (typeof this.suite.shutdown == "function") {
      this.suite.shutdown();
    }

    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this));
};

/**
 * Function used by the async runners that can handle async recursion.
 */
Suite.prototype.runAsyncInternal = function(i, callback) {
  if (i >= Object.keys(this.tests).length) {
    if (typeof callback === 'function') {
      callback();
    }
    return;
  }

  var testName = Object.keys(this.tests)[i];
  this.tests[testName].runAsync(function() {
    setTimeout(function() {
      this.runAsyncInternal(i + 1, callback);
    }.bind(this), delay);
  }.bind(this));
};

/**
 * Create a JSON object suitable for serialization
 */
Suite.prototype.toRemote = function() {
  return {
    name: this.name,
    tests: Object.keys(this.tests).map(function(testName) {
      return this.tests[testName].toRemote();
    }.bind(this))
  };
};


/**
 * A test represents data about a single test function
 */
function Test(suite, name, func) {
  this.suite = suite;
  this.name = name;
  this.func = func;
  this.title = name.replace(/^test/, '').replace(/([A-Z])/g, ' $1');

  this.messages = [];
  this.status = stati.notrun;
}

/**
 * Run just a single test
 */
Test.prototype.run = function() {
  currentTest = this;
  this.status = stati.executing;
  this.messages = [];

  try {
    this.func.apply(this.suite);
  }
  catch (ex) {
    this.status = stati.fail;
    this.messages.push('' + ex);
    console.error(ex);
    console.trace();
  }

  if (this.status === stati.executing) {
    this.status = stati.pass;
  }

  currentTest = null;
};

/**
 * Run all the tests in this suite asynchronously
 */
Test.prototype.runAsync = function(callback) {
  setTimeout(function() {
    this.run();
    if (typeof callback === 'function') {
      callback();
    }
  }.bind(this), delay);
};

/**
 * Create a JSON object suitable for serialization
 */
Test.prototype.toRemote = function() {
  return {
    name: this.name,
    title: this.title,
    status: this.status,
    messages: this.messages
  };
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testTokenize', ['require', 'exports', 'module' , 'test/assert', 'gcli/cli', 'gcli/argument'], function(require, exports, module) {


var test = require('test/assert');
var Requisition = require('gcli/cli').Requisition;
var Argument = require('gcli/argument').Argument;
var ScriptArgument = require('gcli/argument').ScriptArgument;

exports.testBlanks = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);

  args = requ._tokenize(' ');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is(' ', args[0].prefix);
  test.is('', args[0].suffix);
};

exports.testSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  test.is(1, args.length);
  test.is('s', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof Argument);

  args = requ._tokenize('s s');
  test.is(2, args.length);
  test.is('s', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof Argument);
  test.is('s', args[1].text);
  test.is(' ', args[1].prefix);
  test.is('', args[1].suffix);
  test.ok(args[1] instanceof Argument);
};

exports.testJavascript = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{x}');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{ x }');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{ ', args[0].prefix);
  test.is(' }', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{x} {y}');
  test.is(2, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);
  test.is('y', args[1].text);
  test.is(' {', args[1].prefix);
  test.is('}', args[1].suffix);
  test.ok(args[1] instanceof ScriptArgument);

  args = requ._tokenize('{x}{y}');
  test.is(2, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);
  test.is('y', args[1].text);
  test.is('{', args[1].prefix);
  test.is('}', args[1].suffix);
  test.ok(args[1] instanceof ScriptArgument);

  args = requ._tokenize('{');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{ ');
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('{ ', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{x');
  test.is(1, args.length);
  test.is('x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);
};

exports.testRegularNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{"x"}');
  test.is(1, args.length);
  test.is('"x"', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{\'x\'}');
  test.is(1, args.length);
  test.is('\'x\'', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('"{x}"');
  test.is(1, args.length);
  test.is('{x}', args[0].text);
  test.is('"', args[0].prefix);
  test.is('"', args[0].suffix);
  test.ok(args[0] instanceof Argument);

  args = requ._tokenize('\'{x}\'');
  test.is(1, args.length);
  test.is('{x}', args[0].text);
  test.is('\'', args[0].prefix);
  test.is('\'', args[0].suffix);
  test.ok(args[0] instanceof Argument);
};

exports.testDeepNesting = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{{}}');
  test.is(1, args.length);
  test.is('{}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{{x} {y}}');
  test.is(1, args.length);
  test.is('{x} {y}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  args = requ._tokenize('{{w} {{{x}}}} {y} {{{z}}}');

  test.is(3, args.length);

  test.is('{w} {{{x}}}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  test.is('y', args[1].text);
  test.is(' {', args[1].prefix);
  test.is('}', args[1].suffix);
  test.ok(args[1] instanceof ScriptArgument);

  test.is('{{z}}', args[2].text);
  test.is(' {', args[2].prefix);
  test.is('}', args[2].suffix);
  test.ok(args[2] instanceof ScriptArgument);

  args = requ._tokenize('{{w} {{{x}}} {y} {{{z}}}');

  test.is(1, args.length);

  test.is('{w} {{{x}}} {y} {{{z}}}', args[0].text);
  test.is('{', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);
};

exports.testStrangeNesting = function() {
  var args;
  var requ = new Requisition();

  // Note: When we get real JS parsing this should break
  args = requ._tokenize('{"x}"}');

  test.is(2, args.length);

  test.is('"x', args[0].text);
  test.is('{', args[0].prefix);
  test.is('}', args[0].suffix);
  test.ok(args[0] instanceof ScriptArgument);

  test.is('}', args[1].text);
  test.is('"', args[1].prefix);
  test.is('', args[1].suffix);
  test.ok(args[1] instanceof Argument);
};

exports.testComplex = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize(' 1234  \'12 34\'');

  test.is(2, args.length);

  test.is('1234', args[0].text);
  test.is(' ', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof Argument);

  test.is('12 34', args[1].text);
  test.is('  \'', args[1].prefix);
  test.is('\'', args[1].suffix);
  test.ok(args[1] instanceof Argument);

  args = requ._tokenize('12\'34 "12 34" \\'); // 12'34 "12 34" \

  test.is(3, args.length);

  test.is('12\'34', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof Argument);

  test.is('12 34', args[1].text);
  test.is(' "', args[1].prefix);
  test.is('"', args[1].suffix);
  test.ok(args[1] instanceof Argument);

  test.is('\\', args[2].text);
  test.is(' ', args[2].prefix);
  test.is('', args[2].suffix);
  test.ok(args[2] instanceof Argument);
};

exports.testPathological = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('a\\ b \\t\\n\\r \\\'x\\\" \'d'); // a_b \t\n\r \'x\" 'd

  test.is(4, args.length);

  test.is('a b', args[0].text);
  test.is('', args[0].prefix);
  test.is('', args[0].suffix);
  test.ok(args[0] instanceof Argument);

  test.is('\t\n\r', args[1].text);
  test.is(' ', args[1].prefix);
  test.is('', args[1].suffix);
  test.ok(args[1] instanceof Argument);

  test.is('\'x"', args[2].text);
  test.is(' ', args[2].prefix);
  test.is('', args[2].suffix);
  test.ok(args[2] instanceof Argument);

  test.is('d', args[3].text);
  test.is(' \'', args[3].prefix);
  test.is('', args[3].suffix);
  test.ok(args[3] instanceof Argument);
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('test/assert', ['require', 'exports', 'module' , 'test/examiner'], function(require, exports, module) {

var examiner = require('test/examiner');

exports.ok = function(value, message) {
  if (!value) {
    console.error('not ok ', message);
    console.trace();
    examiner.recordError('not ok' + (message ? ': ' + message : ''));
  }
};

exports.is = function(expected, actual, message) {
  if (expected !== actual) {
    console.error('expected !== actual', expected, actual, message);
    console.trace();
    examiner.recordError('expected=' + expected + ', ' +
                     'actual=' + actual + ': ' + message);
  }
};

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testSplit', ['require', 'exports', 'module' , 'test/assert', 'gclitest/commands', 'gcli/cli'], function(require, exports, module) {

var test = require('test/assert');

var commands = require('gclitest/commands');
var Requisition = require('gcli/cli').Requisition;

exports.setup = function() {
  commands.setup();
};

exports.shutdown = function() {
  commands.shutdown();
};

exports.testSimple = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('s');
  requ._split(args);
  test.is(0, args.length);
  test.is('s', requ.commandAssignment.getArg().text);
};

exports.testFlatCommand = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('tsv');
  requ._split(args);
  test.is(0, args.length);
  test.is('tsv', requ.commandAssignment.getValue().name);

  args = requ._tokenize('tsv a b');
  requ._split(args);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is(2, args.length);
  test.is('a', args[0].text);
  test.is('b', args[1].text);
};

exports.testJavascript = function() {
  var args;
  var requ = new Requisition();

  args = requ._tokenize('{');
  requ._split(args);
  test.is(1, args.length);
  test.is('', args[0].text);
  test.is('', requ.commandAssignment.getArg().text);
  test.is('{', requ.commandAssignment.getValue().name);
};

// BUG 663081 - add tests for sub commands

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/commands', ['require', 'exports', 'module' , 'gcli/canon', 'gcli/types/basic', 'gcli/types'], function(require, exports, module) {
var commands = exports;


var canon = require('gcli/canon');

var SelectionType = require('gcli/types/basic').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;
var types = require('gcli/types');

/**
 * Registration and de-registration.
 */
commands.setup = function() {
  commands.option1.type = types.getType('number');
  commands.option2.type = types.getType('boolean');

  types.registerType(commands.optionType);
  types.registerType(commands.optionValue);

  canon.addCommand(commands.tsv);
  canon.addCommand(commands.tsr);
  canon.addCommand(commands.tsu);
  canon.addCommand(commands.tsn);
  canon.addCommand(commands.tsnDif);
  canon.addCommand(commands.tsnExt);
  canon.addCommand(commands.tsnExte);
  canon.addCommand(commands.tsnExten);
  canon.addCommand(commands.tsnExtend);
  canon.addCommand(commands.tselarr);
  canon.addCommand(commands.tsm);
};

commands.shutdown = function() {
  canon.removeCommand(commands.tsv);
  canon.removeCommand(commands.tsr);
  canon.removeCommand(commands.tsu);
  canon.removeCommand(commands.tsn);
  canon.removeCommand(commands.tsnDif);
  canon.removeCommand(commands.tsnExt);
  canon.removeCommand(commands.tsnExte);
  canon.removeCommand(commands.tsnExten);
  canon.removeCommand(commands.tsnExtend);
  canon.removeCommand(commands.tselarr);
  canon.removeCommand(commands.tsm);

  types.deregisterType(commands.optionType);
  types.deregisterType(commands.optionValue);
};


commands.option1 = { };
commands.option2 = { };

commands.optionType = new SelectionType({
  name: 'optionType',
  lookup: [
    { name: 'option1', value: commands.option1 },
    { name: 'option2', value: commands.option2 }
  ],
  noMatch: function() {
    this.lastOption = null;
  },
  stringify: function(option) {
    this.lastOption = option;
    return SelectionType.prototype.stringify.call(this, option);
  },
  parse: function(arg) {
    var conversion = SelectionType.prototype.parse.call(this, arg);
    this.lastOption = conversion.value;
    return conversion;
  }
});

commands.optionValue = new DeferredType({
  name: 'optionValue',
  defer: function() {
    if (commands.optionType.lastOption) {
      return commands.optionType.lastOption.type;
    }
    else {
      return types.getType('blank');
    }
  }
});

commands.tsv = {
  name: 'tsv',
  params: [
    { name: 'optionType', type: 'optionType' },
    { name: 'optionValue', type: 'optionValue' }
  ],
  exec: function(args, context) { }
};

commands.tsr = {
  name: 'tsr',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(args, context) { }
};

commands.tsu = {
  name: 'tsu',
  params: [ { name: 'num', type: 'number' } ],
  exec: function(args, context) { }
};

commands.tsn = {
  name: 'tsn'
};

commands.tsnDif = {
  name: 'tsn dif',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExt = {
  name: 'tsn ext',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExte = {
  name: 'tsn exte',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExten = {
  name: 'tsn exten',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExtend = {
  name: 'tsn extend',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tselarr = {
  name: 'tselarr',
  params: [
    { name: 'num', type: { name: 'selection', data: [ '1', '2', '3' ] } },
    { name: 'arr', type: { name: 'array', subtype: 'string' } },
  ],
  exec: function(args, context) {}
};

commands.tsm = {
  name: 'tsm',
  hidden: true,
  description: 'a 3-param test selection|string|number',
  params: [
    { name: 'abc', type: { name: 'selection', data: [ 'a', 'b', 'c' ] } },
    { name: 'txt', type: 'string' },
    { name: 'num', type: { name: 'number', max: 42, min: 0 } },
  ],
  exec: function(args, context) {}
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testCli', ['require', 'exports', 'module' , 'gcli/cli', 'gcli/types', 'gclitest/commands', 'test/assert'], function(require, exports, module) {


var Requisition = require('gcli/cli').Requisition;
var Status = require('gcli/types').Status;
var commands = require('gclitest/commands');

var test = require('test/assert');

exports.setup = function() {
  commands.setup();
};

exports.shutdown = function() {
  commands.shutdown();
};


var assign1;
var assign2;
var assignC;
var requ;
var debug = false;
var status;
var statuses;

function update(input) {
  if (!requ) {
    requ = new Requisition();
  }
  requ.update(input);

  if (debug) {
    console.log('####### TEST: typed="' + input.typed +
        '" cur=' + input.cursor.start +
        ' cli=', requ);
  }

  status = requ.getStatus();
  assignC = requ.getAssignmentAt(input.cursor.start);
  statuses = requ.getInputStatusMarkup().map(function(s) {
    return s.toString()[0];
  }).join('');

  if (requ.commandAssignment.getValue()) {
    assign1 = requ.getAssignment(0);
    assign2 = requ.getAssignment(1);
  }
  else {
    assign1 = undefined;
    assign2 = undefined;
  }
}

function verifyPredictionsContains(name, predictions) {
  return predictions.every(function(prediction) {
    return name === prediction.name;
  }, this);
}


exports.testBlank = function() {
  update({ typed: '', cursor: { start: 0, end: 0 } });
  test.is(   '', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(null, requ.commandAssignment.getValue());

  update({ typed: ' ', cursor: { start: 1, end: 1 } });
  test.is(   'V', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(null, requ.commandAssignment.getValue());

  update({ typed: ' ', cursor: { start: 0, end: 0 } });
  test.is(   'V', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(null, requ.commandAssignment.getValue());
};

exports.testIncompleteMultiMatch = function() {
  update({ typed: 't', cursor: { start: 1, end: 1 } });
  test.is(   'I', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.ok(assignC.getPredictions().length > 0);
  test.ok(assignC.getPredictions().length < 20); // could break ...
  verifyPredictionsContains('tsv', assignC.getPredictions());
  verifyPredictionsContains('tsr', assignC.getPredictions());
  test.is(null, requ.commandAssignment.getValue());
};

exports.testIncompleteSingleMatch = function() {
  update({ typed: 'tselar', cursor: { start: 6, end: 6 } });
  test.is(   'IIIIII', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is(1, assignC.getPredictions().length);
  test.is('tselarr', assignC.getPredictions()[0].name);
  test.is(null, requ.commandAssignment.getValue());
};

exports.testTsv = function() {
  update({ typed: 'tsv', cursor: { start: 3, end: 3 } });
  test.is(   'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv ', cursor: { start: 4, end: 4 } });
  test.is(   'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv ', cursor: { start: 2, end: 2 } });
  test.is(   'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);

  update({ typed: 'tsv o', cursor: { start: 5, end: 5 } });
  test.is(   'VVVVI', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.is(2, assignC.getPredictions().length);
  test.is(commands.option1, assignC.getPredictions()[0].value);
  test.is(commands.option2, assignC.getPredictions()[1].value);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('o', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option', cursor: { start: 10, end: 10 } });
  test.is(   'VVVVIIIIII', statuses);
  test.is(Status.ERROR, status);
  test.is(0, assignC.paramIndex);
  test.is(2, assignC.getPredictions().length);
  test.is(commands.option1, assignC.getPredictions()[0].value);
  test.is(commands.option2, assignC.getPredictions()[1].value);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option', cursor: { start: 1, end: 1 } });
  test.is(   'VVVVEEEEEE', statuses);
  test.is(Status.ERROR, status);
  test.is(-1, assignC.paramIndex);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option ', cursor: { start: 11, end: 11 } });
  test.is(   'VVVVEEEEEEV', statuses);
  test.is(Status.ERROR, status);
  test.is(1, assignC.paramIndex);
  test.is(0, assignC.getPredictions().length);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option', assign1.getArg().text);
  test.is(null, assign1.getValue());

  update({ typed: 'tsv option1', cursor: { start: 11, end: 11 } });
  test.is(   'VVVVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option1', assign1.getArg().text);
  test.is(commands.option1, assign1.getValue());
  test.is(0, assignC.paramIndex);

  update({ typed: 'tsv option1 ', cursor: { start: 12, end: 12 } });
  test.is(   'VVVVVVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option1', assign1.getArg().text);
  test.is(commands.option1, assign1.getValue());
  test.is(1, assignC.paramIndex);

  update({ typed: 'tsv option1 6', cursor: { start: 13, end: 13 } });
  test.is(   'VVVVVVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option1', assign1.getArg().text);
  test.is(commands.option1, assign1.getValue());
  test.is('6', assign2.getArg().text);
  test.is(6, assign2.getValue());
  test.is('number', typeof assign2.getValue());
  test.is(1, assignC.paramIndex);

  update({ typed: 'tsv option2 6', cursor: { start: 13, end: 13 } });
  test.is(   'VVVVVVVVVVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsv', requ.commandAssignment.getValue().name);
  test.is('option2', assign1.getArg().text);
  test.is(commands.option2, assign1.getValue());
  test.is('6', assign2.getArg().text);
  test.is(null, assign2.getValue());
  test.is(1, assignC.paramIndex);
};

exports.testInvalid = function() {
  update({ typed: 'fred', cursor: { start: 4, end: 4 } });
  test.is(   'EEEE', statuses);
  test.is('fred', requ.commandAssignment.getArg().text);
  test.is('', requ._unassigned.getArg().text);
  test.is(-1, assignC.paramIndex);

  update({ typed: 'fred ', cursor: { start: 5, end: 5 } });
  test.is(   'EEEEV', statuses);
  test.is('fred', requ.commandAssignment.getArg().text);
  test.is('', requ._unassigned.getArg().text);
  test.is(-1, assignC.paramIndex);

  update({ typed: 'fred one', cursor: { start: 8, end: 8 } });
  test.is(   'EEEEVEEE', statuses);
  test.is('fred', requ.commandAssignment.getArg().text);
  test.is('one', requ._unassigned.getArg().text);
};

exports.testSingleString = function() {
  update({ typed: 'tsr', cursor: { start: 3, end: 3 } });
  test.is(   'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());
  test.is(undefined, assign2);

  update({ typed: 'tsr ', cursor: { start: 4, end: 4 } });
  test.is(   'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());
  test.is(undefined, assign2);

  update({ typed: 'tsr h', cursor: { start: 5, end: 5 } });
  test.is(   'VVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  test.is('h', assign1.getArg().text);
  test.is('h', assign1.getValue());

  update({ typed: 'tsr "h h"', cursor: { start: 9, end: 9 } });
  test.is(   'VVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsr', requ.commandAssignment.getValue().name);
  test.is('h h', assign1.getArg().text);
  test.is('h h', assign1.getValue());

  update({ typed: 'tsr h h h', cursor: { start: 9, end: 9 } });
  test.is(   'VVVVVVVVV', statuses);
  test.is('tsr', requ.commandAssignment.getValue().name);
  test.is('h h h', assign1.getArg().text);
  test.is('h h h', assign1.getValue());
};

// BUG 664203: Add test to see that a command without mandatory param -> ERROR

exports.testSingleNumber = function() {
  update({ typed: 'tsu', cursor: { start: 3, end: 3 } });
  test.is(   'VVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  test.is(null, assign1.getValue());

  update({ typed: 'tsu ', cursor: { start: 4, end: 4 } });
  test.is(   'VVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  test.is(null, assign1.getValue());

  update({ typed: 'tsu 1', cursor: { start: 5, end: 5 } });
  test.is(   'VVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  test.is('1', assign1.getArg().text);
  test.is(1, assign1.getValue());
  test.is('number', typeof assign1.getValue());

  update({ typed: 'tsu x', cursor: { start: 5, end: 5 } });
  test.is(   'VVVVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsu', requ.commandAssignment.getValue().name);
  test.is('x', assign1.getArg().text);
  test.is(null, assign1.getValue());
};

exports.testNestedCommand = function() {
  update({ typed: 'tsn', cursor: { start: 3, end: 3 } });
  test.is(   'III', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn', requ.commandAssignment.getValue().name);
  test.is(undefined, assign1);

  update({ typed: 'tsn ', cursor: { start: 4, end: 4 } });
  test.is(   'IIIV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn', requ.commandAssignment.getValue().name);
  test.is(undefined, assign1);

  update({ typed: 'tsn x', cursor: { start: 5, end: 5 } });
  test.is(   'EEEVE', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn x', requ.commandAssignment.getArg().text);
  test.is(undefined, assign1);

  update({ typed: 'tsn dif', cursor: { start: 7, end: 7 } });
  test.is(   'VVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn dif', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());

  update({ typed: 'tsn dif ', cursor: { start: 8, end: 8 } });
  test.is(   'VVVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn dif', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());

  update({ typed: 'tsn dif x', cursor: { start: 9, end: 9 } });
  test.is(   'VVVVVVVVV', statuses);
  test.is(Status.VALID, status);
  test.is('tsn dif', requ.commandAssignment.getValue().name);
  test.is('x', assign1.getArg().text);
  test.is('x', assign1.getValue());

  update({ typed: 'tsn ext', cursor: { start: 7, end: 7 } });
  test.is(   'VVVVVVV', statuses);
  test.is(Status.ERROR, status);
  test.is('tsn ext', requ.commandAssignment.getValue().name);
  //test.is(undefined, assign1.getArg());
  //test.is(undefined, assign1.getValue());
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testHistory', ['require', 'exports', 'module' , 'test/assert', 'gcli/history'], function(require, exports, module) {

var test = require('test/assert');
var History = require('gcli/history').History;

exports.setup = function() {
};

exports.shutdown = function() {
};

exports.testSimpleHistory = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Adding to the history again moves us back to the start of the history.
  history.add('quux');
  test.is('quux', history.backward());
  test.is('bar', history.backward());
  test.is('foo', history.backward());
};

exports.testBackwardsPastIndex = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Moving backwards past recorded history just keeps giving you the last
  // item.
  test.is('foo', history.backward());
};

exports.testForwardsPastIndex = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Going forward through the history again.
  test.is('bar', history.forward());

  // 'Present' time.
  test.is('', history.forward());

  // Going to the 'future' just keeps giving us the empty string.
  test.is('', history.forward());
};

});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/testRequire', ['require', 'exports', 'module' , 'test/assert', 'gclitest/requirable'], function(require, exports, module) {

var test = require('test/assert');


exports.testWorking = function() {
  // There are lots of requirement tests that we could be doing here
  // The fact that we can get anything at all working is a testament to
  // require doing what it should - we don't need to test the
  var requireable = require('gclitest/requirable');
  test.is('thing1', requireable.thing1);
  test.is(2, requireable.thing2);
  test.is(undefined, requireable.thing3);
};

exports.testDomains = function() {
  var requireable = require('gclitest/requirable');
  test.is(undefined, requireable.status);
  requireable.setStatus(null);
  test.is(null, requireable.getStatus());
  test.is(undefined, requireable.status);
  requireable.setStatus('42');
  test.is('42', requireable.getStatus());
  test.is(undefined, requireable.status);

  if (define.Domain) {
    var domain = new define.Domain();
    var requireable2 = domain.require('gclitest/requirable');
    test.is(undefined, requireable2.status);
    test.is('initial', requireable2.getStatus());
    requireable2.setStatus(999);
    test.is(999, requireable2.getStatus());
    test.is(undefined, requireable2.status);

    test.is('42', requireable.getStatus());
    test.is(undefined, requireable.status);
  }
};

exports.testLeakage = function() {
  var requireable = require('gclitest/requirable');
  test.is(undefined, requireable.setup);
  test.is(undefined, requireable.shutdown);
  test.is(undefined, requireable.testWorking);
};

exports.testMultiImport = function() {
  var r1 = require('gclitest/requirable');
  var r2 = require('gclitest/requirable');
  test.is(r1, r2);
};

exports.testUncompilable = function() {
  // This test is commented out because it breaks the RequireJS module
  // loader and because it causes console output and because testing failure
  // cases such as this is something of a luxury
  // It's not totally clear how a module loader should perform with unusable
  // modules, however at least it should go into a flat spin ...
  // GCLI mini_require reports an error as it should
  /*
  if (define.Domain) {
    try {
      var unrequireable = require('gclitest/unrequirable');
      t.fail();
    }
    catch (ex) {
      console.error(ex);
    }
  }
  */
};

exports.testRecursive = function() {
  // See Bug 658583
  /*
  var recurse = require('gclitest/recurse');
  */
};


});
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define('gclitest/requirable', ['require', 'exports', 'module' ], function(require, exports, module) {

  exports.thing1 = 'thing1';
  exports.thing2 = 2;

  var status = 'initial';
  exports.setStatus = function(aStatus) { status = aStatus; };
  exports.getStatus = function() { return status; };

});
define("text!gcli/ui/images/closer.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAj9JREFUeNp0ks+LUlEUx7/vV1o8Z8wUx3IEHcQmiBiQlomjRNCiZpEuEqF/oEUwq/6EhvoHggmRcJUQBM1CRJAW0aLIaGQimZJxJsWxyV/P9/R1zzWlFl04vPvOPZ9z7rnnK5imidmKRCIq+zxgdoPZ1T/ut8xeM3tcKpW6s1hhBkaj0Qj7bDebTX+324WmadxvsVigqipcLleN/d4rFoulORiLxTZY8ItOp8MBCpYkiYPj8Xjus9vtlORWoVB4KcTjcQc732dLpSRXvCZaAws6Q4WDdqsO52kNH+oCRFGEz+f7ydwBKRgMPmTXi49GI1x2D/DsznesB06ws2eDbI7w9HYN6bVjvGss4KAjwDAMq81mM2SW5Wa/3weBbz42UL9uYnVpiO2Nr9ANHSGXib2Wgm9tCYIggGKJEVkvlwgi5/FQRmTLxO6hgJVzI1x0T/fJrBtHJxPeL6tI/fsZLA6ot8lkQi8HRVbw94gkWYI5MaHrOjcCGSNRxZosy9y5cErDzn0Dqx7gcwO8WtBp4PndI35GMYqiUMUvBL5yOBz8yRfFNpbPmqgcCFh/IuHa1nR/YXGM8+oUpFhihEQiwcdRLpfVRqOBtWXWq34Gra6AXq8Hp2piZcmKT4cKnE4nwuHwdByVSmWQz+d32WCTlHG/qaHHREN9kgi0sYQfv0R4PB4EAgESQDKXy72fSy6VSnHJVatVf71eR7vd5n66mtfrRSgU4pLLZrOlf7RKK51Ok8g3/yPyR5lMZi7y3wIMAME4EigHWgKnAAAAAElFTkSuQmCC");

define("text!gcli/ui/images/dot_clear.gif", [], "data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAEBMgA7");

define("text!gcli/ui/images/minus.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAAZiS0dEANIA0gDS7KbF4AAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGw4xMrIJw5EAAAHcSURBVCjPhZIxSxtxGMZ/976XhJA/RA5EAyJcFksnp64hjUPBoXRyCYLQTyD0UxScu0nFwalCQSgFCVk7dXAwUAiBDA2RO4W7yN1x9+9gcyhU+pteHt4H3pfncay1LOl0OgY4BN4Ar/7KP4BvwNFwOIyWu87S2O12O8DxfD73oygiSRIAarUaxhhWV1fHwMFgMBiWxl6v9y6Koi+3t7ckSUKtVkNVAcjzvNRWVlYwxry9vLz86uzs7HjAZDKZGGstjUaDfxHHMSLC5ubmHdB2VfVwNpuZ5clxHPMcRVFwc3PTXFtbO3RFZHexWJCmabnweAaoVqvlv4vFAhHZdVX1ZZqmOI5DURR8fz/lxbp9Yrz+7bD72SfPcwBU1XdF5N5aWy2KgqIoeBzPEnWVLMseYnAcRERdVR27rrsdxzGqyutP6898+GBsNBqo6i9XVS88z9sOggAR4X94noeqXoiIHPm+H9XrdYIgIAxDwjAkTVPCMESzBy3LMprNJr7v34nIkV5dXd2fn59fG2P2siwjSRIqlQrWWlSVJFcqlQqtVot2u40xZu/s7OxnWbl+v98BjkejkT+dTgmCoDxtY2ODra2tMXBweno6fNJVgP39fQN8eKbkH09OTsqS/wHFRdHPfTSfjwAAAABJRU5ErkJggg==");

define("text!gcli/ui/images/pinaction.png", [], "data:image/png;base64,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");

define("text!gcli/ui/images/pinin.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC7mlDQ1BJQ0MgUHJvZmlsZQAAeAGFVM9rE0EU/jZuqdAiCFprDrJ4kCJJWatoRdQ2/RFiawzbH7ZFkGQzSdZuNuvuJrWliOTi0SreRe2hB/+AHnrwZC9KhVpFKN6rKGKhFy3xzW5MtqXqwM5+8943731vdt8ADXLSNPWABOQNx1KiEWlsfEJq/IgAjqIJQTQlVdvsTiQGQYNz+Xvn2HoPgVtWw3v7d7J3rZrStpoHhP1A4Eea2Sqw7xdxClkSAog836Epx3QI3+PY8uyPOU55eMG1Dys9xFkifEA1Lc5/TbhTzSXTQINIOJT1cVI+nNeLlNcdB2luZsbIEL1PkKa7zO6rYqGcTvYOkL2d9H5Os94+wiHCCxmtP0a4jZ71jNU/4mHhpObEhj0cGDX0+GAVtxqp+DXCFF8QTSeiVHHZLg3xmK79VvJKgnCQOMpkYYBzWkhP10xu+LqHBX0m1xOv4ndWUeF5jxNn3tTd70XaAq8wDh0MGgyaDUhQEEUEYZiwUECGPBoxNLJyPyOrBhuTezJ1JGq7dGJEsUF7Ntw9t1Gk3Tz+KCJxlEO1CJL8Qf4qr8lP5Xn5y1yw2Fb3lK2bmrry4DvF5Zm5Gh7X08jjc01efJXUdpNXR5aseXq8muwaP+xXlzHmgjWPxHOw+/EtX5XMlymMFMXjVfPqS4R1WjE3359sfzs94i7PLrXWc62JizdWm5dn/WpI++6qvJPmVflPXvXx/GfNxGPiKTEmdornIYmXxS7xkthLqwviYG3HCJ2VhinSbZH6JNVgYJq89S9dP1t4vUZ/DPVRlBnM0lSJ93/CKmQ0nbkOb/qP28f8F+T3iuefKAIvbODImbptU3HvEKFlpW5zrgIXv9F98LZua6N+OPwEWDyrFq1SNZ8gvAEcdod6HugpmNOWls05Uocsn5O66cpiUsxQ20NSUtcl12VLFrOZVWLpdtiZ0x1uHKE5QvfEp0plk/qv8RGw/bBS+fmsUtl+ThrWgZf6b8C8/UXAeIuJAAAACXBIWXMAAAsTAAALEwEAmpwYAAABZ0lEQVQ4Ea2TPUsDQRCGZ89Eo4FACkULEQs1CH4Uamfjn7GxEYJFIFXgChFsbPwzNnZioREkaiHBQtEiEEiMRm/dZ8OEGAxR4sBxx877Pju7M2estTJIxLrNuVwuMxQEx0ZkzcFHyRtjXt02559RtB2GYanTYzoryOfz+6l4Nbszf2niwffKmpGRo9sVW22mDgqFwp5C2gDMm+P32a3JB1N+n5JifUGeP9JeNxGryPLYjcwMP8rJ07Q9fZltQzyAstOJ2vVu5sKc1ZZkRBrOcKeb+HexPidvkpCN5JUcllZtpZFc5DgBWc5M2eysZuMuofMBSA4NWjx4PUCsXefMlI0QY3ewRg4NWi4ZTQsgrjYXema+e4VqtEMK6KXvu+4B9Bklt90vVKMeD2BI6DOt4rZ/Gk7WyKFBi4fNPIAJY0joM61SCCZ9tI1o0OIB8D+DBIkYaJRbCBH9mZgNt+bb++ufSSF/eX8BYcDeAzuQJVUAAAAASUVORK5CYII=");

define("text!gcli/ui/images/pinout.png", [], "data:image/png;base64,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");

define("text!gcli/ui/images/pins.png", [], "data:image/png;base64,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");

define("text!gcli/ui/images/plus.png", [], "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAAXNSR0IArs4c6QAAAAZiS0dEANIA0gDS7KbF4AAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9kFGw4yFTwuJTkAAAH7SURBVCjPdZKxa1NRFMZ/956XZMgFyyMlCZRA4hBx6lBcQ00GoYi4tEstFPwLAs7iLDi7FWuHThaUggihBDI5OWRoQAmBQFISQgvvpbwX3rsOaR4K+o2H8zvfOZxPWWtZqVarGaAJPAEe3ZW/A1+Bd+1221v1qhW4vb1dA44mk0nZ8zyCIAAgk8lgjGF9fb0PHF5cXLQTsF6vP/c879P19TVBEJDJZBARAKIoSmpra2sYY561Wq3PqtFouMBgMBgYay3ZbJZ/yfd9tNaUSqUboOKISPPq6sqsVvZ9H4AvL34B8PTj/QSO45jpdHovn883Ha31znw+JwzDpCEMQx4UloM8zyOdTif3zudztNY7jog8DMMQpRRxHPPt5TCBAEZvxlyOFTsfykRRBICIlB2t9a21Nh3HMXEc8+d7VhJHWCwWyzcohdZaHBHpO46z6fs+IsLj94XECaD4unCHL8FsNouI/HRE5Nx13c3ZbIbWOnG5HKtl+53TSq7rIiLnand31wUGnU7HjEYjlFLJZN/3yRnL1FMYY8jlcmxtbd0AFel2u7dnZ2eXxpi9xWJBEASkUimstYgIQSSkUimKxSKVSgVjzN7p6emPJHL7+/s14KjX65WHwyGz2SxZbWNjg2q12gcOT05O2n9lFeDg4MAAr/4T8rfHx8dJyH8DvvbYGzKvWukAAAAASUVORK5CYII=");

define("text!gcli/ui/images/throbber.gif", [], "data:image/gif;base64,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");

