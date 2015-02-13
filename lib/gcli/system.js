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

'use strict';

var Promise = require('./util/promise').Promise;
var Commands = require('./commands/commands').Commands;
var Connectors = require('./connectors/connectors').Connectors;
var Converters = require('./converters/converters').Converters;
var Fields = require('./fields/fields').Fields;
var Languages = require('./languages/languages').Languages;
var Settings = require('./settings').Settings;
var Types = require('./types/types').Types;

/**
 * This is the heart of the API that we expose to the outside.
 * @param options Object that customizes how the system acts. Valid properties:
 * - commands, connectors, converters, fields, languages, settings, types:
 *   Custom configured manager objects for these item types
 * - location: a system with a location will ignore commands that don't have a
 *   matching runAt property. This is principly for client/server setups where
 *   we import commands from the server to the client, so a system with
 *   `{ location: 'client' }` will silently ignore commands with
 *   `{ runAt: 'server' }`. Any system without a location will accept commands
 *   with any runAt property (including none).
 */
exports.createSystem = function(options) {
  options = options || {};
  var location = options.location;

  // The plural/singular thing may make you want to scream, but it allows us
  // to say components[getItemType(item)], so a lookup here (and below) saves
  // multiple lookups in the middle of the code
  var components = {
    connector: options.connectors || new Connectors(),
    converter: options.converters || new Converters(),
    field: options.fields || new Fields(),
    language: options.languages || new Languages(),
    type: options.types || new Types()
  };
  components.setting = new Settings(components.type);
  components.command = new Commands(components.type, location);

  var getItemType = function(item) {
    if (item.item) {
      return item.item;
    }
    // Some items are registered using the constructor so we need to check
    // the prototype for the the type of the item
    return (item.prototype && item.prototype.item) ?
           item.prototype.item : 'command';
  };

  var addItem = function(item) {
    try {
      components[getItemType(item)].add(item);
    }
    catch (ex) {
      console.error('While adding: ' + item.name);
      throw ex;
    }
  };

  var removeItem = function(item) {
    components[getItemType(item)].remove(item);
  };

  /**
   * loadableModules is a lookup of names to module loader functions (like
   * the venerable 'require') to which we can pass a name and get back a
   * JS object (or a promise of a JS object). This allows us to have custom
   * loaders to get stuff from the filesystem etc.
   */
  var loadableModules = {};

  /**
   * loadedModules is a lookup by name of the things returned by the functions
   * in loadableModules so we can track what we need to unload / reload.
   */
  var loadedModules = {};

  var unloadModule = function(name) {
    var existingModule = loadedModules[name];
    if (existingModule != null) {
      existingModule.items.forEach(removeItem);
    }
    delete loadedModules[name];
  };

  var loadModule = function(name) {
    var existingModule = loadedModules[name];
    unloadModule(name);

    // And load the new items
    try {
      var loader = loadableModules[name];
      return Promise.resolve(loader(name)).then(function(newModule) {
        if (existingModule === newModule) {
          return;
        }

        if (newModule == null) {
          throw 'Module \'' + name + '\' not found';
        }

        if (newModule.items == null || typeof newModule.items.forEach !== 'function') {
          console.log('Exported properties: ' + Object.keys(newModule).join(', '));
          throw 'Module \'' + name + '\' has no \'items\' array export';
        }

        newModule.items.forEach(addItem);

        loadedModules[name] = newModule;
      });
    }
    catch (ex) {
      console.error('Failed to load module ' + name + ': ' + ex);
      console.error(ex.stack);
    }
  };

  var pendingChanges = false;

  var system = {
    addItems: function(items) {
      items.forEach(addItem);
    },

    removeItems: function(items) {
      items.forEach(removeItem);
    },

    addItemsByModule: function(names, options) {
      options = options || {};
      if (typeof names === 'string') {
        names = [ names ];
      }
      names.forEach(function(name) {
        if (options.loader == null) {
          options.loader = function(name) {
            return require(name);
          };
        }
        loadableModules[name] = options.loader;

        if (options.delayedLoad) {
          pendingChanges = true;
        }
        else {
          loadModule(name).then(null, console.error);
        }
      });
    },

    removeItemsByModule: function(name) {
      delete loadableModules[name];
      unloadModule(name);
    },

    load: function() {
      if (!pendingChanges) {
        return Promise.resolve();
      }

      // clone loadedModules, so we can remove what is left at the end
      var modules = Object.keys(loadedModules).map(function(name) {
        return loadedModules[name];
      });

      var promises = Object.keys(loadableModules).map(function(name) {
        delete modules[name];
        return loadModule(name);
      });

      Object.keys(modules).forEach(unloadModule);
      pendingChanges = false;

      return Promise.all(promises);
    },

    toString: function() {
      return 'System [' +
             'commands:' + components.command.getAll().length + ', ' +
             'connectors:' + components.connector.getAll().length + ', ' +
             'converters:' + components.converter.getAll().length + ', ' +
             'fields:' + components.field.getAll().length + ', ' +
             'settings:' + components.setting.getAll().length + ', ' +
             'types:' + components.type.getTypeNames().length + ']';
    }
  };

  Object.defineProperty(system, 'commands', {
    get: function() { return components.command; },
    enumerable: true
  });

  Object.defineProperty(system, 'connectors', {
    get: function() { return components.connector; },
    enumerable: true
  });

  Object.defineProperty(system, 'converters', {
    get: function() { return components.converter; },
    enumerable: true
  });

  Object.defineProperty(system, 'fields', {
    get: function() { return components.field; },
    enumerable: true
  });

  Object.defineProperty(system, 'languages', {
    get: function() { return components.language; },
    enumerable: true
  });

  Object.defineProperty(system, 'settings', {
    get: function() { return components.setting; },
    enumerable: true
  });

  Object.defineProperty(system, 'types', {
    get: function() { return components.type; },
    enumerable: true
  });

  return system;
};

