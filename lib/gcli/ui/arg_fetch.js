/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var argFetch = exports;


var dom = require('gcli/util').dom;
var Status = require('gcli/types').Status;

var getField = require('gcli/ui/field').getField;
var domtemplate = require('gcli/ui/domtemplate');

var editorCss = require('text!gcli/ui/arg_fetch.css');
var argFetchHtml = require('text!gcli/ui/arg_fetch.html');


/**
 * A widget to display an inline dialog which allows the user to fill out
 * the arguments to a command.
 * @param options An object containing the customizations, which include:
 * - document: The document to use in creating widgets
 * - requisition: The Requisition to fill out
 * - argFetcherClass: Custom class name when generating the top level element
 *   which allows different layout systems
 */
function ArgFetcher(options) {
  this.document = options.document || document;
  this.requisition = options.requisition;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  dom.createElement(this.document, 'div');
  this.element.className = options.argFetcherClass || 'gcli-argfetch';
  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // Populated by template
  this.okElement = null;

  // Pull the HTML into the DOM, but don't add it to the document
  if (editorCss != null) {
    this.style = dom.importCss(editorCss, this.document);
  }

  var templates = dom.createElement(this.document, 'div');
  dom.setInnerHtml(templates, argFetchHtml);
  this.reqTempl = templates.querySelector('.gcli-af-template');

  this.requisition.commandChange.add(this.onCommandChange, this);
  this.requisition.inputChange.add(this.onInputChange, this);

  this.onCommandChange();
}

/**
 * Avoid memory leaks
 */
ArgFetcher.prototype.destroy = function() {
  this.requisition.inputChange.remove(this.onInputChange, this);
  this.requisition.commandChange.remove(this.onCommandChange, this);

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.fields.forEach(function(field) { field.destroy(); });

  delete this.document;
  delete this.element;
  delete this.okElement;
  delete this.reqTempl;
};

/**
 * Called whenever the command part of the requisition changes
 */
ArgFetcher.prototype.onCommandChange = function(ev) {
  var command = this.requisition.commandAssignment.getValue();
  if (!command || !command.exec) {
    this.element.style.display = 'none';
  }
  else {
    if (ev && ev.oldValue === ev.newValue) {
      // Just the text has changed
      return;
    }

    this.fields.forEach(function(field) { field.destroy(); });
    this.fields = [];

    var reqEle = this.reqTempl.cloneNode(true);
    domtemplate.template(reqEle, this,
            { allowEval: true, stack: 'arg_fetch.html' });
    dom.clearElement(this.element);
    this.element.appendChild(reqEle);

    var status = this.requisition.getStatus();
    this.okElement.disabled = (status === Status.VALID);

    this.element.style.display = 'block';
  }
};

/**
 * Called whenever the text input of the requisition changes
 */
ArgFetcher.prototype.onInputChange = function(ev) {
  var command = this.requisition.commandAssignment.getValue();
  if (command && command.exec) {
    var status = this.requisition.getStatus();
    this.okElement.disabled = (status !== Status.VALID);
  }
};

/**
 * Called by the template process in #onCommandChange() to get an instance
 * of field for each assignment.
 */
ArgFetcher.prototype.getInputFor = function(assignment) {
  try {
    var newField = getField(assignment.param.type, {
      document: this.document,
      type: assignment.param.type,
      name: assignment.param.name,
      requisition: this.requisition,
      required: assignment.param.isDataRequired(),
      named: !assignment.param.isPositionalAllowed()
    });

    // BUG 664198 - remove on delete
    newField.fieldChanged.add(function(ev) {
      assignment.setConversion(ev.conversion);
    }, this);
    assignment.assignmentChange.add(function(ev) {
      newField.setConversion(ev.conversion);
    }.bind(this));

    this.fields.push(newField);
    newField.setConversion(this.assignment.conversion);

    // Bug 681894: we add the field as a property of the assignment so that
    // #linkMessageElement() can call 'field.setMessageElement(element)'
    assignment.field = newField;

    return newField.element;
  }
  catch (ex) {
    // This is called from within template() which can make tracing errors hard
    // so we log here if anything goes wrong
    console.error(ex);
    return '';
  }
};

/**
 * Called by the template to setup an mutable message field
 */
ArgFetcher.prototype.linkMessageElement = function(assignment, element) {
  // Bug 681894: See comment in getInputFor()
  var field = assignment.field;
  delete assignment.field;
  if (field == null) {
    console.error('Missing field for ' + assignment.param.name);
    return 'Missing field';
  }
  field.setMessageElement(element);
  return '';
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onFormOk = function(ev) {
  this.requisition.exec();
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onFormCancel = function(ev) {
  this.requisition.clear();
};

/**
 * Change how much vertical space this dialog can take up
 */
ArgFetcher.prototype.setMaxHeight = function(height, isTooBig) {
  this.fields.forEach(function(field) {
    if (field.menu) {
      // Magic number alert: 105 is roughly the size taken up by the rest of
      // the dialog for the '{' command. We could spend ages calculating 105
      // by doing math on the various components that contribute to the 105,
      // but I don't think that would make it significantly less fragile under
      // refactoring. Plus this works.
      field.menu.setMaxHeight(height - 105);
    }
  });
};

argFetch.ArgFetcher = ArgFetcher;


});
