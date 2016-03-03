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

const util = require('../../util/util');
const Remoter = require('../../connectors/remoted').Remoter;
const websocketserver = require('../../connectors/websocketserver');

const cli = require('../../cli');

const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

let server;
let app;

exports.items = [
  {
    // 'server' parent command
    item: 'command',
    name: 'server',
    description: 'Control the built-in HTTP server'
  },
  {
    // 'server stop' command
    item: 'command',
    name: 'server stop',
    description: 'Stop the built-in HTTP server',
    returnType: 'string',
    params: [ ],
    exec: function(args, context) {
      if (server == null) {
        throw new Error('The server not running');
      }

      server.close();
      server = undefined;
      app = undefined;

      return 'Server closing ...';
    }
  },
  {
    // 'server start' command
    item: 'command',
    name: 'server start',
    description: 'Start the built-in HTTP server',
    returnType: 'string',
    params: [
      {
        name: 'port',
        type: { name: 'number', max: 65536, min: 0 },
        description: 'The TCP port to listen on',
        defaultValue: 9999
      },
      {
        name: 'host',
        type: 'string',
        description: 'The hostname to bind to',
        defaultValue: 'localhost'
      },
      {
        name: 'xhr',
        type: 'boolean',
        description: 'Enable command execution over XHR'
      },
      {
        name: 'websocket',
        type: 'boolean',
        description: 'Enable command execution over websockets'
      }
    ],
    exec: function(args, context) {
      const gcliHome = path.dirname(require.main.filename);
      if (server != null) {
        throw new Error('The server is already running');
      }

      // Lookup from URL to position within node_modules
      const lookup = {
        '/lib/es6-promise.js': 'es6-promise/dist/es6-promise.js',
        '/lib/socket.io-client.js': 'socket.io-client/socket.io.js'
      };

      return new Promise((resolve, reject) => {
        app = express();
        app.use(morgan('dev'));

        Object.keys(lookup).forEach(url => {
          app.get(url, (req, res) => {
            const filename = gcliHome + '/node_modules/' + lookup[url];
            const contents = fs.readFileSync(filename, 'utf8');

            res.type('application/javascript');
            res.send(contents);
          });
        });

        app.use('/lib', (req, res) => {
          let filename = gcliHome + '/lib' + url.parse(req.url).pathname;
          const webOverride = filename.replace(/\/lib\/gcli\//, '/web/gcli/');

          if (fs.existsSync(webOverride)) {
            filename = webOverride;
          }
          let contents = fs.readFileSync(filename, 'utf8');

          if (filename.match(/\.js$/)) {
            contents = contents.replace(/(["'](do not )?use strict[\"\'];)/,
                '$1 define(function(require, exports, module) {');
            contents += '\n});\n';
          }

          res.type('application/javascript');
          res.send(contents);
        });
        app.use(express.static(gcliHome));

        if (args.xhr) {
          xhrsocket.init(app, context);
        }

        server = http.createServer(app);

        if (args.websocket) {
          websocketserver.init(server, context);
        }

        server.on('error', error => reject(error));

        server.listen(args.port, args.host, undefined, () => {
          resolve('Serving GCLI to http://' + args.host + ':' + args.port + '/\n');
        });
      });
    }
  }
];

/**
 * Code that exports the means to have a server side 'exec' command
 */
const xhrsocket = {
  init: function(app, context) {
    const jsonParser = bodyParser.json();
    app.use(jsonParser);

    const requisition = cli.getMapping(context).requisition;
    const remoter = new Remoter(requisition);

    Object.keys(remoter.exposed).forEach(command => {
      app.use('/' + command, (req, res) => {
        const func = remoter.exposed[command];
        const reply = func.call(remoter, req.body);

        // Counterpart to xhr.js/connection.call that takes JSON-able data from
        // a promise and sends it across XHR.
        const onResolve = data => {
          const text = stringify(data, command);
          res.send(text);
        };

        const onReject = data => {
          if (data.code == null) {
            data = { code: -1, data: data };
          }
          util.errorHandler(data);
          const text = stringify(data, 'error_' + command);
          res.status(500).send(text);
        };

        return Promise.resolve(reply).then(onResolve).catch(onReject);
      });
    });
  }
};

/**
 * A wrapper around JSON.stringify to fail gracefully
 */
function stringify(data, action) {
  try {
    return JSON.stringify(data);
  }
  catch (ex) {
    console.error('Performing "' + action + '". Failed to stringify', data);
    util.errorHandler(ex);

    data = {
      code: -1,
      data: ex.toString()
    };
    return JSON.stringify(data);
  }
}
