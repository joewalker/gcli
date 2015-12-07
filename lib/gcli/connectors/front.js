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

/**
 * Asynchronous construction. Use GcliFront();
 * @private
 */
function GcliFront() {
  throw new Error('Use GcliFront.create().then(front => ...)');
}

/**
 *
 */
GcliFront.create = function(connector, url) {
  return connector.connect(url).then(function(connection) {
    var front = Object.create(GcliFront.prototype);
    return front._init(connection);
  });
};

/**
 * Asynchronous construction. Use GcliFront();
 * @private
 */
GcliFront.prototype._init = function(connection) {
  this.connection = connection;
  return this;
};

GcliFront.prototype.on = function(eventName, action) {
  this.connection.on(eventName, action);
};

GcliFront.prototype.off = function(eventName, action) {
  this.connection.off(eventName, action);
};


GcliFront.prototype.specs = function() {
  var data = {
  };
  return this.connection.call('specs', data);
};

GcliFront.prototype.execute = function(typed) {
  var data = {
    typed: typed
  };
  return this.connection.call('execute', data);
};

GcliFront.prototype.parseFile = function(typed, filetype, existing, matches) {
  var data = {
    typed: typed,
    filetype: filetype,
    existing: existing,
    matches: matches
  };
  return this.connection.call('parseFile', data);
};

GcliFront.prototype.parseType = function(typed, paramName) {
  var data = {
    typed: typed,
    paramName: paramName
  };
  return this.connection.call('parseType', data);
};

GcliFront.prototype.nudgeType = function(typed, by, paramName) {
  var data = {
    typed: typed,
    by: by,
    paramName: paramName
  };
  return this.connection.call('nudgeType', by, data);
};

GcliFront.prototype.getSelectionLookup = function(commandName, paramName) {
  var data = {
    commandName: commandName,
    paramName: paramName
  };
  return this.connection.call('getSelectionLookup', data);
};

GcliFront.prototype.system = function(cmd, args, cwd, env) {
  var data = {
    cmd: cmd,
    args: args,
    cwd: cwd,
    env: env
  };
  return this.connection.call('system', data);
};

exports.GcliFront = GcliFront;
