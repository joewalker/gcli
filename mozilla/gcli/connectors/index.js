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

var api = require('../api');
var connectors = require('./connectors');
var Canon = require('../canon').Canon;
var Types = require('../types').Types;

/**
 * The set of basic types that we'll need everywhere, even in a setup that
 * remotes everything
 */
var basicTypes = [
  // First we need to add the local types which other types depend on
  require('../types/delegate').items,
  require('../types/selection').items,

  // These are the other local types (generally not depended on)
  require('../types/array').items,
  require('../types/boolean').items,
  require('../types/command').items,
  require('../types/date').items,
  require('../types/file').items,
  require('../types/number').items,
  require('../types/string').items

].reduce(function(prev, curr) { return prev.concat(curr); }, []);

/**
 * This is the set of items that you
 */
var clientItems = [
  require('./direct').items,
  require('./xhr').items,
  require('./websocket').items,

  require('../fields/delegate').items,
  require('../fields/selection').items,

  require('../converters/converters').items,
  require('../converters/basic').items,
  require('../converters/html').items,
  require('../converters/terminal').items,

  require('../languages/command').items,
  require('../languages/javascript').items,

  require('../ui/intro').items,
  require('../ui/focus').items,

].reduce(function(prev, curr) { return prev.concat(curr); }, []);

/**
 * These are the commands stored on the remote side that have converters which
 * we'll need to present the data
 */
var remoteCommandsWithConverters = [
  require('../cli').items,
  require('../commands/clear').items,
  require('../commands/context').items,
  require('../commands/exec').items,
  require('../commands/help').items,
  require('../commands/intro').items,
  require('../commands/preflist').items,
  require('../commands/pref').items,
  require('../commands/test').items

].reduce(function(prev, curr) { return prev.concat(curr); }, []);

/**
 * This is the equivalent of gcli/index.createTerminal() except it uses a remote
 * Requisition to actually execute the commands.
 */
exports.createRemoteTerminal = function(options) {
  options = options || {};

  var gcli = api.getApi();

  options.types = gcli.types = new Types();
  options.canon = gcli.canon = new Canon({ types: gcli.types });

  gcli.addItems(basicTypes);
  gcli.addItems(clientItems);

  var connector = connectors.get(options.connector);
  return connector.connect(options.url).then(function(connection) {
    return exports.fetchRemoteItems(connection).then(function(remoteItems) {
      gcli.addItems(remoteItems);

      // We remote commands and types, but converters can't be remoted yet so
      // we load them here by loading the server command set and ignoring the
      // actual commands
      gcli.canon = { addCommand: function() {} };
      gcli.addItems(remoteCommandsWithConverters);
    }).then(function() {
      return gcli.createTerminal(options);
    });
  });
};

exports.fetchRemoteItems = function(connection) {
  return connection.call('specs').then(function(specs) {

    // Inject an 'exec' function into the commands
    specs.commands.forEach(function(commandSpec) {
      if (!commandSpec.isParent) {
        commandSpec.exec = function(args, context) {
          var data = {
            typed: context.typed,
            args: args
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

    return specs.types.concat(specs.commands);
  });
};
