/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var util = require('gcli/util');

var canon = require('gcli/canon');
var domtemplate = require('gcli/ui/domtemplate');

var commandOutputViewCss = require('text!gcli/ui/command_output_view.css');
var commandOutputViewHtml = require('text!gcli/ui/command_output_view.html');


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
function CommandOutputListView(options, components) {
  this.element = components.element;
  this.requisition = components.requisition;

  this.commandOutputManager = options.commandOutputManager ||
          canon.commandOutputManager;
  this.commandOutputManager.onOutput.add(this.onOutputCommandChange, this);

  var document = components.element.ownerDocument;
  if (commandOutputViewCss != null) {
    this.style = util.importCss(commandOutputViewCss, document);
  }

  this.template = util.toDom(document, commandOutputViewHtml);
  this.templateOptions = { allowEval: true, stack: 'command_output_view.html' };
}

/**
 * Avoid memory leaks
 */
CommandOutputListView.prototype.destroy = function() {
  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.element;
  delete this.template;
};

/**
 * Monitor for new command executions
 */
CommandOutputListView.prototype.onOutputCommandChange = function(ev) {
  if (!ev.output.view) {
    ev.output.view = new CommandOutputView(ev.output, this);
  }
  ev.output.view.onChange(ev);
};

/**
 * Display likes to be able to control the height of its children
 */
CommandOutputListView.prototype.setHeight = function(height) {
  this.element.style.height = height + 'px';
};

exports.CommandOutputListView = CommandOutputListView;


/**
 * Adds a row to the CLI output display
 */
function CommandOutputView(outputData, commandOutputListView) {
  this.outputData = outputData;
  this.listView = commandOutputListView;

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

  var template = this.listView.template.cloneNode(true);
  domtemplate.template(template, this, this.listView.templateOptions);

  this.listView.element.appendChild(this.elems.rowin);
  this.listView.element.appendChild(this.elems.rowout);
}

/**
 * Only display a prompt if there is a command, otherwise, leave blank
 */
Object.defineProperty(CommandOutputView.prototype, 'prompt', {
  get: function() {
    return this.outputData.canonical ? '\u00bb' : '';
  },
  enumerable: true
});

/**
 * A single click on an invocation line in the console copies the command
 * to the command line
 */
CommandOutputView.prototype.copyToInput = function() {
  if (this.listView.requisition) {
    this.listView.requisition.update(this.outputData.typed);
  }
};

/**
 * A double click on an invocation line in the console executes the command
 */
CommandOutputView.prototype.execute = function(ev) {
  if (this.listView.requisition) {
    this.listView.requisition.exec({ typed: this.outputData.typed });
  }
};

CommandOutputView.prototype.hideOutput = function(ev) {
  this.elems.rowout.style.display = 'none';
  this.elems.hide.classList.add('cmd_hidden');
  this.elems.show.classList.remove('cmd_hidden');

  ev.stopPropagation();
};

CommandOutputView.prototype.showOutput = function(ev) {
  this.elems.rowout.style.display = 'block';
  this.elems.hide.classList.remove('cmd_hidden');
  this.elems.show.classList.add('cmd_hidden');

  ev.stopPropagation();
};

CommandOutputView.prototype.remove = function(ev) {
  this.listView.element.removeChild(this.elems.rowin);
  this.listView.element.removeChild(this.elems.rowout);

  ev.stopPropagation();
};

CommandOutputView.prototype.onChange = function(ev) {
  var document = this.elems.rowout.ownerDocument;
  var duration = this.outputData.duration != null ?
          'completed in ' + (this.outputData.duration / 1000) + ' sec ' :
          '';
  duration = document.createTextNode(duration);
  this.elems.duration.appendChild(duration);

  if (this.outputData.completed) {
    this.elems.prompt.classList.add('gcli-row-complete');
  }
  if (this.outputData.error) {
    this.elems.prompt.classList.add('gcli-row-error');
  }

  util.clearElement(this.elems.rowout);

  var node;
  var output = this.outputData.output;
  if (output != null) {
    var isElement = typeof HTMLElement === 'object' ?
        output instanceof HTMLElement :
        typeof output === 'object' && output.nodeType === 1 &&
            typeof output.nodeName === 'string';

    if (isElement) {
      this.elems.rowout.appendChild(output);
    }
    else {
      var returnType = this.outputData.command.returnType;
      var nodeName = (returnType === 'terminal') ? 'pre' : 'p';

      node = util.createElement(document, nodeName);
      util.setContents(node, output.toString());
      this.elems.rowout.appendChild(node);
    }
  }

  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.listView.element.scrollHeight,
      this.listView.element.clientHeight);
  this.listView.element.scrollTop =
      scrollHeight - this.listView.element.clientHeight;

  this.elems.throb.style.display = this.outputData.completed ? 'none' : 'block';
};

exports.CommandOutputView = CommandOutputView;


});
