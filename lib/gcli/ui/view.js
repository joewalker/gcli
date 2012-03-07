/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var domtemplate = require('gcli/ui/domtemplate');


/**
 * We want to avoid commands having to create DOM structures because that's
 * messy and because we're going to need to have command output displayed in
 * different documents. A View is a way to wrap an HTML template (for
 * domtemplate) in with the data and options to render the template, so anyone
 * can later run the template in the context of any document.
 * View also cuts out a chunk of boiler place code.
 * @param options The information needed to create the DOM from HTML. Includes:
 * - html (required): The HTML source, probably from a call to require
 * - options (default={}): The domtemplate options. See domtemplate for details
 * - data (default={}): The data to domtemplate. See domtemplate for details.
 * @return An object containing a single function 'appendTo()' which runs the
 * template adding the result to the specified element. Takes 2 parameters:
 * - element (required): the element to add to
 * - clear (default=false): if clear===true then remove all pre-existing
 *   children of 'element' before appending the results of this template.
 */
exports.createView = function(options) {
  if (options.html == null) {
    throw new Error('options.html is missing');
  }

  return {
    /**
     * RTTI. Yeah.
     */
    isView: true,

    /**
     * Run the template against the document to which element belongs.
     * @param element The element to append the result to
     * @param clear Set clear===true to remove all children of element
     */
    appendTo: function(element, clear) {
      // Strict check on the off-chance that we later think of other options
      // and want to replace 'clear' with an 'options' parameter, but want to
      // support backwards compat.
      if (clear === true) {
        util.clearElement(element);
      }

      element.appendChild(this.toDom(element.ownerDocument));
    },

    /**
     * Actually convert the view data into a DOM suitable to be appended to
     * an element
     * @param document to use in realizing the template
     */
    toDom: function(document) {
      var child = util.toDom(document, options.html);
      domtemplate.template(child, options.data || {}, options.options || {});
      return child;
    }
  };
};

/**
 * Utility for use by OutputSingle and OutputTerminal in converting the
 * outputData passed to us by cli.js into a DOM element for display.
 * @param outputData Data from cli.js via canon.commandOutputManager
 * @param element The DOM node to which the data should be written. Existing
 * content of 'element' will be removed before 'outputData' is added.
 */
exports.populateWithOutputData = function(outputData, element) {
  util.clearElement(element);

  var output = outputData.output;
  if (output == null) {
    return;
  }

  var node;
  if (typeof HTMLElement !== 'undefined' && output instanceof HTMLElement) {
    node = output;
  }
  else if (output.isView) {
    node = output.toDom(element.ownerDocument);
  }
  else {
    if (outputData.command.returnType === 'terminal') {
      node = util.createElement(element.ownerDocument, 'textarea');
      node.classList.add('gcli-row-terminal');
      node.readOnly = true;
    }
    else {
      node = util.createElement(element.ownerDocument, 'p');
    }

    util.setContents(node, output.toString());
  }

  element.appendChild(node);
};


});
