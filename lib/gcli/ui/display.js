/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var intro = require('gcli/ui/intro');

var Tooltip = require('gcli/ui/tooltip').Tooltip;
var OutputTerminal = require('gcli/ui/output_terminal').OutputTerminal;
var Inputter = require('gcli/ui/inputter').Inputter;
var Completer = require('gcli/ui/completer').Completer;
var FocusManager = require('gcli/ui/focus').FocusManager;

var Requisition = require('gcli/cli').Requisition;

var displayCss = require('text!gcli/ui/display.css');


/**
 * createView is responsible for generating the web UI for GCLI
 * @param options Object containing user customization properties.
 * See the documentation for the other components for more details.
 * Options supported directly include:
 * - document
 * - environment
 * - inputElement
 * - completeElement
 * - dontDecorate
 * - backgroundElement
 * - displayElement
 */
exports.createView = function(options) {
  var doc = options.document || document;

  // Configuring the document is complex because on the web side, there is an
  // active desire to have nothing to configure, where as when embedded in
  // Firefox there could be up to 4 documents, some of which can/should be
  // derived from some root element.
  // When a component uses a document to create elements for use under a known
  // root element, then we pass in the element (if we have looked it up already) or an id/document
  var requisition = new Requisition(options.enviroment, doc);

  var displayStyle = undefined;
  if (displayCss != null) {
    displayStyle = util.importCss(displayCss, doc);
  }

  var focusManager = new FocusManager(options, {
    document: doc
  });

  var inputElement =  findElement(doc, options.inputElement, 'gcli-input');
  var inputter = new Inputter(options, {
    requisition: requisition,
    focusManager: focusManager,
    element: inputElement
  });

  var completeElement = options.completeElement;
  if (!completeElement) {
    completeElement = doc.getElementById('gcli-row-complete');
    if (!completeElement) {
      completeElement = util.createElement(doc, 'div');
      inputElement.parentNode.insertBefore(completeElement,
                                           inputElement.nextSibling);
    }
  }
  var completer = new Completer(options, {
    requisition: requisition,
    element: completeElement,
    inputter: inputter
  });

  var tooltipElement =  util.createElement(doc, 'div');
  var tooltip = new Tooltip(options, {
    element: tooltipElement,
    requisition: requisition,
    inputter: inputter,
    focusManager: focusManager
  });

  var outputElement =  util.createElement(doc, 'div');
  outputElement.classList.add('gcli-display-output');
  var outputList = new OutputTerminal(options, {
    requisition: requisition,
    element: outputElement
  });

  var element = findElement(doc, options.displayElement, 'gcli-display');
  element.classList.add('gcli-display');
  element.appendChild(tooltipElement);
  element.appendChild(outputElement);

  intro.maybeShowIntro(doc, outputList.commandOutputManager, requisition);

  return {
    exec: requisition.exec.bind(requisition),
    update: requisition.update.bind(requisition),

    /**
     * Unregister everything
     */
    destroy: function() {
      outputList.destroy();
      outputList = undefined;

      if (displayStyle) {
        displayStyle.parentNode.removeChild(displayStyle);
        displayStyle = undefined;
      }

      completer.destroy();
      inputter.destroy();
      focusManager.destroy();
      tooltip.destroy();
      requisition.destroy();

      completer = undefined;
      tooltip = undefined;
      inputter = undefined;
      focusManager = undefined;
      outputElement = undefined;
      outputList = undefined;
      requisition = undefined;
    }
  };
};

/**
 * Utility to help find an element by id, throwing if it wasn't found
 */
function findElement(doc, element, id) {
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
function getElement(doc, element, id) {
  if (!element) {
    element = doc.getElementById(id);
    if (!element) {
      throw new Error('Missing element, id=' + id);
    }
  }
  return element;
}


});
