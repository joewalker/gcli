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

var Cu = require('chrome').Cu;
var Cc = require('chrome').Cc;
var Ci = require('chrome').Ci;

var OS = Cu.import('resource://gre/modules/osfile.jsm', {}).OS;
var TextDecoder = Cu.import('resource://gre/modules/commonjs/toolkit/loader.js', {}).TextDecoder;

var promise = require('./promise');
var util = require('./util');

var decoder = new TextDecoder('utf8');

/**
 * The chromeWindow as as required by Highlighter, so it knows where to
 * create temporary highlight nodes.
 */
exports.chromeWindow = undefined;

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
  // Enable when the highlighter rewrite is done
};

Highlighter.prototype._unhighlightNode = function(node) {
  // Enable when the highlighter rewrite is done
};

exports.Highlighter = Highlighter;

/**
 * See docs in lib/gcli/util/host.js:exec
 */
exports.exec = function(execSpec) {
  throw new Error('Not supported');
};

/**
 * Asynchronously load a text resource
 * @see lib/gcli/util/host.js
 */
exports.staticRequire = function(requistingModule, name) {
  var filename = OS.Path.dirname(requistingModule.id) + '/' + name;
  filename = filename.replace(/\/\.\//g, '/');
  filename = 'resource://gre/modules/devtools/' + filename;

  var deferred = promise.defer();
  var xhr = Cc['@mozilla.org/xmlextras/xmlhttprequest;1']
              .createInstance(Ci.nsIXMLHttpRequest);

  xhr.onload = function onload() {
    deferred.resolve(xhr.responseText);
  }.bind(this);

  xhr.onabort = xhr.onerror = xhr.ontimeout = function(err) {
    deferred.reject(err);
  }.bind(this);

  try {
    xhr.open('GET', filename);
    xhr.send();
  }
  catch (ex) {
    deferred.reject(ex);
  }

  return deferred.promise;
};
