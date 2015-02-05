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

var createSystem = require('./api').createSystem;
var Terminal = require('./ui/terminal').Terminal;

// Patch-up old browsers
require('./util/legacy');

/*
 * GCLI is built from a number of components (called items) composed as
 * required for each environment.
 * When adding to or removing from this list, we should keep the basics in sync
 * with the other environments.
 * See:
 * - lib/gcli/index.js: Generic basic set (without commands)
 * - lib/gcli/demo.js: Adds demo commands to basic set for use in web demo
 * - gcli.js: Add commands to basic set for use in Node command line
 * - mozilla/gcli/index.js: From scratch listing for Firefox
 * - lib/gcli/connectors/index.js: Client only items when executing remotely
 * - lib/gcli/connectors/direct.js: Test items for connecting to in-process GCLI
 */
exports.items = [
  require('./types/delegate').items,
  require('./types/selection').items,
  require('./types/array').items,

  require('./types/boolean').items,
  require('./types/command').items,
  require('./types/date').items,
  require('./types/file').items,
  require('./types/javascript').items,
  require('./types/node').items,
  require('./types/number').items,
  require('./types/resource').items,
  require('./types/setting').items,
  require('./types/string').items,
  require('./types/union').items,
  require('./types/url').items,

  require('./fields/fields').items,
  require('./fields/delegate').items,
  require('./fields/selection').items,

  require('./ui/focus').items,
  require('./ui/intro').items,

  require('./converters/converters').items,
  require('./converters/basic').items,
  require('./converters/html').items,
  require('./converters/terminal').items,

  require('./languages/command').items,
  require('./languages/javascript').items,

  // require('./connectors/direct').items, // Loopback for testing only
  // require('./connectors/rdp').items, // Firefox remote debug protocol
  require('./connectors/websocket').items,
  require('./connectors/xhr').items,

  // No commands in the basic set
].reduce(function(prev, curr) { return prev.concat(curr); }, []);

exports.createSystem = createSystem;

exports.createTerminal = Terminal.create.bind(Terminal);
