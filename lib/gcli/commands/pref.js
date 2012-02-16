/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var util = require('gcli/util');
var settings = require('gcli/settings');
var domtemplate = require('gcli/ui/domtemplate');
var Promise = require('gcli/promise').Promise;

/**
 * 'pref' command
 */
var prefCmdSpec = {
  name: 'pref',
  description: l10n.lookup('prefDesc'),
  manual: l10n.lookup('prefManual')
};

/**
 * 'pref list' command
 */
var prefListCmdSpec = {
  name: 'pref list',
  description: l10n.lookup('prefListDesc'),
  manual: l10n.lookup('prefListManual'),
  params: [
    {
      name: 'search',
      type: 'string',
      defaultValue: null,
      description: l10n.lookup('prefListSearchDesc'),
      manual: l10n.lookup('prefListSearchManual')
    }
  ],
  exec: function Command_prefList(args, context) {
    var prefList = new PrefList(args, context);
    return prefList.element;
  }
};

/**
 * 'pref set' command
 */
var prefSetCmdSpec = {
  name: 'pref set',
  description: l10n.lookup('prefSetDesc'),
  manual: l10n.lookup('prefSetManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefSetSettingDesc'),
      manual: l10n.lookup('prefSetSettingManual')
    },
    {
      name: 'value',
      type: 'settingValue',
      description: l10n.lookup('prefSetValueDesc'),
      manual: l10n.lookup('prefSetValueManual')
    }
  ],
  exec: function Command_prefSet(args, context) {
    args.setting.value = args.value;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  canon.addCommand(prefCmdSpec);
  canon.addCommand(prefListCmdSpec);
  canon.addCommand(prefSetCmdSpec);
};

exports.shutdown = function() {
  canon.removeCommand(prefCmdSpec);
  canon.removeCommand(prefListCmdSpec);
  canon.removeCommand(prefSetCmdSpec);

  PrefList.outerTemplate = undefined;
  if (PrefList.style) {
    PrefList.style.parentElement.removeChild(PrefList.style);
  }
  PrefList.style = undefined;
};


/**
 * A manager for our version of about:config
 */
function PrefList(args, context) {
  PrefList.onFirstUseStartup(context.document);

  this.search = args.search;
  this.element = PrefList.outerTemplate.cloneNode(true);
  this.context = context;
  this.url = util.createUrlLookup(module);
  this.edit = this.url('pref_list_edit.png');

  // Populated by the template
  this.input = undefined;
  this.table = undefined;

  domtemplate.template(this.element, this, {
    blankNullUndefined: true,
    stack: 'pref_list_outer.html'
  });

  this.updateTable();
}

/**
 * Forward localization lookups
 */
PrefList.prototype.l10n = l10n.propertyLookup;

/**
 * Called from the template onkeyup for the filter element
 */
PrefList.prototype.updateTable = function() {
  util.clearElement(this.table);
  var newTable = PrefList.innerTemplate.cloneNode(true);
  while (newTable.hasChildNodes()) {
    this.table.appendChild(newTable.firstChild);
  }

  domtemplate.template(this.table, this, {
    blankNullUndefined: true,
    allowEval: true,
    stack: 'pref_list_inner.html'
  });
};

/**
 * Which preferences match the filter?
 */
Object.defineProperty(PrefList.prototype, 'preferences', {
  get: function() {
    return settings.getAll(this.search);
  },
  enumerable: true
});

/**
 * Which preferences match the filter?
 */
Object.defineProperty(PrefList.prototype, 'promisePreferences', {
  get: function() {
    var promise = new Promise();
    this.table.ownerDocument.defaultView.setTimeout(function() {
      promise.resolve(settings.getAll(this.search));
    }.bind(this), 10);
    return promise;
  },
  enumerable: true
});

PrefList.prototype.onFilterChange = function(ev) {
  if (this.input.value !== this.search) {
    this.search = this.input.value;
    this.updateTable();
  }
};

PrefList.prototype.onSetClick = function(ev) {
  var typed = ev.currentTarget.getAttribute('data-command');
  this.context.update(typed);
};

PrefList.css = require('text!gcli/commands/pref_list.css');
PrefList.style = undefined;

PrefList.outerHtml = require('text!gcli/commands/pref_list_outer.html');
PrefList.outerTemplate = undefined;

PrefList.innerHtml = require('text!gcli/commands/pref_list_inner.html');
PrefList.innerTemplate = undefined;

/**
 * Called when the command is executed
 */
PrefList.onFirstUseStartup = function(document) {
  if (!PrefList.outerTemplate) {
    PrefList.outerTemplate = util.toDom(document, PrefList.outerHtml);
  }

  if (!PrefList.innerTemplate) {
    PrefList.innerTemplate = util.toDom(document, PrefList.innerHtml);
  }

  if (!PrefList.style && PrefList.css != null) {
    PrefList.style = util.importCss(PrefList.css, document);
  }
};

});
