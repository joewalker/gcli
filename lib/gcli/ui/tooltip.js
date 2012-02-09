/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;
var Status = require('gcli/types').Status;
var CommandAssignment = require('gcli/cli').CommandAssignment;

var getField = require('gcli/ui/field').getField;
var domtemplate = require('gcli/ui/domtemplate');

var tooltipCss = require('text!gcli/ui/tooltip.css');
var tooltipHtml = require('text!gcli/ui/tooltip.html');


/**
 * A widget to display an inline dialog which allows the user to fill out
 * the arguments to a command.
 * @param options An object containing the customizations, which include:
 * - document: The document to use in creating widgets
 * - requisition: The Requisition to fill out
 * - tooltipClass: Custom class name when generating the top level element
 *   which allows different layout systems
 */
function Tooltip(options) {
  this.document = options.document || document;
  this.inputter = options.inputter;
  this.requisition = options.requisition;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  dom.createElement(this.document, 'div');
  this.element.className = options.tooltipClass || 'gcli-tooltip';
  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // Pull the HTML into the DOM, but don't add it to the document
  if (tooltipCss != null) {
    this.style = dom.importCss(tooltipCss, this.document);
  }

  this.template = dom.toDom(this.document, tooltipHtml);
  this.templateOptions = { blankNullUndefined: true, stack: 'tooltip.html' };

  this.inputter.assignmentChange.add(this.onAssignmentChange, this);
  this.onAssignmentChange({});
}

/**
 * Avoid memory leaks
 */
Tooltip.prototype.destroy = function() {
  this.inputter.assignmentChange.remove(this.onAssignmentChange, this);

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.field.destroy();

  delete this.document;
  delete this.element;
  delete this.template;
};

/**
 * Called whenever the assignment that we're providing help with changes
 */
Tooltip.prototype.onAssignmentChange = function(ev) {
  this.assignment = ev.assignment;

  if (this.assignment instanceof CommandAssignment) {
    var command = this.requisition.commandAssignment.getValue();
    if (!command || !command.exec) {
      this.element.style.display = 'none';
      return;
    }
  }

  if (!this.assignment) {
    this.element.style.display = 'none';
    return;
  }

  if (this.field) {
    this.field.destroy();
  }

  this.field = getField(this.assignment.param.type, {
    document: this.document,
    type: this.assignment.param.type,
    name: this.assignment.param.name,
    requisition: this.requisition,
    required: this.assignment.param.isDataRequired,
    named: !this.assignment.param.isPositionalAllowed,
    tooltip: true
  });

  // BUG 664198 - remove on delete
  this.field.fieldChanged.add(this.onFieldChange, this);
  this.assignment.assignmentChange.add(this.onAssignmentValueChange, this);

  this.field.setConversion(this.assignment.conversion);

  // Filled in by the template process
  this.message = undefined;

  var contents = this.template.cloneNode(true);
  domtemplate.template(contents, this, this.templateOptions);
  dom.clearElement(this.element);
  this.element.appendChild(contents);
  this.element.style.display = 'block';

  this.field.setMessageElement(this.message);
};

/**
 * Called by the fieldChanged event on the current Field
 */
Tooltip.prototype.onFieldChange = function(ev) {
  this.assignment.setConversion(ev.conversion);
};

/**
 * Called by the assignmentChange event on the current Assignment
 */
Tooltip.prototype.onAssignmentValueChange = function(ev) {
  this.field.setConversion(ev.conversion);

  if (this.shouldBeHidden()) {
    this.element.style.display = 'none';
    return;
  }
};

exports.Tooltip = Tooltip;


});
