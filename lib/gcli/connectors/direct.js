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
var createSystem = require('../system').createSystem;
var Requisition = require('../cli').Requisition;
var Remoter = require('./remoted').Remoter;
var Connection = require('./connectors').Connection;

exports.items = [
  {
    // Communicate with a 'remote' server that isn't remote at all
    item: 'connector',
    name: 'direct',

    connect: function(url) {
      return Promise.resolve(new DirectConnection());
    }
  }
];

function DirectConnection() {
  this._emit = this._emit.bind(this);

  // The items to use in our new command line
  var items = [
    require('../items/basic').items,
    require('../items/standard').items,
    require('../items/demo').items,
  ].reduce(function(prev, curr) { return prev.concat(curr); }, []);

  // This is the 'server'
  var system = createSystem();
  system.addItems(items);
  var requisition = new Requisition(system);

  this.remoter = new Remoter(requisition);
  this.remoter.addListener(this._emit);
}

DirectConnection.prototype = Object.create(Connection.prototype);

DirectConnection.prototype.call = function(command, data) {
  return new Promise(function(resolve, reject) {
    var func = this.remoter.exposed[command];
    var reply = func.call(this.remoter, data);
    resolve(reply);
  }.bind(this));
};

DirectConnection.prototype.disconnect = function() {
  this.remoter.removeListener(this._emit);
  delete this._emit;
};
