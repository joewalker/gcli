/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var l10n = require('gcli/l10n');
var gcli = require('gcli/index');
var types = require('gcli/types');
var Argument = require('gcli/argument').Argument;
var strings = require('i18n!devtools/nls/strings');

var Conversion = types.Conversion;
var Type = types.Type;
var SelectionType = types.SelectionType;
var Status = types.Status;

/**
 * Utility to create a link to a bug number
 */
function getBugLink(bugid) {
  return '<br/>To comment on this command, use <a target="_blank" ' +
      'href="https://bugzilla.mozilla.org/show_bug.cgi?id=' + bugid + '">' +
      'bug ' + bugid + '</a>.';
}

/**
 * A type for the resources in the current page
 */
function ResourceType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('ResourceType can not be customized');
  }
}

ResourceType.prototype = Object.create(types.SelectionType.prototype);

ResourceType.prototype.lookup = function() {
  var reply = [];
  for (var i = 0; i < document.styleSheets.length; i++) {
    var sheet = document.styleSheets[i];
    reply.push({
      name: sheet.href || 'style#' + i,
      value: sheet
    });
  }
  reply.push({
    name: 'page',
    value: window.document
  });
  return reply;
};

ResourceType.prototype.name = 'resource';


/**
 * A CSS expression that refers to a single node
 */
function NodeType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('NodeType can not be customized');
  }
}

NodeType.prototype = Object.create(Type.prototype);

NodeType.prototype.stringify = function(value) {
  return value.__gcliQuery || 'Error';
};

NodeType.prototype.parse = function(arg) {
  if (arg.text === '') {
    return new Conversion(null, arg, Status.INCOMPLETE, 'No matches');
  }

  var nodes;
  try {
    nodes = document.querySelectorAll(arg.text);
  }
  catch (ex) {
    return new Conversion(null, arg, Status.ERROR,
        l10n.lookup('node_parse_syntax', {}, strings));
  }

  if (nodes.length === 0) {
    return new Conversion(null, arg, Status.INCOMPLETE, 'No matches');
  }

  if (nodes.length === 1) {
    var node = nodes.item(0);
    node.__gcliQuery = arg.text;
    return new Conversion(node, arg, Status.VALID, '');
  }

  return new Conversion(null, arg, Status.ERROR, 'Multiple matches');
};

NodeType.prototype.name = 'node';

types.NodeType = NodeType;


exports.startup = function() {
  types.registerType(ResourceType);
  types.registerType(NodeType);
};

exports.startup();

exports.shutdown = function() {
  types.unregisterType(NodeType);
  types.unregisterType(ResourceType);
};


});
