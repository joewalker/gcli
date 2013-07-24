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

var xhr = require('util/xhr');

/**
 * Helper to turn a set of nodes background another color for 0.5 seconds.
 * There is likely a better way to do this, but this will do for now.
 */
exports.flashNodes = function(nodes, match) {
  if (nodes.style) {
    flashNode(nodes, match);
  }
  else {
    Array.prototype.forEach.call(nodes, function(node) {
      flashNode(node, match);
    });
  }
};

/**
 * Internal helper to turn a single nodes background another color for 0.5
 * second. There is likely a better way to do this, but this will do for now.
 */
function flashNode(node, match) {
  if (!node.__gcliHighlighting) {
    node.__gcliHighlighting = true;
    var original = node.style.background;
    node.style.background = match ? 'green' : 'red';
    setTimeout(function() {
      node.style.background = original;
      delete node.__gcliHighlighting;
    }, 500);
  }
}

/**
 * Helper to execute an arbitrary OS-level command.
 * @param execSpec Object containing some of the following properties:
 * - cmd (string): The command to execute (required)
 * - args (string[]): The arguments to pass to the command (default: [])
 * - cwd (string): The current working directory
 * - env (object): A map of properties to append to the default environment
 * @return A promise of an object containing the following properties:
 * - data (string): The text of the output from the command
 * - code (number): The exit code of the command
 */
exports.exec = function(execSpec) {
  // Make sure we're only sending strings across XHR
  var cleanArgs = (execSpec.args || []).map(function(arg) {
    return '' + arg;
  });
  var cleanEnv = Object.keys(execSpec.env || {}).reduce(function(prev, key) {
    prev[key] = '' + orig[key];
    return prev;
  }, {});

  var data = JSON.stringify({
    cmd: '' + execSpec.cmd,
    args: cleanArgs,
    cwd: '' + execSpec.cwd,
    env: cleanEnv
  });

  return xhr.post('/exec', data);
};


});
