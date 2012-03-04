/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var util = require('gcli/util');
var canon = require('gcli/canon');
var view = require('gcli/ui/view');
var outputViewCss = require('text!gcli/ui/output_view.css');


/**
 * A wrapper for a set of rows|command outputs.
 * Register with the canon to be notified when commands have output to be
 * displayed.
 * @param options Object containing user customization properties, including:
 * - commandOutputManager
 * @param components Object that links to other UI components. GCLI provided:
 * - element: Root element to populate
 * - requisition (optional): A click/double-click to an input row causes the
 *   command to be sent to the input/executed if we know the requisition use
 */
function OutputSingle(options, components) {
  this.requisition = components.requisition;

  this.element = components.element;
  this.element.classList.add('gcli-row-out');
  this.element.setAttribute('aria-live', 'assertive');

  this.commandOutputManager = options.commandOutputManager ||
          canon.commandOutputManager;
  this.commandOutputManager.onOutput.add(this.onOutputCommandChange, this);

  if (outputViewCss != null) {
    this.style = util.importCss(outputViewCss, this.element.ownerDocument);
  }
}

/**
 * Avoid memory leaks
 */
OutputSingle.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.commandOutputManager.onOutput.remove(this.onOutputCommandChange, this);
  delete this.commandOutputManager;

  delete this.element;
};

/**
 * Monitor for new command executions
 */
OutputSingle.prototype.onOutputCommandChange = function(ev) {
  view.populateWithOutputData(ev.output, this.element);
};

exports.OutputSingle = OutputSingle;


});
