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

var Promise = require('util/promise');

/**
 * The ability to add functionality by adding a new script tag is specific to
 * a browser, so this code is not going to work in NodeJS/Firefox etc.
 * We export the document that we are using so multi-frame environments can
 * update the default document
 */
exports.document = document;

/**
 * Create a new Connection and begin the connect process so the connection
 * object can't be used until it is connected.
 */
exports.connect = function(prefix, host, port) {
  var connection = new Connection(prefix, host, port);
  return connection.connect().then(function() {
    return connection;
  });
};

/**
 * What port should we use by default?
 */
exports.defaultPort = 9999;

/**
 * Manage a named connection to an HTTP server over web-sockets using socket.io
 */
function Connection(prefix, host, port) {
  this.prefix = prefix;
  this.host = host;
  this.port = port;

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
  var deferred = Promise.defer();

  this.script = exports.document.createElement('script');
  this.script.src = '/socket.io/socket.io.js';

  this.script.addEventListener('load', function() {
    this.socket = io.connect('http://' + this.host + ':' + this.port);

    // We're being passed execution results
    this.socket.on('executed', function(data) {
      var request = this.requests[data.requestId];
      if (request == null) {
        throw new Error('Unknown requestId \'' + data.requestId + '\'');
      }
      request.complete(data.error, data.type, data.data);
      delete this.requests[data.requestId];
    }.bind(this));

    // On first connection ask for the remote command-specs
    this.socket.on('connected', function(data) {
      deferred.resolve();
    }.bind(this));
  }.bind(this));

  exports.document.head.appendChild(this.script);

  return deferred.promise;
};

/**
 * Retrieve the list of remote commands.
 * @return a promise of an array of commandSpecs
 */
Connection.prototype.getCommandSpecs = function() {
  var deferred = Promise.defer();

  // When we have the remote command specs, add them locally
  this.socket.once('commandSpecs', function(data) {
    deferred.resolve(data.commandSpecs);
  }.bind(this));

  this.socket.emit('getCommandSpecs');

  return deferred.promise;
};

/**
 * Send an execute request. Replies are handled by the setup in connect()
 */
Connection.prototype.execute = function(typed, cmdArgs) {
  var request = new Request(typed, cmdArgs);
  this.requests[request.json.requestId] = request;

  this.socket.emit('execute', request.json);

  return request.promise;
};

exports.disconnectSupportsForce = true;

/**
 * Kill this connection
 */
Connection.prototype.disconnect = function(force) {
  if (!force) {
    if (Object.keys(this.requests).length !== 0) {
      var names = Object.keys(this.requests).map(function(key) {
        return this.requests[key].json.typed;
      }.bind(this)).join(', ');

      var msg = l10n.lookupFormat('disconnectOutstanding', [ names ]);
      return Promise.reject(msg);
    }
  }

  this.socket.disconnect();
  this.script.parentNode.removeChild(this.script);

  return Promise.resolve();
};


/**
 * A Request is a command typed at the client which lives until the command
 * has finished executing on the server
 */
function Request(typed, args) {
  this.json = {
    requestId: 'id-' + Request._nextRequestId++,
    typed: typed,
    args: args
  };

  this._deferred = Promise.defer();

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


});
