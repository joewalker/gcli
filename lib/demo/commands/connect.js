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

var gcli = require('gcli/index');
var canon = require('gcli/canon');

/**
 * 'connect' command
 */
var connect = {
  name: 'connect',
  description: 'Connect to node server',
  params: [
    {
      name: 'name',
      type: 'string',
      description: 'Parent name for imported commands',
    },
    {
      name: 'port',
      type: { name: 'number', max: 65536, min: 0 },
      description: 'The TCP port to listen on',
      defaultValue: 9999,
      option: true
    },
    {
      name: 'host',
      type: 'string',
      description: 'The hostname to bind to',
      defaultValue: 'localhost',
      option: true
    }
  ],
  returnType: 'string',

  nextRequestId: 0,
  requests: {},
  socket: undefined,
  script: undefined,

  exec: function(args, context) {
    if (this.socket != null) {
      throw new Error('Already connected');
    }

    var deferred = context.defer();

    this.script = context.document.createElement('script');
    this.script.src = '/socket.io/socket.io.js';
    this.script.addEventListener('load', function() {
      this.socket = io.connect('http://localhost');
      this.setupSocket();

      // On first connection ask for the remote command-specs
      this.socket.on('connected', function(data) {
        this.socket.emit('getCommandSpecs');
      }.bind(this));

      // When we have the remote command specs, add them locally
      this.socket.on('commandSpecs', function(data) {
        var remoter = this.createRemoter(args.name);
        canon.addProxyCommands(args.name, data.commandSpecs, remoter);

        var numCmds = Object.keys(data.commandSpecs).length;
        deferred.resolve("Added " + numCmds + " commands.");
      }.bind(this));
    }.bind(this));
    context.document.head.appendChild(this.script);

    return deferred.promise;
  },

  setupSocket: function() {
    // We're being passed execution results
    this.socket.on('executed', function(data) {
      var request = this.requests[data.id];
      if (request == null) {
        throw new Error('Unknown request id \'' + data.id + '\'. Ignoring.');
      }

      var typedData = request.context.typedData(data.type, data.data);
      if (!request.error) {
        request.deferred.resolve(typedData);
      }
      else {
        request.deferred.reject(typedData);
      }

      delete this.requests[data.id];
    }.bind(this));
  },

  createRemoter: function(prefix) {
    return function(cmdArgs, context) {
      var deferred = context.defer();

      var typed = context.typed;
      if (typed.indexOf(prefix) !== 0) {
        throw new Error("Missing prefix");
      }
      typed = typed.substring(prefix.length).replace(/^ */, "");

      var request = {
        id: this.nextRequestId++,
        typed: typed,
        args: cmdArgs
      };

      this.socket.emit('execute', request);

      request.deferred = deferred;
      request.context = context;
      this.requests[request.id] = request;

      return deferred.promise;
    }.bind(this);
  }
};


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(connect);
};

exports.shutdown = function() {
  gcli.removeCommand(connect);
};


});