/**
 * Connect a local system with another at the other end of a connector
 */
exports.connectFront = function(system, front) {
  front.on('commandsChanged', function(specs) {
    syncItems(system, specs, front);
  });

  return front.specs().then(function(specs) {
    syncItems(system, specs, front);
    return system;
  });
};

/**
 * Remove the items in this system that came from a previous sync action, and
 * re-add them
 */
function syncItems(system, specs, front) {
  // Go through all the commands removing any that are associated with the given
  // front. The method of association is the hack in addLocalFunctions.
  system.commands.getAll().forEach(function(command) {
    if (command.front === front) {
      system.commands.remove(command);
    }
  });

  var remoteItems = addLocalFunctions(specs, front);
  system.addItems(remoteItems);
}

/**
 * Take the data from the 'specs' command (or the 'commandsChanged' event) and
 * add function to proxy the execution back over the front
 */
function addLocalFunctions(specs, front) {
  // Inject an 'exec' function into the commands, and the front into
  // all the remote types
  specs.forEach(function(commandSpec) {
    // HACK: Tack the front to the command so we know how to remove it
    // in syncItems() below
    commandSpec.front = front;

    // TODO: syncItems() doesn't remove types, so do we need this?
    commandSpec.params.forEach(function(param) {
      if (typeof param.type !== 'string') {
        param.type.front = front;
      }
    });

    if (!commandSpec.isParent) {
      commandSpec.exec = function(args, context) {
        var typed = (context.prefix ? context.prefix + ' ' : '') + context.typed;

        return front.execute(typed).then(function(reply) {
          var typedData = context.typedData(reply.type, reply.data);
          if (!reply.error) {
            return typedData;
          }
          else {
            throw typedData;
          }
        });
      };
    }

    commandSpec.isProxy = true;
  });

  return specs;
}
