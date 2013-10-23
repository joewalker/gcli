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

var util = require('./util');
var promise = require('./promise');
var connectors = require('../connectors/connectors');

/**
 * Markup a web page to highlight a collection of elements
 */
function Highlighter(document) {
  this._document = document;
  this._nodes = util.createEmptyNodeList(this._document);
}

var HIGHLIGHT_STYLE = '1px dashed black';

Object.defineProperty(Highlighter.prototype, 'nodelist', {
  set: function(nodes) {
    Array.prototype.forEach.call(this._nodes, this._unhighlightNode, this);
    this._nodes = (nodes == null) ?
        util.createEmptyNodeList(this._document) :
        nodes;
    Array.prototype.forEach.call(this._nodes, this._highlightNode, this);
  },
  get: function() {
    return this._nodes;
  },
  enumerable: true
});

Highlighter.prototype.destroy = function() {
  this.nodelist = null;
};

Highlighter.prototype._highlightNode = function(node) {
  if (node.__gcli_orig_border) {
    return;
  }

  node.__gcli_orig_border = node.style.border;
  node.style.border = HIGHLIGHT_STYLE;
};

Highlighter.prototype._unhighlightNode = function(node) {
  node.style.border = node.__gcli_orig_border;
  delete node.__gcli_orig_border;
};

exports.Highlighter = Highlighter;

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
    prev[key] = '' + execSpec.env[key];
    return prev;
  }, {});

  return connectors.get('xhr').connect().then(function(connection) {
    return connection.call('system', {
      cmd: '' + execSpec.cmd,
      args: cleanArgs,
      cwd: '' + execSpec.cwd,
      env: cleanEnv
    }).then(function(reply) {
      connection.disconnect();
      return reply;
    });
  });
};

/**
 * Asynchronously load a text resource
 * @see lib/gcli/util/host.js
 */
exports.staticRequire = function(requistingModule, name) {
  var deferred = promise.defer();
  setTimeout(function() {
    if (name === './command.html') {
      deferred.resolve(require('text!gcli/languages/command.html'));
      return;
    }

    if (name === './terminal.html') {
      deferred.resolve(require('text!gcli/ui/terminal.html'));
      return;
    }

    if (name === './terminal.css') {
      deferred.resolve(require('text!gcli/ui/terminal.css'));
      return;
    }

    if (name === './menu.html') {
      deferred.resolve(require('text!gcli/ui/menu.html'));
      return;
    }

    if (name === './menu.css') {
      deferred.resolve(require('text!gcli/ui/menu.css'));
      return;
    }

    deferred.reject(new Error('Unexpected requirement: ' + name));
  }, 10);
  return deferred.promise;
};

/**
 * A group of functions to help scripting. Small enough that it doesn't need
 * a separate module (it's basically a wrapper around 'eval' in some contexts)
 */
exports.script = {
  onOutput: util.createEvent('Script.onOutput'),

  // Setup the environment to eval JavaScript, a no-op on the web
  useTarget: function(tgt) { },

  // Execute some JavaScript
  eval: function(javascript) {
    try {
      return promise.resolve({
        input: javascript,
        output: eval(javascript),
        exception: null
      });
    }
    catch (ex) {
      return promise.resolve({
        input: javascript,
        output: null,
        exception: ex
      });
    }
  }
};
