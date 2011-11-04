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
  this.window = this.document.defaultView;

  this.inputter = options.inputter;
  this.autoHide = false;

  this.menu = options.menu ||
      new CommandMenu(this.document, options.requisition);
  this.argFetcher = options.argFetcher || new ArgFetcher(options);

  // A container to show either an ArgFetcher or a Menu depending on the state
  // of the requisition.
  if (popupCss != null) {
    this.style = dom.importCss(popupCss, this.document);
  }

  this.element = options.popupElement || 'gcliOutput';
  if (typeof this.element === 'string') {
    this.element = this.document.getElementById(this.element);

    if (!this.element) {
      this.element = dom.createElement(this.document, 'div');
      this.element.id = 'gcliOutput';

      this.autoHide = true;
      if (this.inputter) {
        this.inputter.appendAfter(this.element);
      }
    }
  }

  // autoHide settings
  if (options.autoHide != null) {
    this.autoHide = options.autoHide;
  }
  if (this.autoHide) {
    this.element.classList.add('gcliOutAutoHide');

    // Keep the popup element the right size when the window changes
    this.resizer = this.resizer.bind(this);
    this.window.addEventListener('resize', this.resizer, false);
  }

  // Defined by the template process
  this.outputList = undefined;

  dom.setInnerHtml(this.element, popupHtml);
  new Templater().processNode(this.element, this);

  this.outputList = new CommandOutputListView(this.outputList, options);

  this.focusManager = options.focusManager;
  if (this.focusManager) {
    this.focusManager.onFocus.add(this.show, this);
    this.focusManager.onBlur.add(this.hide, this);
    this.focusManager.addMonitoredElement(this.element, 'popup');
  }

  // What height should the output panel be, by default?
  this._outputHeight = options.outputHeight || 300;

  // Adjust to the current outputHeight only when we created the output
  if (this.autoHide) {
    this.setOutputHeight(this._outputHeight);
  }
}

/**
 * Unregister all event listeners
 */
Popup.prototype.destroy = function() {
  if (this.autoHide) {
    this.window.removeEventListener('resize', this.resizer, false);
  }

  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element);
    this.focusManager.onFocus.remove(this.show, this);
    this.focusManager.onBlur.remove(this.hide, this);
  }

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

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
};

/**
 * Tweak CSS to show the output popup
 */
Popup.prototype.show = function() {
  this.element.style.display = 'block';
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
