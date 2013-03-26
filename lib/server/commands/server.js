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

    server.on('error', function(error) {
      deferred.reject(error);
    });
    server.listen(args.port, args.host, undefined, function() {
      deferred.resolve('Serving GCLI to http://' + args.host + ':' + args.port + '/');
    });

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

