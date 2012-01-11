/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var dom = require('gcli/util').dom;

var canon = require('gcli/canon');
var domtemplate = require('gcli/ui/domtemplate');

var commandOutputViewCss = require('text!gcli/ui/command_output_view.css');
var commandOutputViewHtml = require('text!gcli/ui/command_output_view.html');


/**
 * Work out the path for images.
 * This should probably live in some utility area somewhere, but it's kind of
 * dependent on the implementation of require, and there isn't currently any
 * better place for it.
 */
function imageUrl(path) {
  try {
    return require('text!gcli/ui/' + path);
  }
  catch (ex) {
    var filename = module.id.split('/').pop() + '.js';
    var imagePath;

    if (module.uri.substr(-filename.length) !== filename) {
      console.error('Can\'t work out path from module.uri/module.id');
      return path;
    }

    if (module.uri) {
      var end = module.uri.length - filename.length - 1;
      return module.uri.substr(0, end) + '/' + path;
    }

    return filename + '/' + path;
  }
}


/**
 * A wrapper for a set of rows|command outputs.
 * Register with the canon to be notified when commands have output to be
 * displayed.
 */
function CommandOutputListView(element, options) {
  this.element = element;
  this.document = options.document || document;
  this.inputter = options.inputter;
  this.requisition = options.requisition;

  this.commandOutputManager = options.commandOutputManager ||
          canon.commandOutputManager;
  this.commandOutputManager.addListener(this.onOutputCommandChange, this);

  if (commandOutputViewCss != null) {
    this.style = dom.importCss(commandOutputViewCss, this.document);
  }

  var templates = dom.createElement(this.document, 'div');
  dom.setInnerHtml(templates, commandOutputViewHtml);
  this._row = templates.querySelector('.gcli-row');
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
  delete this.document;
  delete this._row;
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

  this.imageUrl = imageUrl;

  // Elements attached to this by template().
  this.elems = {
    rowin: null,
    rowout: null,
    output: null,
    hide: null,
    show: null,
    duration: null,
    throb: null,
    prompt: null
  };

  domtemplate.template(this.listView._row.cloneNode(true), this,
          { allowEval: true, stack: 'command_output_view.html' });

  this.listView.element.appendChild(this.elems.rowin);
  this.listView.element.appendChild(this.elems.rowout);
}

/**
 * A single click on an invocation line in the console copies the command
 * to the command line
 */
CommandOutputView.prototype.copyToInput = function() {
  if (this.listView.inputter) {
    this.listView.inputter.setInput(this.outputData.typed);
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
  this.elems.output.style.display = 'none';
  this.elems.hide.classList.add('cmd_hidden');
  this.elems.show.classList.remove('cmd_hidden');

  ev.stopPropagation();
};

CommandOutputView.prototype.showOutput = function(ev) {
  this.elems.output.style.display = 'block';
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
  dom.setInnerHtml(this.elems.duration, this.outputData.duration != null ?
    'completed in ' + (this.outputData.duration / 1000) + ' sec ' :
    '');

  if (this.outputData.completed) {
    this.elems.prompt.classList.add('gcli-row-complete');
  }
  if (this.outputData.error) {
    this.elems.prompt.classList.add('gcli-row-error');
  }

  dom.clearElement(this.elems.output);

  var node;
  var output = this.outputData.output;
  if (output != null) {
    var isElement = typeof HTMLElement === 'object' ?
        output instanceof HTMLElement :
        typeof output === 'object' && output.nodeType === 1 &&
            typeof output.nodeName === 'string';

    if (isElement) {
      this.elems.output.appendChild(output);
    }
    else {
      node = dom.createElement(this.listView.document, 'p');
      dom.setInnerHtml(node, output.toString());
      this.elems.output.appendChild(node);
    }
  }

  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.listView.element.scrollHeight,
      this.listView.element.clientHeight);
  this.listView.element.scrollTop =
      scrollHeight - this.listView.element.clientHeight;

  if (this.outputData.error) {
    this.elems.output.classList.add('cmd_error');
  }
  else {
    this.elems.output.classList.remove('cmd_error');
  }

  this.elems.throb.style.display = this.outputData.completed ? 'none' : 'block';
};

exports.CommandOutputView = CommandOutputView;


});
