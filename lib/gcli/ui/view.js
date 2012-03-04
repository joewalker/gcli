/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');


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
    return undefined;
  }

  var node;
  if (output instanceof HTMLElement) {
    node = output;
  }
  else {
    var returnType = outputData.command.returnType;
    var nodeName = (returnType === 'terminal') ? 'pre' : 'p';

    node = util.createElement(document, nodeName);
    util.setContents(node, output.toString());
  }

  element.appendChild(node);
};


});
