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

'use strict';

var util = require('util/util');
var domtemplate = require('util/domtemplate');

var canon = require('gcli/canon');
var converters = require('gcli/converters');

var outputViewCss = require('text!gcli/ui/output_view.css');
var outputViewHtml = require('text!gcli/ui/output_terminal.html');


/**
 * A wrapper for a set of rows|command outputs.
 * Register with the canon to be notified when commands have output to be
 * displayed.
 * @param options Object containing user customization properties, although
 * none are currently supported
 * @param components Object that links to other UI components. GCLI provided:
 * - element: Root element to populate
 * - requisition (optional): A click/double-click to an input row causes the
 *   command to be sent to the input/executed if we know the requisition use
 */
function OutputTerminal(options, components) {
  this.element = components.element;
  this.requisition = components.requisition;

  this.requisition.commandOutputManager.onOutput.add(this.outputted, this);

  var document = components.element.ownerDocument;
  if (outputViewCss != null) {
    this.style = util.importCss(outputViewCss, document, 'gcli-output-view');
  }

  this.template = util.toDom(document, outputViewHtml);
  this.templateOptions = { allowEval: true, stack: 'output_terminal.html' };
}

/**
 * Avoid memory leaks
 */
OutputTerminal.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.requisition.commandOutputManager.onOutput.remove(this.outputted, this);

  delete this.requisition;
  delete this.element;
  delete this.template;
};

/**
 * Monitor for new command executions
 */
OutputTerminal.prototype.outputted = function(ev) {
  if (ev.output.hidden) {
    return;
  }

  ev.output.view = new OutputView(ev.output, this);
};

/**
 * Display likes to be able to control the height of its children
 */
OutputTerminal.prototype.setHeight = function(height) {
  this.element.style.height = height + 'px';
};

exports.OutputTerminal = OutputTerminal;


/**
 * Adds a row to the CLI output display
 */
function OutputView(output, outputTerminal) {
  this.output = output;
  this.outputTerminal = outputTerminal;

  this._outputted = this._outputted.bind(this);
  this.url = util.createUrlLookup(module);

  // Elements attached to this by template().
  this.elems = {
    rowin: null,
    rowout: null,
    hide: null,
    show: null,
    duration: null,
    throb: null,
    prompt: null
  };

  var template = this.outputTerminal.template.cloneNode(true);
  domtemplate.template(template, this, this.outputTerminal.templateOptions);

  this.outputTerminal.element.appendChild(this.elems.rowin);
  this.outputTerminal.element.appendChild(this.elems.rowout);

  this.output.onClose.add(this.closed, this);
  this.output.promise.then(this._outputted, this._outputted);

  this.scrollToBottom();
}

OutputView.prototype.destroy = function() {
  this.output.onClose.remove(this.closed, this);

  this.outputTerminal.element.removeChild(this.elems.rowin);
  this.outputTerminal.element.removeChild(this.elems.rowout);

  delete this.output;
  delete this.outputTerminal;
  delete this.url;
  delete this.elems;
};

/**
 * Only display a prompt if there is a command, otherwise, leave blank
 */
Object.defineProperty(OutputView.prototype, 'prompt', {
  get: function() {
    return this.output.canonical ? '\u00bb' : '';
  },
  enumerable: true
});

/**
 * A single click on an invocation line in the console copies the command
 * to the command line
 */
OutputView.prototype.copyToInput = function() {
  if (this.outputTerminal.requisition) {
    this.outputTerminal.requisition.update(this.output.typed);
  }
};

/**
 * A double click on an invocation line in the console executes the command
 */
OutputView.prototype.execute = function(ev) {
  if (this.outputTerminal.requisition) {
    this.outputTerminal.requisition.updateExec(this.output.typed);
  }
};

OutputView.prototype.hideOutput = function(ev) {
  this.elems.rowout.style.display = 'none';
  this.elems.hide.classList.add('cmd_hidden');
  this.elems.show.classList.remove('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.showOutput = function(ev) {
  this.elems.rowout.style.display = 'block';
  this.elems.hide.classList.remove('cmd_hidden');
  this.elems.show.classList.add('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.closed = function(ev) {
  this.destroy();
};

OutputView.prototype._outputted = function(ev) {
  var document = this.elems.rowout.ownerDocument;
  var duration = this.output.duration != null ?
          'completed in ' + (this.output.duration / 1000) + ' sec ' :
          '';
  duration = document.createTextNode(duration);
  this.elems.duration.appendChild(duration);

  if (this.output.completed) {
    this.elems.prompt.classList.add('gcli-row-complete');
  }
  if (this.output.error) {
    this.elems.prompt.classList.add('gcli-row-error');
  }

  util.clearElement(this.elems.rowout);
  var conversionContext = this.outputTerminal.requisition.conversionContext;
  var nodePromise = converters.convert(this.output.data,
                                       this.output.type, 'dom',
                                       conversionContext);
  nodePromise.then(function(node) {
    util.linksToNewTab(node);
    this.elems.rowout.appendChild(node);

    this.scrollToBottom();

    this.elems.throb.style.display = this.output.completed ? 'none' : 'block';
  }.bind(this));
};

OutputView.prototype.scrollToBottom = function() {
  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.outputTerminal.element.scrollHeight,
                              this.outputTerminal.element.clientHeight);
  this.outputTerminal.element.scrollTop =
                      scrollHeight - this.outputTerminal.element.clientHeight;
};

exports.OutputView = OutputView;


});
