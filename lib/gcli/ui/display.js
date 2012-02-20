/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var domtemplate = require('gcli/ui/domtemplate');
var intro = require('gcli/ui/intro');

var Tooltip = require('gcli/ui/tooltip').Tooltip;
var CommandOutputListView = require('gcli/ui/command_output_view').CommandOutputListView;
var Inputter = require('gcli/ui/inputter').Inputter;
var Completer = require('gcli/ui/completer').Completer;
var FocusManager = require('gcli/ui/focus').FocusManager;

var displayCss = require('text!gcli/ui/display.css');
var displayHtml = require('text!gcli/ui/display.html');


/**
 * Display is responsible for generating the UI for GCLI
 */
function Display(options) {
  var doc = options.document || document;
  this.options = options;

  if (!options.focusManager) {
    this.focusManager = new FocusManager(options);
    options.focusManager = this.focusManager;
  }

  if (!options.inputter) {
    this.inputter = new Inputter(options);
    options.inputter = this.inputter;
  }

  if (!options.completer) {
    this.completer = new Completer(options);
    options.completer = this.completer;
  }

  if (!options.tooltip) {
    this.tooltip = new Tooltip(options);
    options.tooltip = this.tooltip;
  }

  if (displayCss != null) {
    this.style = util.importCss(displayCss, doc);
  }

  this.element = options.displayElement || 'gcli-display';
  if (typeof this.element === 'string') {
    this.element = doc.getElementById(this.element);
    if (!this.element) {
      throw new Error('Missing display element');
    }
  }

  // outputEle is defined by the template process
  this.outputEle = undefined;

  util.setContents(this.element, displayHtml);
  domtemplate.template(this.element, this, { stack: 'display.html' });

  this.outputList = new CommandOutputListView(this.outputEle, options);

  intro.maybeShowIntro(doc, this.outputList.commandOutputManager,
          options.requisition);
}

/**
 * Unregister everything
 */
Display.prototype.destroy = function() {
  this.outputList.destroy();
  delete this.outputList;

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  if (this.tooltip) {
    this.tooltip.destroy();
    delete this.tooltip;
  }

  if (this.completer) {
    this.completer.destroy();
    delete this.completer;
  }

  if (this.inputter) {
    this.inputter.destroy();
    delete this.inputter;
  }

  if (this.focusManager) {
    this.focusManager.destroy();
    delete this.focusManager;
  }

  delete this.element;
  delete this.outputEle;
  delete this.outputList;
};

exports.Display = Display;


});
