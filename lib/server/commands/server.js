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
var gcli = main.require('gcli/index');
var canon = main.require('gcli/canon');
var converters = main.require('gcli/converters');
var Status = main.require('gcli/types').Status;

var express = require('express');
var http = require('http');

var server = undefined;
var app = undefined;

/**
 * 'server' parent command
 */
var serverCmdSpec = {
  name: 'server',
  description: 'Control the built-in HTTP server'
};

/**
 * 'server start' command
 */
var serverStartCmdSpec = {
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
      name: 'commands',
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

    server = http.createServer(app);

    var io = undefined;
    if (args.commands) {
      io = require('socket.io').listen(server);
    }

    server.on('error', function(error) {
      deferred.reject(error);
    });
    server.listen(args.port, args.host, undefined, function() {
      deferred.resolve('Serving GCLI to http://' + args.host + ':' + args.port + '/');
    });

    if (args.commands) {
      io.sockets.on('connection', function(socket) {
        // Tell the browser that we're up and running
        socket.emit('connected');

        // Execute a command locally for the remote system
        socket.on('execute', function(data) {
          console.log('execute', data);

          var requisition = context.__dlhjshfw;
          requisition.update(data.typed).then(function() {
            if (requisition.getStatus() !== Status.VALID) {
              socket.emit('executed', {
                id: data.id,
                data: 'Invalid command "' + command + '"',
                type: 'string',
                error: true
              });
            }
            else {
              var output = requisition.exec();

              function transmit() {
                try {
                  console.log('executed: ', data.id);
                  socket.emit('executed', {
                    id: data.id,
                    data: output.data,
                    type: output.type,
                    error: output.error
                  });
                }
                catch (ex) {
                  console.error(ex);
                  socket.emit('executed', {
                    id: data.id,
                    data: ex.toString(),
                    type: 'string',
                    error: true
                  });
                }
              }

              return output.promise.then(transmit, transmit);
            }
          }.bind(this));
        }.bind(this));

        // Tell the remote system what the local commands are
        socket.on('getCommandSpecs', function(data) {
          console.log('getCommandSpecs', data);

          socket.emit('commandSpecs', {
            commandSpecs: canon.getCommandSpecs()
          });
        }.bind(this));
      }.bind(this));
    }

    return deferred.promise;
  }
};

/**
 * 'server stop' command
 */
var serverStopCmdSpec = {
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
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(serverCmdSpec);
  gcli.addCommand(serverStartCmdSpec);
  gcli.addCommand(serverStopCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(serverStopCmdSpec);
  gcli.removeCommand(serverStartCmdSpec);
  gcli.removeCommand(serverCmdSpec);
};

