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

var Status = require('gcli/types').Status;
var getField = require('gcli/ui/fields').getField;

var argFetchCss = require('text!gcli/ui/arg_fetch.css');
var argFetchHtml = require('text!gcli/ui/arg_fetch.html');


/**
 * A widget to display an inline dialog which allows the user to fill out
 * the arguments to a command.
 * @param options Object containing user customization properties, including:
 * - argFetcherClass: Custom class name when generating the top level element
 *   which allows different layout systems
 * @param components Object that links to other UI components. GCLI provided:
 * - document: The document to use in creating widgets
 * - requisition: The Requisition to fill out
 * - element: The root element to populate
 */
function ArgFetcher(options, components) {
  this.document = components.document || document;
  this.requisition = components.requisition;
  this.inputter = components.inputter;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element = components.element;
  this.element.classList.add(options.argFetcherClass || 'gcli-argfetch');
  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // Populated by template
  this.okElement = null;

  // Pull the HTML into the DOM, but don't add it to the document
  if (argFetchCss != null) {
    this.style = util.importCss(argFetchCss, this.document, 'gcli-arg-fetch');
  }

  this.template = util.toDom(this.document, argFetchHtml);
  this.templateOptions = { allowEval: true, stack: 'arg_fetch.html' };

  this.inputter.onInputChange.add(this.inputChanged, this);
  this.inputChanged();
}

/**
 * Avoid memory leaks
 */
ArgFetcher.prototype.destroy = function() {
  this.inputter.onInputChange.remove(this.inputChanged, this);

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.fields.forEach(function(field) { field.destroy(); });

  delete this.document;
  delete this.element;
  delete this.okElement;
  delete this.template;
};

/**
 * Called whenever the text input of the requisition changes
 */
ArgFetcher.prototype.inputChanged = function() {
  var command = this.requisition.commandAssignment.value;
  if (command && command.exec) {
    var status = this.requisition.getStatus();
    this.okElement.disabled = (status !== Status.VALID);
  }

  // This code was called from Requisition.onCommandChange, so ev.oldValue
  // and ev.newValue are assignments
  var command = this.requisition.commandAssignment.value;
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

    var reqEle = this.template.cloneNode(true);
    domtemplate.template(reqEle, this, this.templateOptions);
    util.clearElement(this.element);
    this.element.appendChild(reqEle);

    var status = this.requisition.getStatus();
    this.okElement.disabled = (status === Status.VALID);

    this.element.style.display = 'block';
  }
};

/**
 * Called by the template process in to get an instance of field for each
 * assignment.
 */
ArgFetcher.prototype.getInputFor = function(assignment) {
  try {
    var newField = getField(assignment.param.type, {
      document: this.document,
      name: assignment.param.name,
      requisition: this.requisition,
      required: assignment.param.isDataRequired,
      named: !assignment.param.isPositionalAllowed
    });

    // BUG 664198 - remove on delete
    newField.onFieldChange.add(function(ev) {
      this.requisition.setAssignment(assignment, ev.conversion.arg,
                                     { matchPadding: true });
    }, this);
    assignment.onAssignmentChange.add(function(ev) {
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

exports.ArgFetcher = ArgFetcher;


});
