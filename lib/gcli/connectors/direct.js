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

var createSystem = require('../system').createSystem;
var Commands = require('../commands/commands').Commands;
var Types = require('../types/types').Types;
var Requisition = require('../cli').Requisition;
var Promise = require('../util/promise').Promise;

var Remoter = require('./remoted').Remoter;
var Connection = require('./connectors').Connection;

var items = [
  require('../types/delegate').items,
  require('../types/selection').items,

  require('../types/array').items,
  require('../types/boolean').items,
  require('../types/command').items,
  require('../types/date').items,
  require('../types/file').items,
  require('../types/javascript').items,
  require('../types/node').items,
  require('../types/number').items,
  require('../types/resource').items,
  require('../types/setting').items,
  require('../types/string').items,
  require('../types/union').items,
  require('../types/url').items,

  require('../cli').items,

  require('../commands/clear').items,
  require('../commands/connect').items,
  require('../commands/context').items,
  require('../commands/exec').items,
  require('../commands/global').items,
  require('../commands/help').items,
  require('../commands/intro').items,
  require('../commands/lang').items,
  require('../commands/mocks').items,
  require('../commands/preflist').items,
  require('../commands/pref').items,
  require('../commands/test').items,
  require('../commands/demo/alert').items,
  require('../commands/demo/echo').items,
  require('../commands/demo/sleep').items

].reduce(function(prev, curr) { return prev.concat(curr); }, []);

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
