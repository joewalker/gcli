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
var Templater = require('gcli/ui/domtemplate').Templater;

var editorCss = require('text!gcli/ui/arg_fetch.css');
var argFetchHtml = require('text!gcli/ui/arg_fetch.html');


/**
 * A widget to display an inline dialog which allows the user to fill out
 * the arguments to a command.
 * @param doc The document to use in creating widgets
 * @param requ The Requisition to fill out
 */
function ArgFetcher(doc, requ) {
  this.doc = doc;
  this.requ = requ;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.doc) {
    throw new Error('No document');
  }

  this.element =  dom.createElement('div', null, this.doc);
  this.element.className = 'gcliCliEle';
  // We cache the fields we create so we can destroy them later
  this.fields = [];

  this.tmpl = new Templater();
  // Populated by template
  this.okElement = null;

  // Pull the HTML into the DOM, but don't add it to the document
  if (!ArgFetcher.reqTempl) {
    dom.importCssString(editorCss, this.doc);

    var templates = dom.createElement('div', null, this.doc);
    dom.setInnerHtml(templates, argFetchHtml);
    ArgFetcher.reqTempl = templates.querySelector('#gcliReqTempl');
  }

  this.requ.commandChange.add(this.onCommandChange, this);
  this.requ.inputChange.add(this.onInputChange, this);
}

/**
 * Called whenever the command part of the requisition changes
 */
ArgFetcher.prototype.onCommandChange = function(ev) {
  var command = this.requ.commandAssignment.getValue();
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

    var reqEle = ArgFetcher.reqTempl.cloneNode(true);
    this.tmpl.processNode(reqEle, this);
    dom.clearElement(this.element);
    this.element.appendChild(reqEle);

    var status = this.requ.getStatus();
    this.okElement.disabled = (status === Status.VALID);

    this.element.style.display = 'block';
  }
};

/**
 * Called whenever the text input of the requisition changes
 */
ArgFetcher.prototype.onInputChange = function(ev) {
  var command = this.requ.commandAssignment.getValue();
  if (command && command.exec) {
    var status = this.requ.getStatus();
    this.okElement.disabled = (status !== Status.VALID);
  }
};

/**
 * Called by the template process in #onCommandChange() to get an instance
 * of field for each assignment.
 */
ArgFetcher.prototype.getInputFor = function(assignment) {
  var newField = getField(assignment.param.type, {
    document: this.doc,
    type: assignment.param.type,
    name: assignment.param.name,
    requisition: this.requ,
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
  this.requ.exec();
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onFormCancel = function(ev) {
  this.requ.clear();
};

argFetch.ArgFetcher = ArgFetcher;


});
