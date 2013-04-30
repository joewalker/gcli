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

var l10n = require('util/l10n');
var types = require('gcli/types');
var canon = require('gcli/canon');
var connector = require('util/connect/connector');

/**
 * A lookup of the current connection
 */
var connections = {};

/**
 * 'connect' command
 */
var connect = {
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
      type: 'string',
      description: l10n.lookup('connectHostDesc'),
      defaultValue: 'localhost',
      option: true
    },
    {
      name: 'port',
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
    cxp.then(function(connection) {
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
      if (typed.indexOf(prefix) !== 0) {
        throw new Error("Missing prefix");
      }
      typed = typed.substring(prefix.length).replace(/^ */, "");

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
 * 'connection' type
 */
var connection = {
  name: 'connection',
  parent: 'selection',
  lookup: function() {
    return Object.keys(connections).map(function(prefix) {
      return { name: prefix, value: connections[prefix] };
    });
  }
};

/**
 * 'disconnect' command
 */
var disconnect = {
  name: 'disconnect',
  description: l10n.lookup('disconnectDesc'),
  manual: l10n.lookup('disconnectManual'),
  params: [
    {
      name: 'prefix',
      type: 'connection',
      description: l10n.lookup('disconnectPrefixDesc'),
    }
  ],
  returnType: 'string',

  exec: function(args, context) {
    return args.prefix.disconnect().then(function() {
      var removed = canon.removeProxyCommands(args.prefix.prefix);
      delete connections[args.prefix.prefix];
      return l10n.lookupFormat('disconnectReply', [ removed.length ]);
    });
  }
};


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.addType(connection);

  canon.addCommand(connect);
  canon.addCommand(disconnect);
};

exports.shutdown = function() {
  canon.removeCommand(connect);
  canon.removeCommand(disconnect);

  types.removeType(connection);
};


});
