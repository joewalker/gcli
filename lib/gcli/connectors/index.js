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

var createSystem = require('../system').createSystem;
var Commands = require('../commands/commands').Commands;
var Types = require('../types/types').Types;

// Patch-up IE9
require('../util/legacy');

/**
 *
 */
var items = [
  require('../items/basic').items,
  require('../items/ui').items,
  require('../items/remote').items,

  // TODO: why is this here?
  require('../commands/context').items,

].reduce(function(prev, curr) { return prev.concat(curr); }, []);

/**
 * These are the commands stored on the remote side that have converters which
 * we'll need to present the data. Ideally connection.specs would transfer
 * these, that doesn't happen yet so we add them manually
 */
var requiredConverters = [
  require('../cli').items,

  require('../commands/clear').items,
  require('../commands/connect').items,
  require('../commands/exec').items,
  require('../commands/global').items,
  require('../commands/help').items,
  require('../commands/intro').items,
  require('../commands/lang').items,
  require('../commands/preflist').items,
  require('../commands/pref').items,
  require('../commands/test').items,

].reduce(function(prev, curr) { return prev.concat(curr); }, [])
 .filter(function(item) { return item.item === 'converter'; });

/**
 * Connect to a remote system and setup the commands/types/converters etc needed
 * to make it all work
 */
exports.connect = function(options) {
  options = options || {};

  var system = createSystem();
  system.addItems(items);
  system.addItems(requiredConverters);

  var connector = system.connectors.get(options.connector);
  return connector.connect(options.url).then(function(connection) {
    system.connection = connection;
    connection.on('commandsChanged', function(specs) {
      exports.addItems(system, specs, connection);
    });

    return connection.call('specs').then(function(specs) {
      exports.addItems(system, specs, connection);
      return system;
    });
  });
};

exports.addItems = function(system, specs, connection) {
  exports.removeRemoteItems(system, connection);
  var remoteItems = exports.addLocalFunctions(specs, connection);
  system.addItems(remoteItems);
};

/**
 * Take the data from the 'specs' command (or the 'commandsChanged' event) and
 * add function to proxy the execution back over the connection
 */
exports.addLocalFunctions = function(specs, connection) {
  // Inject an 'exec' function into the commands, and the connection into
  // all the remote types
  specs.forEach(function(commandSpec) {
    // HACK: Tack the connection to the command so we know how to remove it
    // in removeRemoteItems() below
    commandSpec.connection = connection;

    // TODO: removeRemoteItems() doesn't remove types, so do we need this?
    commandSpec.params.forEach(function(param) {
      if (typeof param.type !== 'string') {
        param.type.connection = connection;
      }
    });

    if (!commandSpec.isParent) {
      commandSpec.exec = function(args, context) {
        var data = {
          typed: (context.prefix ? context.prefix + ' ' : '') + context.typed
        };

        return connection.call('execute', data).then(function(reply) {
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
};

exports.removeRemoteItems = function(system, connection) {
  system.commands.getAll().forEach(function(command) {
    if (command.connection === connection) {
      system.commands.remove(command);
    }
  });
};
