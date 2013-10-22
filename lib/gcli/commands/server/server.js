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

var promise = require('../../util/promise');
var remoted = require('../../connectors/remoted');
var remote = require('../../connectors/xhr');

var main = require('../../../../gcli');

var express = require('express');
var http = require('http');
var url = require('url');
var fs = require('fs');

var server;
var app;

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
        name: 'allowexec',
        type: 'boolean',
        description: 'Enable remote command execution'
      },
      {
        name: 'websocket',
        type: 'boolean',
        description: 'Enable the command proxy'
      }
    ],
    exec: function(args, context) {
      if (server != null) {
        throw new Error('The server is already running');
      }

      var deferred = context.defer();

      app = express();
      app.use(express.logger('dev'));

      app.use('/lib', function(req, res, next) {
        var filename = main.gcliHome + '/lib' + url.parse(req.url).pathname;
        var webOverride = filename.replace(/\/lib\/gcli\//, '/web/gcli/');

        if (fs.existsSync(webOverride)) {
          filename = webOverride;
        }
        var contents = fs.readFileSync(filename, 'utf8');

        if (filename.match(/\.js$/)) {
          contents = contents.replace(/(["'](do not )?use strict[\"\'];)/,
              '$1 define(function(require, exports, module) {');
          contents += '\n});\n';
        }

        res.type('application/javascript');
        res.send(contents);
      });
      app.use(express.static(main.gcliHome));

      if (args.allowexec && !args.websocket) {
        xhrsocket.init(app, context);
      }

      server = http.createServer(app);

      if (args.allowexec && args.websocket) {
        websocket.init(server, context);
      }

      server.on('error', function(error) {
        deferred.reject(error);
      });

      server.listen(args.port, args.host, undefined, function() {
        var msg = 'Serving GCLI to http://' + args.host + ':' + args.port + '/\n' +
                  '  To run unit tests against this server use\n' +
                  '  $ node gcli.js test && phantomjs ./phantom-test.js';
        deferred.resolve(msg);
      });

      return deferred.promise;
    }
  }
];

/**
 * Code that exports the means to have a server side 'exec' command
 */
var xhrsocket = {
  init: function(app, context) {
    app.use(express.bodyParser());

    Object.keys(remoted).forEach(function(command) {
      app.use('/' + command, function(req, res) {
        var reply = remoted[command](context, req.body);
        remote.reply(reply, res);
      });
    });
  }
};

/**
 * Functions to expose the 'connect' command over web-sockets
 */
var socketio = require('socket.io');

var websocket = {
  init: function(server, context) {
    this._io = socketio.listen(server);
    this._io.set('log level', 1);

    this._io.sockets.on('connection', function(socket) {
      // Tell the browser that we're up and running
      socket.emit('connected');

      Object.keys(remoted).forEach(function(command) {
        socket.on(command, function(request) {
          var reply = remoted[command](context, request);
          promise.resolve(reply).then(function(data) {
            try {
              socket.emit('reply', {
                id: request.id,
                reply: data
              });
            }
            catch (ex) {
              console.error(ex);
              socket.emit('reply', {
                id: request.id,
                exception: ex.toString()
              });
            }
          });
        });
      });
    });
  }
};
