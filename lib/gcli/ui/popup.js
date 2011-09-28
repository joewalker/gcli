/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var cliView = exports;


var dom = require('gcli/util').dom;
var event = require('gcli/util').event;


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
  this.children = options.children;
  this.style = options.style || Popup.style.doubleColumnFirstFixedLeft;

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

  // Allow options to override the autoHide option
  if (options.autoHide != null) {
    this.autoHide = options.autoHide;
  }

  this.children.forEach(function(child) {
    if (child.element) {
      this.element.appendChild(child.element);
    }
  }, this);

  this.win = this.element.ownerDocument.defaultView;

  // Keep the popup element the right size when the window changes
  this.resizer = this.resizer.bind(this);
  if (this.autoHide) {
    event.addListener(this.win, 'resize', this.resizer);
  }

  this.focusManager = options.focusManager;
  if (this.focusManager) {
    this.focusManager.onFocus.add(this.show, this);
    this.focusManager.onBlur.add(this.hide, this);
    this.focusManager.addMonitoredElement(this.element, 'popup');
  }

  if (this.style === Popup.style.doubleColumnFirstFixedLeft) {
    var left = this.children[0].element;
    left.style.position = 'absolute';
    left.style.bottom = '0';
    left.style.left = '0';
    left.style.maxWidth = '300px';

    var right = this.children[1].element;
    right.style.position = 'absolute';
    right.style.bottom = '0';
    right.style.left = '320px';
    right.style.right = '0';

    // What height should the output panel be, by default?
    this._outputHeight = options.outputHeight || 300;
  }
  else if (this.style === Popup.style.singleColumnVariable) {
    this._outputHeight = -1;
  }
  else {
    throw new Error('Invalid style setting');
  }

  // Adjust to the current outputHeight only when we created the output
  if (this.autoHide) {
    this.setOutputHeight(this._outputHeight);
  }
}

/**
 * Unregister all event listeners
 */
Popup.prototype.destroy = function() {
  event.removeListener(this.win, 'resize', this.resizer);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element);
    this.focusManager.onFocus.remove(this.show, this);
    this.focusManager.onBlur.remove(this.hide, this);
  }
};

/**
 * A way to customize chunks of CSS in one go.
 * This is a bit of a hack, perhaps we'll move to injected CSS or something
 * later when we know more about what needs customizing.
 */
Popup.style = {
  doubleColumnFirstFixedLeft: 'doubleColumnFirstFixedLeft',
  singleColumnVariable: 'singleColumnVariable'
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
  this.children.forEach(function(child) {
    if (child.setHeight) {
      child.setHeight(this._outputHeight);
    }
  }, this);
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

  if (this.style === Popup.style.doubleColumnFirstFixedLeft) {
    this.element.style.width = (rect.width - 80) + 'px';
  }
};

cliView.Popup = Popup;


});
