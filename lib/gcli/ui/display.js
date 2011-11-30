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

var domtemplate = require('gcli/ui/domtemplate');
var Inputter = require('gcli/ui/inputter').Inputter;
var FocusManager = require('gcli/ui/focus').FocusManager;

var displayCss = require('text!gcli/ui/display.css');
var displayHtml = require('text!gcli/ui/display.html');


/**
 * Display is responsible for generating the UI for GCLI
 */
function Display(options) {
  this.document = options.document || document;
  this.window = this.document.defaultView;
  this.autoHide = false;

  this.inputter = options.inputter || new Inputter(options);
  this.menu = options.menu || new CommandMenu(options);
  this.argFetcher = options.argFetcher || new ArgFetcher(options);

  // A container to show either an ArgFetcher or a Menu depending on the state
  // of the requisition.
  if (displayCss != null) {
    this.style = dom.importCss(displayCss, this.document);
  }

  this.element = options.displayElement || 'gcli-display';
  if (typeof this.element === 'string') {
    this.element = this.document.getElementById(this.element);

    if (!this.element) {
      this.element = dom.createElement(this.document, 'div');
      this.element.id = 'gcli-display';

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
    this.element.classList.add('gcli-display-autohide');

    // Keep the display element the right size when the window changes
    this.resizer = this.resizer.bind(this);
    this.window.addEventListener('resize', this.resizer, false);
  }

  // Defined by the template process
  this.outputList = undefined;

  dom.setInnerHtml(this.element, displayHtml);
  domtemplate.template(this.element, this, { stack: 'display.html' });

  this.outputList = new CommandOutputListView(this.outputList, options);

  if (options.useFocusManager) {
    this.focusManager = options.focusManager || new FocusManager(options);

    this.focusManager.onFocus.add(this.show, this);
    this.focusManager.onBlur.add(this.hide, this);
    this.focusManager.addMonitoredElement(this.element, 'display');
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
Display.prototype.destroy = function() {
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
Display.prototype.setOutputHeight = function(outputHeight) {
  if (outputHeight == null) {
    this._outputHeight = outputHeight;
  }

  if (this._outputHeight === -1) {
    return;
  }

  this.element.style.height = this._outputHeight + 'px';
};

/**
 * Tweak CSS to show the output
 */
Display.prototype.show = function() {
  this.element.style.display = 'block';
};

/**
 * Hide the display using a CSS tweak
 */
Display.prototype.hide = function() {
  this.element.style.display = 'none';
};

/**
 * To be called on window resize or any time we want to align the top level
 * Display element with the input box.
 */
Display.prototype.resizer = function() {
  var rect = this.inputter.element.getBoundingClientRect();
  rect.width = rect.right - rect.left;
  rect.height = rect.bottom - rect.top;

  this.element.style.top = 'auto';
  var bottom = this.document.documentElement.clientHeight - rect.top;
  this.element.style.bottom = bottom + 'px';
  this.element.style.left = rect.left + 'px';

  this.element.style.width = (rect.width - 80) + 'px';
};

exports.Display = Display;


});
