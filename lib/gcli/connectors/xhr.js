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
    name: 'xhr',

    connect: function(url) {
      // TODO: store the url and use it
      // Ignore host and port for now. Assume local connection
      return Promise.resolve(new XhrConnection());
    }
  }
];

/**
 * Make remote calls using XMLHttpRequest.
 * Note this connection method does not support server initiated events. Use
 * WebsocketConnection if you need that.
 */
function XhrConnection() {
}

XhrConnection.prototype = Object.create(Connection.prototype);

/**
 * Initiate an XHR call
 * See server.js:remoted for details on the remoted functions
 * @param command The name of the exposed feature.
 * @param data The block of data to pass to the exposed feature
 * @return A promise of the data returned by the remote feature
 */
XhrConnection.prototype.call = function(command, data) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/' + command, true);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

    xhr.onreadystatechange = function(event) {
      if (xhr.readyState === 4) {
        if (xhr.status >= 300 || xhr.status < 200) {
          reject({
            data: xhr.responseText,
            code: xhr.status
          });
        }
        else {
          var output = JSON.parse(xhr.responseText);
          resolve(output);
        }
      }
    }.bind(this);

    xhr.send(JSON.stringify(data));
  }.bind(this));
};
