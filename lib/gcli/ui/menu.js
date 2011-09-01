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

var Templater = require('gcli/ui/domtemplate').Templater;

var menuCss = require('text!gcli/ui/menu.css');
var menuHtml = require('text!gcli/ui/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 * @param doc The document from which we create elements.
 * @param options A way to customize the menu display. Valid options are:
 * - field:true Turns the menu display into a drop-down for use inside a
 * JavascriptField.
 */
function Menu(doc, options) {
  this.doc = doc;

  this.element =  dom.createElement('div', null, this.doc);
  this.element.className = 'gcliMenu';
  if (options && options.field) {
    this.element.className += ' gcliMenuField';
  }

  // Pull the HTML into the DOM, but don't add it to the document
  if (!Menu.optTempl) {
    dom.importCssString(menuCss, this.doc);

    var templates = dom.createElement('div', null, this.doc);
    dom.setInnerHtml(templates, menuHtml);
    Menu.optTempl = templates.querySelector('#gcliOptTempl');
  }
}

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

  var options = Menu.optTempl.cloneNode(true);
  new Templater().processNode(options, this);

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

exports.Menu = Menu;


/**
 * CommandMenu is a special menu that integrates with a Requisition to display
 * available commands.
 */
function CommandMenu(doc, requ) {
  Menu.call(this, doc);
  this.requ = requ;

  this.requ.commandChange.add(this.onCommandChange, this);
  canon.canonChange.add(this.onCommandChange, this);
}

CommandMenu.prototype = Object.create(Menu.prototype);

/**
 * We want to fill-in the clicked command in the cli input when the user clicks
 */
CommandMenu.prototype.onItemClick = function(ev) {
  var item = ev.currentTarget.item;
  var type = this.requ.commandAssignment.param.type;
  var text = type.stringify(item);
  var arg = new Argument(text);
  arg.suffix = ' ';
  var conversion = new Conversion(item, arg);
  this.requ.commandAssignment.setConversion(conversion);
};

/**
 * Update the various hint components to reflect the changed command
 */
CommandMenu.prototype.onCommandChange = function(ev) {
  var command = this.requ.commandAssignment.getValue();
  if (!command || !command.exec) {
    var error;
    var predictions = this.requ.commandAssignment.getPredictions();

    if (predictions.length === 0) {
      error = this.requ.commandAssignment.getMessage();
      var commandType = this.requ.commandAssignment.param.type;
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
