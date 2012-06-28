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


var host = require('gcli/host');
var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(NodeType);
};

exports.shutdown = function() {
  types.unregisterType(NodeType);
};

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var doc;
if (typeof document !== 'undefined') {
  doc = document;
}

/**
 * Setter for the document that contains the nodes we're matching
 */
exports.setDocument = function(document) {
  doc = document;
};

/**
 * Undo the effects of setDocument()
 */
exports.unsetDocument = function() {
  doc = undefined;
};

/**
 * Getter for the document that contains the nodes we're matching
 * Most for changing things back to how they were for unit testing
 */
exports.getDocument = function() {
  return doc;
};


/**
 * A CSS expression that refers to a single node
 */
function NodeType(typeSpec) {
}

NodeType.prototype = Object.create(Type.prototype);

NodeType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.__gcliQuery || 'Error';
};

NodeType.prototype.parse = function(arg) {
  if (arg.text === '') {
    return new Conversion(undefined, arg, Status.INCOMPLETE);
  }

  var nodes;
  try {
    nodes = doc.querySelectorAll(arg.text);
  }
  catch (ex) {
    return new Conversion(undefined, arg, Status.ERROR,
            l10n.lookup('nodeParseSyntax'));
  }

  if (nodes.length === 0) {
    return new Conversion(undefined, arg, Status.INCOMPLETE,
        l10n.lookup('nodeParseNone'));
  }

  if (nodes.length === 1) {
    var node = nodes.item(0);
    node.__gcliQuery = arg.text;

    host.flashNodes(node, true);

    return new Conversion(node, arg, Status.VALID, '');
  }

  host.flashNodes(nodes, false);

  return new Conversion(undefined, arg, Status.ERROR,
          l10n.lookupFormat('nodeParseMultiple', [ nodes.length ]));
};

NodeType.prototype.name = 'node';


});
