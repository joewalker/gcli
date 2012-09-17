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


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var Argument = require('gcli/argument').Argument;
var Conversion = require('gcli/types').Conversion;
var canon = require('gcli/canon');

var domtemplate = require('gcli/ui/domtemplate');

var menuCss = require('text!gcli/ui/fields/menu.css');
var menuHtml = require('text!gcli/ui/fields/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 * @param options A way to customize the menu display. Valid options are:
 * - field: [boolean] Turns the menu display into a drop-down for use inside a
 *   JavascriptField.
 * - document: The document to use in creating widgets
 * - menuClass: Custom class name when generating the top level element
 *   which allows different layout systems
 * - type: The version of SelectionType that we're picking an option from
 */
function Menu(options) {
  options = options || {};
  this.document = options.document || document;
  this.type = options.type;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  util.createElement(this.document, 'div');
  this.element.classList.add(options.menuClass || 'gcli-menu');
  if (options && options.field) {
    this.element.classList.add(options.menuFieldClass || 'gcli-menu-field');
  }

  // Pull the HTML into the DOM, but don't add it to the document
  if (menuCss != null) {
    util.importCss(menuCss, this.document, 'gcli-menu');
  }

  this.template = util.toDom(this.document, menuHtml);
  this.templateOptions = { blankNullUndefined: true, stack: 'menu.html' };

  // Contains the items that should be displayed
  this.items = null;

  this.onItemClick = util.createEvent('Menu.onItemClick');
}

/**
 * Allow the template engine to get at localization strings
 */
Menu.prototype.l10n = l10n.propertyLookup;

/**
 * Avoid memory leaks
 */
Menu.prototype.destroy = function() {
  delete this.element;
  delete this.template;
  delete this.document;
};

/**
 * The default is to do nothing when someone clicks on the menu.
 * This is called from template.html
 * @param ev The click event from the browser
 */
Menu.prototype.onItemClickInternal = function(ev) {
  var name = ev.currentTarget.querySelector('.gcli-menu-name').textContent;
  var arg = new Argument(name);
  // Maybe these spaces should be automatic like for complete?
  arg.suffix = ' ';
  arg.prefix = ' ';

  var conversion = this.type.parse(arg);
  this.onItemClick({ conversion: conversion });
};

/**
 * Display a number of items in the menu (or hide the menu if there is nothing
 * to display)
 * @param items The items to show in the menu
 * @param match Matching text to highlight in the output
 */
Menu.prototype.show = function(items, match) {
  this.items = items.filter(function(item) {
    return item.hidden === undefined || item.hidden !== true;
  }.bind(this));

  if (match) {
    this.items = this.items.map(function(item) {
      return gethighlightingProxy(item, match, this.template.ownerDocument);
    }.bind(this));
  }

  if (this.items.length === 0) {
    this.element.style.display = 'none';
    return;
  }

  if (this.items.length >= Conversion.maxPredictions) {
    this.items.splice(-1);
    this.items.hasMore = true;
  }

  var options = this.template.cloneNode(true);
  domtemplate.template(options, this, this.templateOptions);

  util.clearElement(this.element);
  this.element.appendChild(options);

  this.element.style.display = 'block';
};

/**
 * Create a proxy around an item that highlights matching text
 */
function gethighlightingProxy(item, match, document) {
  if (typeof Proxy === 'undefined') {
    return item;
  }
  return Proxy.create({
    get: function(rcvr, name) {
      var value = item[name];
      if (name !== 'name') {
        return value;
      }

      var startMatch = value.indexOf(match);
      if (startMatch === -1) {
        return value;
      }

      var before = value.substr(0, startMatch);
      var after = value.substr(startMatch + match.length);
      var parent = document.createElement('span');
      parent.appendChild(document.createTextNode(before));
      var highlight = document.createElement('span');
      highlight.classList.add('gcli-menu-typed');
      highlight.appendChild(document.createTextNode(match));
      parent.appendChild(highlight);
      parent.appendChild(document.createTextNode(after));
      return parent;
    }
  });
}

/**
 * Highlight a given option
 */
Menu.prototype.setChoiceIndex = function(choice) {
  var nodes = this.element.querySelectorAll('.gcli-menu-option');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove('gcli-menu-highlight');
  }

  if (choice == null) {
    return;
  }

  if (nodes.length <= choice) {
    console.error('Cant highlight ' + choice + '. Only ' + nodes.length + ' options');
    return;
  }

  nodes.item(choice).classList.add('gcli-menu-highlight');
};

/**
 * Allow the inputter to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if an item was 'clicked', false otherwise
 */
Menu.prototype.selectChoice = function() {
  var selected = this.element.querySelector('.gcli-menu-highlight .gcli-menu-name');
  if (!selected) {
    return false;
  }

  var name = selected.textContent;
  var arg = new Argument(name);
  arg.suffix = ' ';
  arg.prefix = ' ';

  var conversion = this.type.parse(arg);
  this.onItemClick({ conversion: conversion });
  return true;
};

/**
 * Hide the menu
 */
Menu.prototype.hide = function() {
  this.element.style.display = 'none';
};

/**
 * Change how much vertical space this menu can take up
 */
Menu.prototype.setMaxHeight = function(height) {
  this.element.style.maxHeight = height + 'px';
};

exports.Menu = Menu;


});
