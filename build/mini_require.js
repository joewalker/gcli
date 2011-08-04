/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

(function() {

// There are 2 virtually identical copies of this code:
// - $GCLI_HOME/build/prefix-gcli.jsm
// - $GCLI_HOME/build/mini_require.js
// They should both be kept in sync

var debugDependencies = false;

/**
 * Define a module along with a payload.
 * @param {string} moduleName Name for the payload
 * @param {ignored} deps Ignored. For compatibility with CommonJS AMD Spec
 * @param {function} payload Function with (require, exports, module) params
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

  if (debugDependencies) {
    console.log("define: " + moduleName + " -> " + payload.toString()
        .slice(0, 40).replace(/\n/, '\\n').replace(/\r/, '\\r') + "...");
  }

  if (moduleName in define.modules) {
    console.error(this.depth + " Error: Redefining module: " + moduleName);
  }
  define.modules[moduleName] = payload;
};

/**
 * The global store of un-instantiated modules
 */
define.modules = {};


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

  if (debugDependencies) {
    this.depth = "";
  }
}

/**
 * Lookup module names and resolve them by calling the definition function if
 * needed.
 * There are 2 ways to call this, either with an array of dependencies and a
 * callback to call when the dependencies are found (which can happen
 * asynchronously in an in-page context) or with a single string an no callback
 * where the dependency is resolved synchronously and returned.
 * The API is designed to be compatible with the CommonJS AMD spec and
 * RequireJS.
 * @param {string[]|string} deps A name, or names for the payload
 * @param {function|undefined} callback Function to call when the dependencies
 * are resolved
 * @return {undefined|object} The module required or undefined for
 * array/callback method
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
 * @param {string} moduleName A name for the payload to lookup
 * @return {object} The module specified by aModuleName or null if not found.
 */
Domain.prototype.lookup = function(moduleName) {
  if (moduleName in this.modules) {
    var module = this.modules[moduleName];
    if (debugDependencies) {
      console.log(this.depth + " Using module: " + moduleName);
    }
    return module;
  }

  if (!(moduleName in define.modules)) {
    console.error(this.depth + " Missing module: " + moduleName);
    return null;
  }

  var module = define.modules[moduleName];

  if (debugDependencies) {
    console.log(this.depth + " Compiling module: " + moduleName);
  }

  if (typeof module == "function") {
    if (debugDependencies) {
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

    if (debugDependencies) {
      this.depth = this.depth.slice(0, -1);
    }
  }

  // cache the resulting module object for next time
  this.modules[moduleName] = module;

  return module;
};

/**
 * Expose the Domain constructor and a global domain (on the define function
 * to avoid exporting more than we need. This is a common pattern with require
 * systems)
 */
define.Domain = Domain;
define.globalDomain = new Domain();

/**
 * Expose a default require function which is the require of the global
 * sandbox to make it easy to use.
 */
window.define = define;
window.require = define.globalDomain.require.bind(define.globalDomain);

})();
