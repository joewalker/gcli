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

// Patch-up IE9
require('../util/legacy');

var originalCreateTerminal = exports.createTerminal;

/**
 * This is the equivalent of gcli/index.createTerminal() except it uses a remote
 * Requisition to actually execute the commands.
 */
exports.createRemoteTerminal = function(options) {
  options = options || {};

  // Bootstrapping is hard here because we need to add things in the correct
  // order, making remote calls as we go, so we have to do things by hand
  addConnector(require('./xhr').items);
  addConnector(require('./websocket').items);
  var connector = connectors.get(options.connector);

  return connector.connect(options.url).then(function(connection) {
    return connection.call('specs').then(function(specs) {
      var remoter = createRemoter(connection);

      var gcli = api.getApi();

      options.types = new Types();
      gcli.types = options.types;

      // First we need to add the local types which other types depend on
      gcli.addItems(require('../types/delegate').items);
      gcli.addItems(require('../types/selection').items);

      // These are the other local types (generally not depended on)
      gcli.addItems(require('../types/array').items);
      gcli.addItems(require('../types/boolean').items);
      gcli.addItems(require('../types/command').items);
      gcli.addItems(require('../types/date').items);
      gcli.addItems(require('../types/file').items);
      gcli.addItems(require('../types/number').items);
      gcli.addItems(require('../types/remote').items);
      gcli.addItems(require('../types/string').items);

      // Next add the remote types
      options.types.addProxyTypes(specs.types, connection);

      options.canon = new Canon(options);
      gcli.canon = options.canon;

      // Now the commands which depend on those types can be loaded
      options.canon.addProxyCommands(specs.commands, remoter);

      // Next the other client side parts of the command line
      gcli.addItems(require('../fields/delegate').items);
      gcli.addItems(require('../fields/selection').items);

      // gcli.addItems(require('../types/javascript').items);
      // gcli.addItems(require('../types/node').items);
      // gcli.addItems(require('../types/resource').items);
      // gcli.addItems(require('../types/setting').items);

      gcli.addItems(require('../converters/converters').items);
      gcli.addItems(require('../converters/basic').items);
      gcli.addItems(require('../converters/html').items);
      gcli.addItems(require('../converters/terminal').items);

      gcli.addItems(require('../languages/command').items);
      gcli.addItems(require('../languages/javascript').items);

      gcli.addItems(require('../ui/intro').items);
      gcli.addItems(require('../ui/focus').items);

      gcli.addItems(require('../cli').items);

      // Finally below are the commands that are loaded by the server
      // We don't want the commands, but do want the converters
      gcli.canon = { addCommand: function() {} };

      // The commands that are commented out are the commands that the server
      // does not support, and the ones which have no converters anyway (and
      // in some cases can't be loaded because they have server side deps

      // gcli.addItems(require('../commands/connect').items);
      gcli.addItems(require('../commands/clear').items);
      gcli.addItems(require('../commands/context').items);
      gcli.addItems(require('../commands/exec').items);
      // gcli.addItems(require('../commands/global').items);
      gcli.addItems(require('../commands/help').items);
      gcli.addItems(require('../commands/intro').items);
      // gcli.addItems(require('../commands/lang').items);
      gcli.addItems(require('../commands/preflist').items);
      gcli.addItems(require('../commands/pref').items);
      gcli.addItems(require('../commands/test').items);

      // gcli.addItems(require('../commands/demo/alert').items);
      // gcli.addItems(require('../commands/demo/bugs').items);
      // gcli.addItems(require('../commands/demo/demo').items);
      // gcli.addItems(require('../commands/demo/echo').items);
      // gcli.addItems(require('../commands/demo/edit').items);
      // gcli.addItems(require('../commands/demo/git').items);
      // gcli.addItems(require('../commands/demo/hg').items);
      // gcli.addItems(require('../commands/demo/sleep').items);

      // Commands using the Node API
      // gcli.addItems(require('../commands/server/exit').items);
      // gcli.addItems(require('../commands/server/firefox').items);
      // gcli.addItems(require('../commands/server/orion').items);
      // gcli.addItems(require('../commands/server/server').items);
      // gcli.addItems(require('../commands/server/standard').items);

      return gcli.createTerminal(options);
    });
  });
};

function addLocalTypes(types, items) {
  items.forEach(function(item) {
    types.addType(item);
  });
}

function addConnector(items) {
  items.forEach(function(item) {
    connectors.addConnector(item);
  });
}

/**
 *
 */
var createRemoter = function(connection) {
  return function(args, context) {
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
};
