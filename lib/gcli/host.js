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
 * @param promise the thing we resolve/reject on completion
 * @param execSpec Object containing some of the following properties:
 * - cmd (string): The command to execute (required)
 * - args (string[]): The arguments to pass to the command (default: [])
 * - cwd: (string): The current working directory
 * - env: (object): A map of properties to append to the default environment
 */
exports.exec = function(promise, execSpec) {
  var data = JSON.stringify(execSpec);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/exec/', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.setRequestHeader('Content-Length', data.length);

  xhr.onreadystatechange = function(event) {
    if (xhr.readyState == 4) {
      if (xhr.status >= 300 || xhr.status < 200) {
        promise.reject(xhr.responseText);
        return;
      }

      promise.resolve(xhr.responseText);
    }
  };

  xhr.send(data);
};

/**
 * Helper to execute an arbitrary server-side JS function.
 * @param promise the thing we resolve/reject on completion
 * @param funcSpec Object containing some of the following properties:
 * - func (string): The function to execute (required)
 * - args (string[]): The arguments to pass to the command (default: [])
 */
exports.func = function(promise, funcSpec) {
  var data = JSON.stringify(funcSpec);

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/func/', true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
  xhr.setRequestHeader('Content-Length', data.length);

  xhr.onreadystatechange = function(event) {
    if (xhr.readyState == 4) {
      if (xhr.status >= 300 || xhr.status < 200) {
        promise.reject(JSON.parse(xhr.responseText));
        return;
      }

      promise.resolve(JSON.parse(xhr.responseText));
    }
  };

  xhr.send(data);
};


});
