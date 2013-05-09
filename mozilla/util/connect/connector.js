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
  var builtinCommands = Components.utils.import('resource:///modules/devtools/BuiltinCommands.jsm', {});
  return builtinCommands.connect(prefix, host, port);
};

/**
 * What port should we use by default?
 */
Object.defineProperty(exports, 'defaultPort', {
  get: function() {
    Components.utils.import("resource://gre/modules/Services.jsm");
    return Services.prefs.getIntPref("devtools.debugger.chrome-debugging-port");
  },
  enumerable: true
});


});
