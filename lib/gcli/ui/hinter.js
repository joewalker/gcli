/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;
var console = require('gcli/util').console;

var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var CommandMenu = require('gcli/ui/menu').CommandMenu;

var hinterCss = require('text!gcli/ui/hinter.css');

/**
 * We only want to import hinterCss once so this tracks whether or not we have
 * done it. Note technically it's only once per document, so perhaps we should
 * have a list of documents into which we've imported the CSS?
 */
var hinterCssImported = false;

/**
 * A container to show either an ArgFetcher or a Menu depending on the state
 * of the requisition.
 */
function Hinter(options) {
  options = options || {};

  this.doc = options.document;
  this.requ = options.requisition;

  if (!hinterCssImported) {
    dom.importCssString(hinterCss, this.doc);
    hinterCssImported = true;
  }

  this.element = dom.createElement('div', null, this.doc);
  this.element.className = 'gcliHintParent';

  this.hinter = dom.createElement('div', null, this.doc);
  this.hinter.className = 'gcliHints';
  this.element.appendChild(this.hinter);

  this.menu = options.menu || new CommandMenu(this.doc, this.requ);
  this.hinter.appendChild(this.menu.element);

  this.argFetcher = options.argFetcher || new ArgFetcher(this.doc, this.requ);
  this.hinter.appendChild(this.argFetcher.element);

  this.menu.onCommandChange();
}

Hinter.prototype.setHeight = function(height) {
  this.element.style.maxHeight = height + 'px';
};


exports.Hinter = Hinter;


});
