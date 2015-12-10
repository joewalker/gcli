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

// Warning - gcli.js causes this version of host.js to be favored in NodeJS
// which means that it's also used in testing in NodeJS

var util = require('./util');
var GcliFront = require('../connectors/front').GcliFront;

var isNode = (typeof(process) !== 'undefined' &&
              process.title.indexOf('node') != -1);

var isWebpack = (require.cache != null);

var ATTR_NAME = '__gcli_border';
var HIGHLIGHT_STYLE = '1px dashed black';

function Highlighter(document) {
  this._document = document;
  this._nodes = util.createEmptyNodeList(this._document);
}

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
  if (node.hasAttribute(ATTR_NAME)) {
    return;
  }

  var styles = this._document.defaultView.getComputedStyle(node);
  node.setAttribute(ATTR_NAME, styles.border);
  node.style.border = HIGHLIGHT_STYLE;
};

Highlighter.prototype._unhighlightNode = function(node) {
  var previous = node.getAttribute(ATTR_NAME);
  node.style.border = previous;
  node.removeAttribute(ATTR_NAME);
};

exports.Highlighter = Highlighter;

/**
 * Helper to execute an arbitrary OS-level command.
 * @param context From which we get the shell containing cwd and env
 * @param spawnSpec Object containing some of the following properties:
 * - cmd (string): The command to execute (required)
 * - args (string[]): The arguments to pass to the command (default: [])
 * - cwd (string): The current working directory
 * - env (object): A map of properties to append to the default environment
 * @return A promise of an object containing the following properties:
 * - data (string): The text of the output from the command
 * - code (number): The exit code of the command
 */
exports.spawn = function(context, spawnSpec) {
  if (isNode) {
    return new Promise(function(resolve, reject) {
      var output = { data: '' };
      var childProcess = require('child_process');
      var child = childProcess.spawn(spawnSpec.cmd, spawnSpec.args, {
        env: spawnSpec.env,
        cwd: spawnSpec.cwd
      });

      child.stdout.on('data', function(data) {
        output.data += data;
      });

      child.stderr.on('data', function(data) {
        output.data += data;
      });

      child.on('close', function(code) {
        output.code = code;
        if (code === 0) {
          resolve(output);
        }
        else {
          reject(output);
        }
      });
    }.bind(this));
  }
  else {
    // Make sure we're only sending strings across XHR
    var cmd = '' + spawnSpec.cmd;
    var cleanArgs = (spawnSpec.args || []).map(function(arg) {
      return '' + arg;
    });
    var cwd = '' + spawnSpec.cwd;
    var cleanEnv = Object.keys(spawnSpec.env || {}).reduce(function(prev, key) {
      prev[key] = '' + spawnSpec.env[key];
      return prev;
    }, {});

    var connector = context.system.connectors.get();
    return GcliFront.create(connector).then(function(front) {
      return front.system(cmd, cleanArgs, cwd, cleanEnv).then(function(reply) {
        front.connection.disconnect().catch(util.errorHandler);
        return reply;
      });
    });
  }
};

/**
 * Execute a Javascript function. On the web, this is as simple as "task()",
 * however in Firefox and other places that allow generators, this will be
 * a call to Task.spawn.
 * @return a promise of whatever task() returns
 */
exports.exec = function(task) {
  var iterator = task();

  return new Promise(function(resolve, reject) {
    // If task wasn't a generator function, resolve with whatever
    if (iterator == null ||
        iterator.constructor.constructor.name !== 'GeneratorFunction') {
      resolve(iterator);
      return;
    }

    var callNext = function(lastValue) {
      var iteration = iterator.next(lastValue);
      Promise.resolve(iteration.value).then(function(value) {
        var action = (iteration.done ? resolve : callNext);
        action(value);
      }).catch(function(error) {
        reject(error);
        iterator['throw'](error);
      });
    };

    callNext(undefined);
  });
};

/**
 * The URL API is new enough that we need specific platform help
 */
exports.createUrl = function(uristr, base) {
  if (isNode) {
    var U = require('dom-urls');
    return new U(uristr, base);
  }
  else {
    // Chrome is picky about the base URL parameter. undefined != undefined.
    return (base == null) ? new URL(uristr) : new URL(uristr, base);
  }
};

/**
 * Load some HTML into the given document and return a DOM element.
 * This utility assumes that the html has a single root (other than whitespace)
 */
exports.toDom = function(document, html) {
  if (document == null) {
    var jsdom = require('jsdom').jsdom;
    document = jsdom('<html><head></head><body></body></html>');
  }

  var div = util.createElement(document, 'div');
  util.setContents(div, html);
  return div.children[0];
};

/**
 * Asynchronously load a text resource
 * @param requistingModule Typically just 'module' to pick up the 'module'
 * variable from the calling modules scope
 * @param name The name of the resource to load, as a path (including extension)
 * relative to that of the requiring module
 * @return A promise of the contents of the file as a string
 */
exports.staticRequire = function(requistingModule, name) {
  return new Promise(function(resolve, reject) {
    if (isNode) {
      var path = require('path');
      var parent = path.dirname(requistingModule.id);
      var filename = parent + '/' + name;

      var fs = require('fs');
      fs.readFile(filename, { encoding: 'utf8' }, function(err, data) {
        if (err) {
          reject(err);
        }

        resolve(data);
      });
    }
    else if (isWebpack) {
      // Webpack
      var text;

      if (name === './command.html') {
        text = require('raw!../languages/command.html');
      }
      else if (name === './terminal.html') {
        text = require('raw!../ui/terminal.html');
      }
      else if (name === './terminal.css') {
        text = require('raw!../ui/terminal.css');
      }
      else if (name === './menu.html') {
        text = require('raw!../ui/menu.html');
      }
      else if (name === './menu.css') {
        text = require('raw!../ui/menu.css');
      }
      else {
        reject(new Error('Unexpected requirement: ' + name));
        return;
      }

      resolve(eval(text));
    }
    else {
      // RequireJS
      if (name === './command.html') {
        resolve(require('raw!../languages/command.html'));
        return;
      }

      if (name === './terminal.html') {
        resolve(require('raw!../ui/terminal.html'));
        return;
      }

      if (name === './terminal.css') {
        resolve(require('raw!../ui/terminal.css'));
        return;
      }

      if (name === './menu.html') {
        resolve(require('raw!../ui/menu.html'));
        return;
      }

      if (name === './menu.css') {
        resolve(require('raw!../ui/menu.css'));
        return;
      }

      reject(new Error('Unexpected requirement: ' + name));
    }
  }.bind(this));
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
  evaluate: function(javascript) {
    try {
      return Promise.resolve({
        input: javascript,
        output: eval(javascript),
        exception: null
      });
    }
    catch (ex) {
      return Promise.resolve({
        input: javascript,
        output: null,
        exception: ex
      });
    }
  }
};
