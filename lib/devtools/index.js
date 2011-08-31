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


exports.startup = function() {
  types.registerType(ResourceType);
};

exports.startup();

exports.shutdown = function() {
  types.unregisterType(ResourceType);
};


});
