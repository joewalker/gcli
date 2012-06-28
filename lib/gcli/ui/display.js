/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var settings = require('gcli/settings');
var intro = require('gcli/ui/intro');
var domtemplate = require('gcli/ui/domtemplate');

var Tooltip = require('gcli/ui/tooltip').Tooltip;
var OutputTerminal = require('gcli/ui/output_terminal').OutputTerminal;
var Inputter = require('gcli/ui/inputter').Inputter;
var Completer = require('gcli/ui/completer').Completer;
var FocusManager = require('gcli/ui/focus').FocusManager;
var Prompt = require('gcli/ui/prompt').Prompt;

var Requisition = require('gcli/cli').Requisition;

var displayCss = require('text!gcli/ui/display.css');
var displayHtml = require('text!gcli/ui/display.html');


/**
 * createDisplay() calls 'new Display()' but returns an object which exposes a
 * much restricted set of functions rather than all those exposed by Display.
 * This allows for robust testing without exposing too many internals.
 * @param options See Display() for a description of the available options.
 */
exports.createDisplay = function(options) {
  if (options.settings != null) {
    settings.setDefaults(options.settings);
  }
  var display = new Display(options);
  var requisition = display.requisition;
  return {
    /**
     * The exact shape of the object returned by exec is likely to change in
     * the near future. If you do use it, please expect your code to break.
     */
    exec: requisition.exec.bind(requisition),
    update: requisition.update.bind(requisition),
    destroy: display.destroy.bind(display)
  };
};

/**
 * View is responsible for generating the web UI for GCLI.
 * @param options Object containing user customization properties.
 * See the documentation for the other components for more details.
 * Options supported directly include:
 * - document (default=document):
 * - environment (default={}):
 * - dontDecorate (default=false):
 * - inputElement (default=#gcli-input):
 * - completeElement (default=#gcli-row-complete):
 * - displayElement (default=#gcli-display):
 * - promptElement (default=#gcli-prompt):
 */
function Display(options) {
  var doc = options.document || document;

  this.displayStyle = undefined;
  if (displayCss != null) {
    this.displayStyle = util.importCss(displayCss, doc, 'gcli-css-display');
  }

  // Configuring the document is complex because on the web side, there is an
  // active desire to have nothing to configure, where as when embedded in
  // Firefox there could be up to 4 documents, some of which can/should be
  // derived from some root element.
  // When a component uses a document to create elements for use under a known
  // root element, then we pass in the element (if we have looked it up
  // already) or an id/document
  this.requisition = new Requisition(options.enviroment || {}, doc);

  this.focusManager = new FocusManager(options, {
    document: doc
  });

  this.inputElement = find(doc, options.inputElement || null, 'gcli-input');
  this.inputter = new Inputter(options, {
    requisition: this.requisition,
    focusManager: this.focusManager,
    element: this.inputElement
  });

  // autoResize logic: we want Completer to keep the elements at the same
  // position if we created the completion element, but if someone else created
  // it, then it's their job.
  this.completeElement = insert(this.inputElement,
                         options.completeElement || null, 'gcli-row-complete');
  this.completer = new Completer(options, {
    requisition: this.requisition,
    inputter: this.inputter,
    autoResize: this.completeElement.gcliCreated,
    element: this.completeElement
  });

  this.prompt = new Prompt(options, {
    inputter: this.inputter,
    element: insert(this.inputElement,
                    options.promptElement || null, 'gcli-prompt')
  });

  this.element = find(doc, options.displayElement || null, 'gcli-display');
  this.element.classList.add('gcli-display');

  this.template = util.toDom(doc, displayHtml);
  this.elements = {};
  domtemplate.template(this.template, this.elements, { stack: 'display.html' });
  this.element.appendChild(this.template);

  this.tooltip = new Tooltip(options, {
    requisition: this.requisition,
    inputter: this.inputter,
    focusManager: this.focusManager,
    element: this.elements.tooltip,
    panelElement: this.elements.panel
  });

  this.inputter.tooltip = this.tooltip;

  this.outputElement = util.createElement(doc, 'div');
  this.outputElement.classList.add('gcli-output');
  this.outputList = new OutputTerminal(options, {
    requisition: this.requisition,
    element: this.outputElement
  });

  this.element.appendChild(this.outputElement);

  intro.maybeShowIntro(this.outputList.commandOutputManager, this.requisition);
}

/**
 * Call the destroy functions of the components that we created
 */
Display.prototype.destroy = function() {
  delete this.element;
  delete this.template;

  this.outputList.destroy();
  delete this.outputList;
  delete this.outputElement;

  this.tooltip.destroy();
  delete this.tooltip;

  this.prompt.destroy();
  delete this.prompt;

  this.completer.destroy();
  delete this.completer;
  delete this.completeElement;

  this.inputter.destroy();
  delete this.inputter;
  delete this.inputElement;

  this.focusManager.destroy();
  delete this.focusManager;

  this.requisition.destroy();
  delete this.requisition;

  if (this.displayStyle) {
    this.displayStyle.parentNode.removeChild(this.displayStyle);
  }
  delete this.displayStyle;
};

exports.Display = Display;

/**
 * Utility to help find an element by id, throwing if it wasn't found
 */
function find(doc, element, id) {
  if (!element) {
    element = doc.getElementById(id);
    if (!element) {
      throw new Error('Missing element, id=' + id);
    }
  }
  return element;
}

/**
 * Utility to help find an element by id, creating it if it wasn't found
 */
function insert(sibling, element, id) {
  var doc = sibling.ownerDocument;
  if (!element) {
    element = doc.getElementById('gcli-row-complete');
    if (!element) {
      element = util.createElement(doc, 'div');
      sibling.parentNode.insertBefore(element, sibling.nextSibling);
      element.gcliCreated = true;
    }
  }
  return element;
}


});
