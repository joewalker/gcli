/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;

var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var CommandMenu = require('gcli/ui/menu').CommandMenu;

var hinterCss = require('text!gcli/ui/hinter.css');

/**
 * A container to show either an ArgFetcher or a Menu depending on the state
 * of the requisition.
 */
function Hinter(options) {
  options = options || {};

  this.document = options.document;
  this.requisition = options.requisition;

  if (hinterCss != null) {
    this.style = dom.importCss(hinterCss, this.document);
  }

  this.menu = options.menu || new CommandMenu(this.document, this.requisition);
  this.argFetcher = options.argFetcher || new ArgFetcher(this.document, this.requisition);

  /*
  <div class="gcliHintParent" _save="element">
    <div class="gcliHints" _save="hinter">
      ${menu.element}
      ${argFetcher.element}
    </div>
  </div>
   */
  this.element = dom.createElement(this.document, 'div');
  this.element.className = 'gcliHintParent';

  this.hinter = dom.createElement(this.document, 'div');
  this.hinter.className = 'gcliHints';
  this.element.appendChild(this.hinter);

  this.hinter.appendChild(this.menu.element);
  this.hinter.appendChild(this.argFetcher.element);

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

  delete this.document;
  delete this.element;
  delete this.hinter;
};

/**
 * Popup likes to be able to control the height of its children
 */
Hinter.prototype.setHeight = function(height) {
  this.element.style.maxHeight = height + 'px';
};

exports.Hinter = Hinter;


});
