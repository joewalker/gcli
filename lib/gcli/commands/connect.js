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

const l10n = require('../util/l10n');
const cli = require('../cli');
const GcliFront = require('../connectors/front').GcliFront;

/**
 * A lookup of the current connection
 */
const fronts = {};

/**
 * 'connection' type
 */
const connection = {
  item: 'type',
  name: 'connection',
  parent: 'selection',
  lookup: function() {
    return Object.keys(fronts)
                 .map(prefix => ({ name: prefix, value: fronts[prefix] }));
  }
};

/**
 * 'connector' type
 */
const connector = {
  item: 'type',
  name: 'connector',
  parent: 'selection',
  lookup: function(context) {
    const connectors = context.system.connectors;
    return connectors.getAll().map(c => ({ name: c.name, value: c }));
  }
};

/**
 * 'connect' command
 */
const connect = {
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
      name: 'method',
      short: 'm',
      type: 'connector',
      description: l10n.lookup('connectMethodDesc'),
      defaultValue: null,
      option: true
    },
    {
      name: 'url',
      short: 'u',
      type: 'string',
      description: l10n.lookup('connectUrlDesc'),
      defaultValue: null,
      option: true
    }
  ],
  returnType: 'string',

  exec: function(args, context) {
    if (fronts[args.prefix] != null) {
      throw new Error(l10n.lookupFormat('connectDupReply', [ args.prefix ]));
    }

    args.method = args.method || context.system.connectors.get('xhr');

    return GcliFront.create(args.method, args.url).then(front => {
      // Nasty: stash the prefix on the front to help us tidy up
      front.prefix = args.prefix;
      fronts[args.prefix] = front;

      return front.specs().then(specs => {
        const remoter = this.createRemoter(args.prefix, front);
        const commands = cli.getMapping(context).requisition.system.commands;
        commands.addProxyCommands(specs, remoter, args.prefix, args.url);

        // TODO: We should add type proxies here too

        // commandSpecs doesn't include the parent command that we added
        return l10n.lookupFormat('connectReply',
                                 [ Object.keys(specs).length + 1 ]);
      });
    });
  },

  /**
   * When we register a set of remote commands, we need to provide a proxy
   * executor. This is that executor.
   */
  createRemoter: function(prefix, front) {
    return (cmdArgs, context) => {
      let typed = context.typed;

      // If we've been called using a 'context' then there will be no prefix
      // otherwise we need to remove it
      if (typed.indexOf(prefix) === 0) {
        typed = typed.substring(prefix.length).replace(/^ */, '');
      }

      return front.execute(typed).then(reply => {
        const typedData = context.typedData(reply.type, reply.data);
        if (!reply.error) {
          return typedData;
        }
        else {
          throw typedData;
        }
      });
    };
  }
};

/**
 * 'disconnect' command
 */
const disconnect = {
  item: 'command',
  name: 'disconnect',
  description: l10n.lookup('disconnectDesc2'),
  manual: l10n.lookup('disconnectManual2'),
  params: [
    {
      name: 'prefix',
      type: 'connection',
      description: l10n.lookup('disconnectPrefixDesc')
    }
  ],
  returnType: 'string',

  exec: function(args, context) {
    const front = args.prefix;
    return front.connection.disconnect().then(() => {
      const commands = cli.getMapping(context).requisition.system.commands;
      const removed = commands.removeProxyCommands(front.prefix);
      delete fronts[front.prefix];
      return l10n.lookupFormat('disconnectReply', [ removed.length ]);
    });
  }
};

exports.items = [ connection, connector, connect, disconnect ];
