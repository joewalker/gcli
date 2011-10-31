/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;

var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var CommandMenu = require('gcli/ui/menu').CommandMenu;

var Templater = require('gcli/ui/domtemplate').Templater;

var hinterCss = require('text!gcli/ui/hinter.css');
var hinterHtml = require('text!gcli/ui/hinter.html');

/**
 * A container to show either an ArgFetcher or a Menu depending on the state
 * of the requisition.
 */
function Hinter(options) {
  options = options || {};

  if (hinterCss != null) {
    this.style = dom.importCss(hinterCss, options.document);
  }

  this.menu = options.menu ||
          new CommandMenu(options.document, options.requisition);
  this.argFetcher = options.argFetcher ||
          new ArgFetcher(options.document, options.requisition);

  var templates = dom.createElement(options.document, 'div');
  dom.setInnerHtml(templates, hinterHtml);
  this.element = templates.querySelector('.gcliHintParent');
  new Templater().processNode(this.element, this);

  this.menu.onCommandChange();
}

/**
 * Avoid memory leaks
 */
Hinter.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.element;
};

/**
 * Popup likes to be able to control the height of its children
 */
Hinter.prototype.setHeight = function(height) {
  this.element.style.maxHeight = height + 'px';
};

exports.Hinter = Hinter;


});
