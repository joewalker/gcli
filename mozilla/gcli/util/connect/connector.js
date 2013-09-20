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

var debuggerSocketConnect = Components.utils.import('resource://gre/modules/devtools/dbg-client.jsm', {}).debuggerSocketConnect;
var DebuggerClient = Components.utils.import('resource://gre/modules/devtools/dbg-client.jsm', {}).DebuggerClient;

var promise = require('gcli/util/promise');

/**
 * What port should we use by default?
 */
Object.defineProperty(exports, 'defaultPort', {
  get: function() {
    var Services = Components.utils.import('resource://gre/modules/Services.jsm', {}).Services;
    try {
      return Services.prefs.getIntPref('devtools.debugger.chrome-debugging-port');
    }
    catch (ex) {
      console.error('Can\'t use default port from prefs. Using 9999');
      return 9999;
    }
  },
  enumerable: true
});


/**
 * Create a Connection object and initiate a connection.
 */
exports.connect = function(prefix, host, port) {
  var connection = new Connection(prefix, host, port);
  return connection.connect().then(function() {
    return connection;
  });
};

/**
 * Manage a named connection to an HTTP server over web-sockets using socket.io
 */
function Connection(prefix, host, port) {
  this.prefix = prefix;
  this.host = host;
  this.port = port;

  // Properties setup by connect()
  this.actor = undefined;
  this.transport = undefined;
  this.client = undefined;

  this.requests = {};
  this.nextRequestId = 0;
}

/**
 * Setup socket.io, retrieve the list of remote commands and register them with
 * the local canon.
 * @return a promise which resolves (to undefined) when the connection is made
 * or is rejected (with an error message) if the connection fails
 */
Connection.prototype.connect = function() {
  var deferred = promise.defer();

  this.transport = debuggerSocketConnect(this.host, this.port);
  this.client = new DebuggerClient(this.transport);

  this.client.connect(function() {
    this.client.listTabs(function(response) {
      this.actor = response.gcliActor;
      deferred.resolve();
    }.bind(this));
  }.bind(this));

  return deferred.promise;
};

/**
 * Retrieve the list of remote commands.
 * @return a promise of an array of commandSpecs
 */
Connection.prototype.getCommandSpecs = function() {
  var deferred = promise.defer();

  var request = { to: this.actor, type: 'getCommandSpecs' };

  this.client.request(request, function(response) {
    deferred.resolve(response.commandSpecs);
  });

  return deferred.promise;
};

/**
 * Send an execute request. Replies are handled by the setup in connect()
 */
Connection.prototype.execute = function(typed, cmdArgs) {
  var request = new Request(this.actor, typed, cmdArgs);
  this.requests[request.json.requestId] = request;

  this.client.request(request.json, function(response) {
    var request = this.requests[response.requestId];
    delete this.requests[response.requestId];

    request.complete(response.error, response.type, response.data);
  }.bind(this));

  return request.promise;
};

exports.disconnectSupportsForce = false;

/**
 * Kill this connection
 */
Connection.prototype.disconnect = function(force) {
  var deferred = promise.defer();

  this.client.close(function() {
    deferred.resolve();
  });

  return deferred.promise;
};

/**
 * A Request is a command typed at the client which lives until the command
 * has finished executing on the server
 */
function Request(actor, typed, args) {
  this.json = {
    to: actor,
    type: 'execute',
    typed: typed,
    args: args,
    requestId: 'id-' + Request._nextRequestId++,
  };

  this._deferred = promise.defer();
  this.promise = this._deferred.promise;
}

Request._nextRequestId = 0;

/**
 * Called by the connection when a remote command has finished executing
 * @param error boolean indicating output state
 * @param type the type of the returned data
 * @param data the data itself
 */
Request.prototype.complete = function(error, type, data) {
  this._deferred.resolve({
    error: error,
    type: type,
    data: data
  });
};
