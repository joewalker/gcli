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

var promise = require('../util/promise');
var util = require('../util/util');

exports.items = [
  {
    // Communicate with a remote server over XMLHttpRequest
    item: 'connector',
    name: 'websocket',

    connect: function(host, port) {
      var connection = new WebsocketConnection(host, port);
      return connection.connect();
    }
  }
];

/**
 * The ability to add functionality by adding a new script tag is specific to
 * a browser, so this code is not going to work in NodeJS/Firefox etc.
 * We export the document that we are using so multi-frame environments can
 * update the default document
 */
exports.document = typeof document !== 'undefined' ? document : undefined;

/**
 * Communicate with a remote server over XMLHttpRequest
 */
function WebsocketConnection(host, port) {
  this.host = host;
  this.port = port;

  this.deferreds = {};
  this.nextRequestId = 0;

  this.connected = this.connect();
}

/**
 * Setup socket.io, retrieve the list of remote commands and register them with
 * the local canon.
 * @return a promise which resolves (to undefined) when the connection is made
 * or is rejected (with an error message) if the connection fails
 */
WebsocketConnection.prototype.connect = function() {
  var deferred = promise.defer();

  this.script = util.createElement(exports.document, 'script');
  this.script.src = '/socket.io/socket.io.js';

  this.script.addEventListener('load', function() {
    this.socket = io.connect('http://' + this.host + ':' + this.port);

    // What to do when a reply is received
    this.socket.on('reply', function(res) {
      var deferred = this.deferreds[res.id];
      if (deferred == null) {
        throw new Error('Unknown id \'' + res.id + '\'');
      }

      if (res.reply) {
        deferred.resolve(res.reply);
      }
      else {
        deferred.reject(res.exception);
      }

      delete this.deferreds[res.id];
    }.bind(this));

    // On first connection ask for the remote command-specs
    this.socket.on('connected', function(data) {
      deferred.resolve(this.socket);
    }.bind(this));
  }.bind(this));

  this.script.addEventListener('error', function(ev) {
    deferred.reject('Error from SCRIPT tag to ' + this.script.src);
  }.bind(this));

  exports.document.head.appendChild(this.script);

  return deferred.promise;
};

/**
 * Kill this connection
 */
WebsocketConnection.prototype.disconnect = function() {
  Object.keys(this.deferreds).forEach(function(id) {
    this.deferreds[id].reject('Disconnected');
  }.bind(this));

  this.socket.disconnect();
  this.script.parentNode.removeChild(this.script);

  return promise.resolve();
};

/**
 * Initiate a websocket call using socket.io
 * @param command The name of the exposed feature. See server.js:remoted for
 * the remoted function
 * @param data The block of data to pass to the exposed feature. See the docs
 * for the exposed feature for what properties are required
 * @return A promise of the data returned by the remote feature
 */
WebsocketConnection.prototype.call = function(command, data) {
  return this.connected.then(function(socket) {
    var deferred = promise.defer();

    var id = this.nextRequestId++;
    this.deferreds[id] = deferred;

    socket.emit(command, data);

    return deferred.promise;
  }.bind(this));
};
