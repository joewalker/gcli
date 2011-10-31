/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;

var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var CommandMenu = require('gcli/ui/menu').CommandMenu;
var CommandOutputListView = require('gcli/ui/command_output_view').CommandOutputListView;

var Templater = require('gcli/ui/domtemplate').Templater;

var popupCss = require('text!gcli/ui/popup.css');
var popupHtml = require('text!gcli/ui/popup.html');


/**
 * Popup is responsible for containing the popup hints that are displayed
 * above the command line.
 * Some implementations of GCLI require an element to be visible whenever the
 * GCLI has the focus.
 * This can be somewhat tricky because the definition of 'has the focus' is
 * one where a group of elements could have the focus.
 */
function Popup(options) {
  this.document = options.document || document;

  this.inputter = options.inputter;
  this.autoHide = false;

  this.element = options.popupElement || 'gcliOutput';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.document.getElementById(name);

    if (!this.element) {
      this.autoHide = true;
      this.element = dom.createElement(this.document, 'div');
      this.element.id = name;
      if (this.inputter) {
        this.inputter.appendAfter(this.element);
      }

      this.element.style.position = 'absolute';
      this.element.style.zIndex = '999';
    }
  }

  this.win = this.element.ownerDocument.defaultView;

  // Allow options to override the autoHide option
  if (options.autoHide != null) {
    this.autoHide = options.autoHide;
  }

  // A container to show either an ArgFetcher or a Menu depending on the state
  // of the requisition.
  if (popupCss != null) {
    this.style = dom.importCss(popupCss, this.document);
  }

  this.menu = options.menu ||
          new CommandMenu(this.document, options.requisition);
  this.argFetcher = options.argFetcher ||
          new ArgFetcher(this.document, options.requisition);

  var templates = dom.createElement(this.document, 'div');
  dom.setInnerHtml(templates, popupHtml);
  this.hinter = templates.querySelector('.gcliHintParent');
  new Templater().processNode(this.hinter, this);

  options.outputList = dom.createElement(this.document, 'div');
  options.outputList.classList.add('gcliCommandOutput');

  this.element.appendChild(this.hinter);
  this.outputList = new CommandOutputListView(options);
  this.element.appendChild(this.outputList.element);

  // Keep the popup element the right size when the window changes
  this.resizer = this.resizer.bind(this);
  if (this.autoHide) {
    this.win.addEventListener('resize', this.resizer, false);
  }

  this.focusManager = options.focusManager;
  if (this.focusManager) {
    this.focusManager.onFocus.add(this.show, this);
    this.focusManager.onBlur.add(this.hide, this);
    this.focusManager.addMonitoredElement(this.element, 'popup');
  }

  this.outputList.element.style.position = 'absolute';
  this.outputList.element.style.bottom = '0';
  this.outputList.element.style.left = '320px';
  this.outputList.element.style.right = '0';

  // What height should the output panel be, by default?
  this._outputHeight = options.outputHeight || 300;

  // Adjust to the current outputHeight only when we created the output
  if (this.autoHide) {
    this.setOutputHeight(this._outputHeight);
  }

  this.menu.onCommandChange();
}

/**
 * Unregister all event listeners
 */
Popup.prototype.destroy = function() {
  this.win.removeEventListener('resize', this.resizer, false);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element);
    this.focusManager.onFocus.remove(this.show, this);
    this.focusManager.onBlur.remove(this.hide, this);
  }

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.hinter;

  delete this.document;
  delete this.element;
};

/**
 * Configuration point - how high should the output window be?
 */
Popup.prototype.setOutputHeight = function(outputHeight) {
  if (outputHeight == null) {
    this._outputHeight = outputHeight;
  }

  if (this._outputHeight === -1) {
    return;
  }

  this.element.style.height = this._outputHeight + 'px';
  this.hinter.style.maxHeight = height + 'px';
  this.outputList.setHeight(this._outputHeight);
};

/**
 * Tweak CSS to show the output popup
 */
Popup.prototype.show = function() {
  this.element.style.display = 'inline-block';
};

/**
 * Hide the popup using a CSS tweak
 */
Popup.prototype.hide = function() {
  this.element.style.display = 'none';
};

/**
 * To be called on window resize or any time we want to align the elements
 * with the input box.
 */
Popup.prototype.resizer = function() {
  var rect = this.inputter.element.getBoundingClientRect();
  rect.width = rect.right - rect.left;
  rect.height = rect.bottom - rect.top;

  this.element.style.top = 'auto';
  var bottom = this.document.documentElement.clientHeight - rect.top;
  this.element.style.bottom = bottom + 'px';
  this.element.style.left = rect.left + 'px';

  this.element.style.width = (rect.width - 80) + 'px';
};

exports.Popup = Popup;


});
