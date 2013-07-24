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

var util = require('util/util');
var l10n = require('util/l10n');
var settings = require('gcli/settings');

/**
 * Format a list of settings for display
 */
var prefsData = {
  item: 'converter',
  from: 'prefsData',
  to: 'view',
  exec: function(prefsData, conversionContext) {
    var prefList = new PrefList(prefsData, conversionContext);
    return conversionContext.createView({
      html: require('text!gcli/commands/pref_list_outer.html'),
      data: prefList,
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
 * 'pref list' command
 */
var prefList = {
  item: 'command',
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
  returnType: 'prefsData',
  exec: function(args, context) {
    var deferred = context.defer();

    // This can be slow, get out of the way of the main thread
    setTimeout(function() {
      var prefsData = {
        settings: settings.getAll(args.search),
        search: args.search
      };
      deferred.resolve(prefsData);
    }.bind(this), 10);

    return deferred.promise;
  }
};

/**
 * A manager for our version of about:config
 */
function PrefList(prefsData, conversionContext) {
  this.search = prefsData.search;
  this.settings = prefsData.settings;
  this.conversionContext = conversionContext;
  this.url = util.createUrlLookup(module);
  this.edit = this.url('pref_list_edit.png');
}

/**
 * A load event handler registered by the template engine so we can load the
 * inner document
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
  var view = this.conversionContext.createView({
    html: require('text!gcli/commands/pref_list_inner.html'),
    options: { blankNullUndefined: true, stack: 'pref_list_inner.html' },
    data: this
  });
  var child = view.toDom(table.ownerDocument);

  util.clearElement(table);
  table.appendChild(child);
};

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
  this.conversionContext.update(typed);
};

exports.items = [ prefsData, prefList ];


});
