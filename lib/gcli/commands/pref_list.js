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

'use strict';

var Promise = require('util/promise');
var util = require('util/util');
var l10n = require('util/l10n');
var canon = require('gcli/canon');
var settings = require('gcli/settings');

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
 * Registration and de-registration.
 */
exports.startup = function(excludeList) {
  canon.addCommand(prefListCmdSpec);
};

exports.shutdown = function() {
  canon.removeCommand(prefListCmdSpec);
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

  util.clearElement(table);
  table.appendChild(child);
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
    var deferred = Promise.defer();
    setTimeout(function() {
      deferred.resolve(settings.getAll(this.search));
    }.bind(this), 10);
    return deferred.promise;
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
