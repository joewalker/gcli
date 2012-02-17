/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var CommandAssignment = require('gcli/cli').CommandAssignment;

var fields = require('gcli/ui/fields');
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
  this.focusManager = options.focusManager;

  // FF can be really hard to debug if doc is null, so we check early on
  if (!this.document) {
    throw new Error('No document');
  }

  this.element =  util.createElement(this.document, 'div');
  this.element.className = options.tooltipClass || 'gcli-tooltip';
  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // Pull the HTML into the DOM, but don't add it to the document
  if (tooltipCss != null) {
    this.style = util.importCss(tooltipCss, this.document);
  }

  this.template = util.toDom(this.document, tooltipHtml);
  this.templateOptions = { blankNullUndefined: true, stack: 'tooltip.html' };

  this.inputter.onChoiceChange.add(this.onChoiceChange, this);
  this.inputter.onAssignmentChange.add(this.onAssignmentChange, this);
  this.onAssignmentChange({ assignment: this.inputter.assignment });

  this.focusManager.onFocus.add(this.show, this);
  this.focusManager.onBlur.add(this.hide, this);
  this.focusManager.addMonitoredElement(this.inputter.element, 'display');
}

/**
 * Avoid memory leaks
 */
Tooltip.prototype.destroy = function() {
  this.inputter.onAssignmentChange.remove(this.onAssignmentChange, this);
  this.inputter.onChoiceChange.remove(this.onChoiceChange, this);

  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element);
    this.focusManager.onFocus.remove(this.tooltip.show, this.tooltip);
    this.focusManager.onBlur.remove(this.tooltip.hide, this.tooltip);
  }

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.field.onFieldChange.remove(this.onFieldChange, this);
  this.field.destroy();

  delete this.focusManager;
  delete this.document;
  delete this.element;
  delete this.template;
};

/**
 * Called whenever the assignment that we're providing help with changes
 */
Tooltip.prototype.onAssignmentChange = function(ev) {
  if (this.assignment) {
    this.assignment.onAssignmentChange.remove(this.onAssignmentValueChange, this);
  }
  this.assignment = ev.assignment;

  if (this.field) {
    this.field.onFieldChange.remove(this.onFieldChange, this);
    this.field.destroy();
  }

  this.field = fields.getField(this.assignment.param.type, {
    document: this.document,
    name: this.assignment.param.name,
    requisition: this.requisition,
    required: this.assignment.param.isDataRequired,
    named: !this.assignment.param.isPositionalAllowed,
    tooltip: true
  });

  this.focusManager.setImportantFieldFlag(this.field.isImportant);

  this.field.onFieldChange.add(this.onFieldChange, this);
  this.assignment.onAssignmentChange.add(this.onAssignmentValueChange, this);

  this.field.setConversion(this.assignment.conversion);

  // Filled in by the template process
  this.errorEle = undefined;
  this.descriptionEle = undefined;
  this.highlightEle = undefined;

  var contents = this.template.cloneNode(true);
  domtemplate.template(contents, this, this.templateOptions);
  util.clearElement(this.element);
  this.element.appendChild(contents);
  this.element.style.display = 'block';

  this.field.setMessageElement(this.errorEle);

  this._updatePosition();
};

/**
 * Forward the event to the current field
 */
Tooltip.prototype.onChoiceChange = function(ev) {
  if (this.field && this.field.setChoiceIndex) {
    var choice = this.assignment.conversion.constrainPredictionIndex(ev.choice);
    this.field.setChoiceIndex(choice);
  }
};

/**
 * Called by the onFieldChange event on the current Field
 */
Tooltip.prototype.onFieldChange = function(ev) {
  this.assignment.setConversion(ev.conversion);

  // Nasty hack, the inputter won't know about the text change yet, so it will
  // get it's calculations wrong. We need to wait until the current set of
  // changes has had a chance to propagate
  this.document.defaultView.setTimeout(function() {
    this.inputter.focus();
  }.bind(this), 10);
};

/**
 * Called by the onAssignmentChange event on the current Assignment
 */
Tooltip.prototype.onAssignmentValueChange = function(ev) {
  this.field.setConversion(ev.conversion);
  util.setContents(this.descriptionEle, this.description);

  this._updatePosition();
};

/**
 * Called to move the tooltip to the correct horizontal position
 */
Tooltip.prototype._updatePosition = function() {
  var dimensions = this.getDimensionsOfAssignment();
  // 10 is roughly the width of a char
  this.element.style.left = (dimensions.start * 10) + 'px';
};

/**
 * Returns a object containing 'start' and 'end' properties which identify the
 * number of pixels from the left hand edge of the input element that represent
 * the text portion of the current assignment.
 */
Tooltip.prototype.getDimensionsOfAssignment = function() {
  var before = '';
  var assignments = this.requisition.getAssignments(true);
  for (var i = 0; i < assignments.length + 1; i++) {
    if (assignments[i] === this.assignment) {
      break;
    }
    before += assignments[i].toString();
  }
  before += this.assignment.getArg().prefix;

  var startChar = before.length;
  before += this.assignment.getArg().text;
  var endChar = before.length;

  return { start: startChar, end: endChar };
};

/**
 * The description (displayed at the top of the hint area) should be blank if
 * we're entering the CommandAssignment (because it's obvious) otherwise it's
 * the parameter description.
 */
Object.defineProperty(Tooltip.prototype, 'description', {
  get: function() {
    if (this.assignment instanceof CommandAssignment &&
            this.assignment.getValue() == null) {
      return '';
    }

    var output = this.assignment.param.manual;
    if (output) {
      var wrapper = this.document.createElement('span');
      util.setContents(wrapper, output);
      if (!this.assignment.param.isDataRequired) {
        var optional = this.document.createElement('span');
        optional.appendChild(document.createTextNode(' (Optional)'));
        wrapper.appendChild(optional);
      }
      return wrapper;
    }

    return this.assignment.param.description;
  }
});

/**
 * Tweak CSS to show the output
 */
Tooltip.prototype.show = function() {
  this.element.style.display = 'block';
};

/**
 * Hide the display using a CSS tweak
 */
Tooltip.prototype.hide = function() {
  this.element.style.display = 'none';
};

exports.Tooltip = Tooltip;


});
