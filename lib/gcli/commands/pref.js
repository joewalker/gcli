/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var gcli = require('gcli/index');
var l10n = require('gcli/l10n');
var util = require('gcli/util');
var settings = require('gcli/settings');
var Promise = require('gcli/promise').Promise;

/**
 * Record if the user has clicked on 'Got It!'
 */
var allowSetSettingSpec = {
  name: 'allowSet',
  type: 'boolean',
  description: l10n.lookup('allowSetDesc'),
  defaultValue: false
};
exports.allowSet = undefined;

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
    return context.createView({
      html: require('text!gcli/commands/pref_list_outer.html'),
      data: new PrefList(args, context),
      options: {
        blankNullUndefined: true,
        allowEval: true,
        stack: 'pref_list_outer.html'
      },
      css: require('text!gcli/commands/pref_list.css'),
      cssId: 'gcli-pref-list'
    });
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
    if (!exports.allowSet.value &&
            args.setting.name !== exports.allowSet.name) {
      return context.createView({
        html: require('text!gcli/commands/pref_set_check.html'),
        options: { allowEval: true, stack: 'pref_set_check.html' },
        data: {
          l10n: l10n.propertyLookup,
          activate: function() {
            context.exec('pref set allowSet true');
          }
        },
      });
    }
    args.setting.value = args.value;
    return null;
  }
};

/**
 * 'pref reset' command
 */
var prefResetCmdSpec = {
  name: 'pref reset',
  description: l10n.lookup('prefResetDesc'),
  manual: l10n.lookup('prefResetManual'),
  params: [
    {
      name: 'setting',
      type: 'setting',
      description: l10n.lookup('prefResetSettingDesc'),
      manual: l10n.lookup('prefResetSettingManual')
    }
  ],
  exec: function Command_prefReset(args, context) {
    args.setting.setDefault();
    return null;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  exports.allowSet = settings.addSetting(allowSetSettingSpec);

  gcli.addCommand(prefCmdSpec);
  gcli.addCommand(prefListCmdSpec);
  gcli.addCommand(prefSetCmdSpec);
  gcli.addCommand(prefResetCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(prefCmdSpec);
  gcli.removeCommand(prefListCmdSpec);
  gcli.removeCommand(prefSetCmdSpec);
  gcli.removeCommand(prefResetCmdSpec);

  settings.removeSetting(allowSetSettingSpec);
  exports.allowSet = undefined;
};


/**
 * A manager for our version of about:config
 */
function PrefList(args, context) {
  this.search = args.search;
  this.context = context;
  this.url = util.createUrlLookup(module);
  this.edit = this.url('pref_list_edit.png');
}

/**
 *
 */
PrefList.prototype.onLoad = function(element) {
  var table = element.querySelector('.gcli-pref-list-table');
  this.updateTable(table);
  return '';
};

/**
 * Forward localization lookups
 */
PrefList.prototype.l10n = l10n.propertyLookup;

/**
 * Called from the template onkeyup for the filter element
 */
PrefList.prototype.updateTable = function(table) {
  util.clearElement(table);
  var view = this.context.createView({
    html: require('text!gcli/commands/pref_list_inner.html'),
    options: { blankNullUndefined: true, stack: 'pref_list_inner.html' },
    data: this
  });
  var child = view.toDom(table.ownerDocument);
  util.setContents(table, child);
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
    setTimeout(function() {
      promise.resolve(settings.getAll(this.search));
    }.bind(this), 10);
    return promise;
  },
  enumerable: true
});

PrefList.prototype.onFilterChange = function(ev) {
  if (ev.target.value !== this.search) {
    this.search = ev.target.value;

    var root = ev.target.parentNode.parentNode;
    var table = root.querySelector('.gcli-pref-list-table');
    this.updateTable(table);
  }
};

PrefList.prototype.onSetClick = function(ev) {
  var typed = ev.currentTarget.getAttribute('data-command');
  this.context.update(typed);
};

});
