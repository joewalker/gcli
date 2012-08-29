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
var BlankArgument = require('gcli/argument').BlankArgument;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(NodeType);
  types.registerType(NodeListType);
};

exports.shutdown = function() {
  types.unregisterType(NodeType);
  types.unregisterType(NodeListType);
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
 * For testing only.
 * The fake empty NodeList used when there are no matches, we replace this with
 * something that looks better as soon as we have a document, so not only
 * should you not use this, but you shouldn't cache it either.
 */
exports._empty = [];

/**
 * Setter for the document that contains the nodes we're matching
 */
exports.setDocument = function(document) {
  doc = document;
  if (doc != null) {
    exports._empty = doc.querySelectorAll('x>:root');
  }
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



/**
 * A CSS expression that refers to a node list.
 *
 * The 'allowEmpty' option ensures that we do not complain if the entered CSS
 * selector is valid, but does not match any nodes. There is some overlap
 * between this option and 'defaultValue'. What the user wants, in most cases,
 * would be to use 'defaultText' (i.e. what is typed rather than the value that
 * it represents). However this isn't a concept that exists yet and should
 * probably be a part of GCLI if/when it does.
 * All NodeListTypes have an automatic defaultValue of an empty NodeList so
 * they can easily be used in named parameters.
 */
function NodeListType(typeSpec) {
  if ('allowEmpty' in typeSpec && typeof typeSpec.allowEmpty !== 'boolean') {
    throw new Error('Legal values for allowEmpty are [true|false]');
  }

  this.allowEmpty = typeSpec.allowEmpty;
}

NodeListType.prototype = Object.create(Type.prototype);

NodeListType.prototype.getBlank = function() {
  return new Conversion(exports._empty, new BlankArgument(), Status.VALID);
};

NodeListType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.__gcliQuery || 'Error';
};

NodeListType.prototype.parse = function(arg) {
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

  if (nodes.length === 0 && !this.allowEmpty) {
    return new Conversion(undefined, arg, Status.INCOMPLETE,
        l10n.lookup('nodeParseNone'));
  }

  host.flashNodes(nodes, false);
  return new Conversion(nodes, arg, Status.VALID, '');
};

NodeListType.prototype.name = 'nodelist';


});
