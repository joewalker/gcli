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

var Promise = require('../util/promise').Promise;
var Connection = require('./connectors').Connection;

exports.items = [
  {
    // Communicate with a remote server over XMLHttpRequest
    item: 'connector',
    name: 'websocket',

    connect: function(url) {
      url = url || exports.document.location.origin;

      if (connections[url] == null) {
        connections[url] = new Promise(function(resolve, reject) {
          var io = require('socket.io-client');
          var socket = io.connect(url);
          var wsc = new WebsocketConnection(socket, url);

          // What to do when a reply is received
          socket.on('reply', wsc.onReply);

          socket.on('event', wsc.onEvent);

          socket.on('connected', function() {
            resolve(wsc);
          });
        }.bind(this));
      }
      return connections[url];
    }
  }
];

/**
 * We only connect once to each URL
 */
var connections = {};

/**
 * The ability to add functionality by adding a new script tag is specific to
 * a browser, so this code is not going to work in NodeJS/Firefox etc.
 * We export the document that we are using so multi-frame environments can
 * update the default document
 */
exports.document = typeof document !== 'undefined' ? document : undefined;

/**
 * Handle a 'session' in which we make a number of calls
 */
function WebsocketConnection(socket, url) {
  this.socket = socket;
  this.url = url;

  this.deferreds = {};
  this.nextRequestId = 0;

  this.onReply = this.onReply.bind(this);
  this.onEvent = this.onEvent.bind(this);
}

WebsocketConnection.prototype = Object.create(Connection.prototype);

/**
 * Connect a websocket reply to the request that caused it
 */
WebsocketConnection.prototype.onReply = function(res) {
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
};

/**
 * Connect a websocket reply to the request that caused it
 */
WebsocketConnection.prototype.onEvent = function(res) {
  this._emit(res.name, res.data);
};

/**
 * Kill this connection
 */
WebsocketConnection.prototype.disconnect = function() {
  Object.keys(this.deferreds).forEach(function(id) {
    this.deferreds[id].reject('Disconnected');
  }.bind(this));

  return Promise.resolve(undefined);
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
  return new Promise(function(resolve, reject) {
    var id = this.nextRequestId++;
    this.deferreds[id] = { resolve: resolve, reject: reject };

    this.socket.emit(command, { id: id, data: data });
  }.bind(this));
};
