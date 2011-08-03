/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var cliView = exports;


var dom = require('gcli/util').dom;
var console = require('gcli/util').console;

var Conversion = require('gcli/types').Conversion;
var Argument = require('gcli/argument').Argument;
var canon = require('gcli/canon');

var Templater = require('gcli/ui/domtemplate').Templater;

var menuCss = require('text!gcli/ui/menu.css');
var menuHtml = require('text!gcli/ui/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 */
function Menu(doc, requ) {
  this.doc = doc;
  this.requ = requ;

  this.element =  dom.createElement('div', null, this.doc);
  this.element.className = 'gcliMenu';
  this.tmpl = new Templater();

  // Pull the HTML into the DOM, but don't add it to the document
  if (!Menu.optTempl) {
    dom.importCssString(menuCss, this.doc);

    var templates = dom.createElement('div', null, this.doc);
    dom.setInnerHtml(templates, menuHtml);
    Menu.optTempl = templates.querySelector('#gcliOptTempl');
  }

  canon.canonChange.add(this.update, this);
}

Menu.prototype.hide = function() {
  this.element.style.display = 'none';
};

Menu.prototype.update = function() {
  var predictions = this.requ.commandAssignment.getPredictions();
  predictions.sort(function(command1, command2) {
    return command1.value.name.localeCompare(command2.value.name);
  });
  var items = [];
  predictions.forEach(function(pair) {
    var command = pair.value;
    if (command.description && !command.hidden) {
      items.push({
        name: command.name,
        description: command.description,
        title: command.manual || '',
        click: function() {
          var type = this.requ.commandAssignment.param.type;
          var text = type.stringify(command);
          var arg = new Argument(text);
          arg.suffix = ' ';
          var conversion = new Conversion(command, arg);
          this.requ.commandAssignment.setConversion(conversion);
        }.bind(this)
      });
    }
  }, this);
  var options = Menu.optTempl.cloneNode(true);
  this.tmpl.processNode(options, { items: items });

  dom.clearElement(this.element);
  this.element.appendChild(options);

  this.element.style.display = 'block';
};

Menu.prototype.show = function() {
  this.update();
  this.element.style.display = 'block';
};

cliView.Menu = Menu;


});
