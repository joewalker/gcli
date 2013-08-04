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

var main = require('../../../gcli');
var canon = main.require('gcli/canon');
var Status = main.require('gcli/types').Status;

var express = require('express');
var http = require('http');

var server = undefined;
var app = undefined;

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

      return "Server closing ...";
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
      app.use(express.static(main.gcliHome));

      if (args.allowexec) {
        allowexec.init(app, context);
      }

      server = http.createServer(app);

      if (args.websocket) {
        websocket.init(server, context);
      }

      server.on('error', function(error) {
        deferred.reject(error);
      });

      server.listen(args.port, args.host, undefined, function() {
        deferred.resolve('Serving GCLI to http://' + args.host + ':' + args.port + '/');
      });

      return deferred.promise;
    }
  }
];

/**
 * Code that exports the means to have a server side 'exec' command
 */
var host = main.require('util/host');
var fileparser = main.require('util/fileparser');
var xhr = main.require('util/xhr');

var allowexec = {
  init: function(app, context) {
    app.use(express.bodyParser());

    app.post('/exec', function(req, res) {
      var promise = host.exec({
        cmd: req.body.cmd,
        args: req.body.args,
        cwd: req.body.cwd,
        env: req.body.env
      });
      xhr.sendReply(promise, res);
    });

    app.post('/filesystem/parse', function(req, res) {
      var options = {
        filetype: req.body.filetype,
        existing: req.body.existing,
        matches: new RegExp(req.body.matches)
      };
      var promise = fileparser.parse(req.body.typed, options);
      promise = promise.then(function(reply) {
        reply.status = reply.status.toString();
        if (reply.predictor == null) {
          return reply;
        }

        return reply.predictor().then(function(predictions) {
          reply.predictor = undefined;
          reply.predictions = predictions;
          return reply;
        });
      });

      xhr.sendReply(promise, res);
    });
  }
};

/**
 * Functions to expose the 'connect' command over websockets
 */
var socketio = require('socket.io');

var websocket = {
  init: function(server, context) {
    this._io = socketio.listen(server);
    this._io.set('log level', 1);

    this._io.sockets.on('connection', function(socket) {
      // Tell the browser that we're up and running
      socket.emit('connected');

      // Execute a command locally for the remote system
      socket.on('execute', function(data) {
        var requisition = context.__dlhjshfw;
        requisition.update(data.typed).then(function() {
          if (requisition.status !== Status.VALID) {
            socket.emit('executed', {
              requestId: data.requestId,
              data: requisition.getStatusMessage(),
              type: 'string',
              error: true
            });
          }
          else {
            function transmit(output) {
              try {
                socket.emit('executed', {
                  requestId: data.requestId,
                  data: output.data,
                  type: output.type,
                  error: output.error
                });
              }
              catch (ex) {
                console.error(ex);
                socket.emit('executed', {
                  requestId: data.requestId,
                  data: ex.toString(),
                  type: 'string',
                  error: true
                });
              }
            }

            return requisition.exec().then(transmit, transmit);
          }
        }.bind(this));
      }.bind(this));

      // Tell the remote system what the local commands are
      socket.on('getCommandSpecs', function() {
        socket.emit('commandSpecs', {
          commandSpecs: canon.getCommandSpecs()
        });
      }.bind(this));
    }.bind(this));
  }
};
