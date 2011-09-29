/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var dom = require('gcli/util').dom;
var event = require('gcli/util').event;

var canon = require('gcli/canon');
var Templater = require('gcli/ui/domtemplate').Templater;

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
function CommandOutputListView(options) {
  this.document = options.document;
  this.inputter = options.inputter;
  this.requisition = options.requisition;
  this.commandOutputManager = options.commandOutputManager || canon.commandOutputManager;

  this.element = options.element || 'gcliCommandOutput';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.document.getElementById(name);

    if (!this.element) {
      this.autoHide = true;

      this.element = dom.createElement(this.document, 'div');
    }
  }

  dom.addCssClass(this.element, 'gcliCommandOutput');

  this.commandOutputManager.addListener(this.onOutputCommandChange, this);
}

/**
 * Avoid memory leaks
 */
CommandOutputListView.prototype.destroy = function() {
  delete this.document;
  delete this.commandOutputManager;
  delete this._row;
};

CommandOutputListView.prototype.onOutputCommandChange = function(ev) {
  if (!ev.output.view) {
    ev.output.view = new CommandOutputView(ev.output, this);
  }
  ev.output.view.onChange(ev);
};

/**
 * Popup likes to be able to control the height of its children
 */
CommandOutputListView.prototype.setHeight = function(height) {
  this.element.style.height = height + 'px';
};

exports.CommandOutputListView = CommandOutputListView;


/**
 * Adds a row to the CLI output display
 */
function CommandOutputView(outputData, commandOutputList) {
  this.outputData = outputData;
  this.commandOutputList = commandOutputList;

  this.imageUrl = imageUrl;

  // Elements attached to this by the templater.
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

  // Setup the template on first use
  if (!CommandOutputView._row) {
    if (commandOutputViewCss != null) {
      dom.importCssString(commandOutputViewCss, this.commandOutputList.document);
    }

    var templates = dom.createElement(this.commandOutputList.document, 'div');
    dom.setInnerHtml(templates, commandOutputViewHtml);
    CommandOutputView._row = templates.querySelector('.gcliRow');
  }

  new Templater().processNode(CommandOutputView._row.cloneNode(true), this);

  this.commandOutputList.element.appendChild(this.elems.rowin);
  this.commandOutputList.element.appendChild(this.elems.rowout);
}

/**
 * A single click on an invocation line in the console copies the command
 * to the command line
 */
CommandOutputView.prototype.copyToInput = function() {
  if (this.commandOutputList.inputter) {
    this.commandOutputList.inputter.setInput(this.outputData.typed);
  }
};

/**
 * A double click on an invocation line in the console executes the command
 */
CommandOutputView.prototype.execute = function(ev) {
  if (this.commandOutputList.requisition) {
    this.commandOutputList.requisition.exec({ typed: this.outputData.typed });
  }
};

CommandOutputView.prototype.hideOutput = function(ev) {
  this.elems.output.style.display = 'none';
  dom.addCssClass(this.elems.hide, 'cmd_hidden');
  dom.removeCssClass(this.elems.show, 'cmd_hidden');

  event.stopPropagation(ev);
};

CommandOutputView.prototype.showOutput = function(ev) {
  this.elems.output.style.display = 'block';
  dom.removeCssClass(this.elems.hide, 'cmd_hidden');
  dom.addCssClass(this.elems.show, 'cmd_hidden');

  event.stopPropagation(ev);
};

CommandOutputView.prototype.remove = function(ev) {
  this.commandOutputList.element.removeChild(this.elems.rowin);
  this.commandOutputList.element.removeChild(this.elems.rowout);
  event.stopPropagation(ev);
};

CommandOutputView.prototype.onChange = function(ev) {
  dom.setInnerHtml(this.elems.duration, this.outputData.duration != null ?
    'completed in ' + (this.outputData.duration / 1000) + ' sec ' :
    '');

  if (this.outputData.completed) {
    dom.addCssClass(this.elems.prompt, 'gcliComplete');
  }
  if (this.outputData.error) {
    dom.addCssClass(this.elems.prompt, 'gcliError');
  }

  dom.clearElement(this.elems.output);

  var node;
  if (this.outputData.output != null) {
    if (this.outputData.output instanceof HTMLElement) {
      this.elems.output.appendChild(this.outputData.output);
    }
    else {
      node = dom.createElement(this.commandOutputList.document, 'p');
      dom.setInnerHtml(node, this.outputData.output.toString());
      this.elems.output.appendChild(node);
    }
  }

  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.commandOutputList.element.scrollHeight,
      this.commandOutputList.element.clientHeight);
  this.commandOutputList.element.scrollTop =
      scrollHeight - this.commandOutputList.element.clientHeight;

  dom.setCssClass(this.elems.output, 'cmd_error', this.outputData.error);

  this.elems.throb.style.display = this.outputData.completed ? 'none' : 'block';
};

exports.CommandOutputView = CommandOutputView;


});
