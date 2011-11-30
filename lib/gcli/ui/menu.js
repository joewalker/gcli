/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;

var Conversion = require('gcli/types').Conversion;
var Argument = require('gcli/argument').Argument;
var canon = require('gcli/canon');

var domtemplate = require('gcli/ui/domtemplate');

var menuCss = require('text!gcli/ui/menu.css');
var menuHtml = require('text!gcli/ui/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 * @param options A way to customize the menu display. Valid options are:
 * - field: [boolean] Turns the menu display into a drop-down for use inside a
 *   JavascriptField.
 * - document: The document to use in creating widgets
 * - menuClass: Custom class name when generating the top level element
 *   which allows different layout systems
 */
function Menu(options) {
  options = options || {};
  this.document = options.document || document;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  dom.createElement(this.document, 'div');
  this.element.classList.add(options.menuClass || 'gcli-menu');
  if (options && options.field) {
    this.element.classList.add(options.menuFieldClass || 'gcli-menu-field');
  }

  // Pull the HTML into the DOM, but don't add it to the document
  if (menuCss != null) {
    this.style = dom.importCss(menuCss, this.document);
  }

  var templates = dom.createElement(this.document, 'div');
  dom.setInnerHtml(templates, menuHtml);
  this.optTempl = templates.querySelector('.gcli-menu-template');

  // Contains the items that should be displayed
  this.items = null;
}

/**
 * Avoid memory leaks
 */
Menu.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.element;
  delete this.items;
  delete this.optTempl;
};

/**
 * The default is to do nothing when someone clicks on the menu.
 * Plug an implementation in here before calling show() to do something useful.
 * This is called from template.html
 * @param ev The click event from the browser
 */
Menu.prototype.onItemClick = function(ev) {
};

/**
 * Display a number of items in the menu (or hide the menu if there is nothing
 * to display)
 * @param items The items to show in the menu
 * @param error An error message to display
 */
Menu.prototype.show = function(items, error) {
  this.error = error;
  this.items = items;

  if (this.error == null && this.items.length === 0) {
    this.element.style.display = 'none';
    return;
  }

  var options = this.optTempl.cloneNode(true);
  domtemplate.template(options, this, { allowEval: true, stack: 'menu.html' });

  dom.clearElement(this.element);
  this.element.appendChild(options);

  this.element.style.display = 'block';
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


/**
 * CommandMenu is a special menu that integrates with a Requisition to display
 * available commands.
 * @param options A way to customize the menu display. Valid options include
 * those valid for Menu(), plus:
 * - requisition: The Requisition to fill out (required)
 */
function CommandMenu(options) {
  Menu.call(this, options);
  this.requisition = options.requisition;

  this.requisition.commandChange.add(this.onCommandChange, this);
  canon.canonChange.add(this.onCommandChange, this);

  this.onCommandChange();
}

CommandMenu.prototype = Object.create(Menu.prototype);

/**
 * Avoid memory leaks
 */
CommandMenu.prototype.destroy = function() {
  this.requisition.commandChange.remove(this.onCommandChange, this);
  canon.canonChange.remove(this.onCommandChange, this);

  Menu.prototype.destroy.call(this);
};

/**
 * We want to fill-in the clicked command in the cli input when the user clicks
 */
CommandMenu.prototype.onItemClick = function(ev) {
  var type = this.requisition.commandAssignment.param.type;

  var name = ev.currentTarget.querySelector('.gcli-menu-name').innerHTML;
  var arg = new Argument(name);
  arg.suffix = ' ';

  var conversion = type.parse(arg);
  this.requisition.commandAssignment.setConversion(conversion);
};

/**
 * Update the various hint components to reflect the changed command
 */
CommandMenu.prototype.onCommandChange = function(ev) {
  var command = this.requisition.commandAssignment.getValue();
  if (!command || !command.exec) {
    var error = this.requisition.commandAssignment.getMessage();
    var predictions = this.requisition.commandAssignment.getPredictions();

    if (predictions.length === 0) {
      var commandType = this.requisition.commandAssignment.param.type;
      var conversion = commandType.parse(new Argument());
      predictions = conversion.getPredictions();
    }

    predictions.sort(function(command1, command2) {
      return command1.name.localeCompare(command2.name);
    });
    var items = [];
    predictions.forEach(function(item) {
      if (item.description && !item.hidden) {
        items.push(item);
      }
    }, this);

    this.show(items, error);
  }
  else {
    if (ev && ev.oldValue === ev.newValue) {
      return; // Just the text has changed
    }

    this.hide();
  }
};

exports.CommandMenu = CommandMenu;


});
