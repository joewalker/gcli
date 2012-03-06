/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
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
 * createView is responsible for generating the web UI for GCLI
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
exports.createView = function(options) {
  var doc = options.document || document;

  var displayStyle = undefined;
  if (displayCss != null) {
    displayStyle = util.importCss(displayCss, doc);
  }

  // Configuring the document is complex because on the web side, there is an
  // active desire to have nothing to configure, where as when embedded in
  // Firefox there could be up to 4 documents, some of which can/should be
  // derived from some root element.
  // When a component uses a document to create elements for use under a known
  // root element, then we pass in the element (if we have looked it up
  // already) or an id/document
  var requisition = new Requisition(options.enviroment || {}, doc);

  var focusManager = new FocusManager(options, {
    document: doc
  });

  var inputElement = find(doc, options.inputElement || null, 'gcli-input');
  var inputter = new Inputter(options, {
    requisition: requisition,
    focusManager: focusManager,
    element: inputElement
  });

  // autoResize logic: we want Completer to keep the elements at the same
  // position if we created the completion element, but if someone else created
  // it, then it's their job.
  var completeElement = insert(inputElement,
                         options.completeElement || null, 'gcli-row-complete');
  var completer = new Completer(options, {
    requisition: requisition,
    inputter: inputter,
    autoResize: completeElement.gcliCreated,
    element: completeElement
  });

  var prompt = new Prompt(options, {
    inputter: inputter,
    element: insert(inputElement, options.promptElement || null, 'gcli-prompt')
  });

  var element = find(doc, options.displayElement || null, 'gcli-display');
  element.classList.add('gcli-display');

  var template = util.toDom(doc, displayHtml);
  var elements = {};
  domtemplate.template(template, elements, { stack: 'display.html' });
  element.appendChild(template);

  var tooltip = new Tooltip(options, {
    requisition: requisition,
    inputter: inputter,
    focusManager: focusManager,
    element: elements.tooltip,
    panelElement: elements.panel
  });

  var outputElement =  util.createElement(doc, 'div');
  outputElement.classList.add('gcli-output');
  var outputList = new OutputTerminal(options, {
    requisition: requisition,
    element: outputElement
  });

  element.appendChild(outputElement);

  intro.maybeShowIntro(outputList.commandOutputManager);

  return {
    exec: requisition.exec.bind(requisition),
    update: requisition.update.bind(requisition),

    /**
     * Unregister everything
     */
    destroy: function() {
      outputList.destroy();
      tooltip.destroy();
      prompt.destroy();
      completer.destroy();
      inputter.destroy();
      focusManager.destroy();
      requisition.destroy();

      if (displayStyle) {
        displayStyle.parentNode.removeChild(displayStyle);
      }
    }
  };
};

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
