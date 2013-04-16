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

/**
 * Create a new Connection and begin the connect process so the connection
 * object can't be used until it is connected.
 */
exports.connect = function(prefix, host, port) {
  var builtinCommands = Cu.import('resource:///modules/devtools/BuiltinCommands.jsm', {});

  if (exports.defaultPort != builtinCommands.DEFAULT_DEBUG_PORT) {
    console.error('Warning contradictory default debug ports');
  }

  var connection = new builtinCommands.Connection(prefix, host, port);
  return connection.connect().then(function() {
    return connection;
  });
};

/**
 * What port should we use by default?
 */
exports.defaultPort = 4242;


});
