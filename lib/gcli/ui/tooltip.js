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

var CommandAssignment = require('gcli/cli').CommandAssignment;
var fields = require('gcli/ui/fields');

var tooltipCss = require('text!gcli/ui/tooltip.css');
var tooltipHtml = require('text!gcli/ui/tooltip.html');


/**
 * A widget to display an inline dialog which allows the user to fill out
 * the arguments to a command.
 * @param options Object containing user customization properties, including:
 * - tooltipClass (default='gcli-tooltip'): Custom class name when generating
 *   the top level element which allows different layout systems
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition: The Requisition to fill out
 * - terminal: An instance of Inputter
 * - focusManager: Component to manage hiding/showing this element
 * - panelElement (optional): The element to show/hide on visibility events
 * - tooltipElement: The root element to populate
 */
function Tooltip(options, components) {
  this.terminal = components.terminal;
  this.focusManager = components.focusManager;

  this.requisition = components.requisition;

  this.tooltipElement = components.tooltipElement;
  this.document = this.tooltipElement.ownerDocument;
  this.panelElement = components.panelElement;

  this.tooltipElement.classList.add(options.tooltipClass || 'gcli-tooltip');

  if (this.panelElement) {
    this.panelElement.classList.add('gcli-panel-hide');
    this.focusManager.onVisibilityChange.add(this.visibilityChanged, this);
  }
  this.focusManager.addMonitoredElement(this.tooltipElement, 'tooltip');

  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // Pull the HTML into the DOM, but don't add it to the document
  if (tooltipCss != null) {
    this.tooltipStyle = util.importCss(tooltipCss, this.document, 'gcli-tooltip');
  }

  this.tooltipTemplate = util.toDom(this.document, tooltipHtml);

  this.terminal.onChoiceChange.add(this.choiceChanged, this);
  this.terminal.onAssignmentChange.add(this.assignmentChanged, this);
  this.requisition.onTextChange.add(this.tooltipTextChanged, this);

  // We keep a track of which assignment the cursor is in
  this.assignment2 = undefined;
  this.assignmentChanged({ assignment: this.terminal.assignment });

  // We also keep track of the last known arg text for the current assignment
  this.lastText = undefined;
}

/**
 * Avoid memory leaks
 */
Tooltip.prototype.destroy = function() {
  this.terminal.onAssignmentChange.remove(this.assignmentChanged, this);
  this.terminal.onChoiceChange.remove(this.choiceChanged, this);
  this.requisition.onTextChange.remove(this.tooltipTextChanged, this);

  if (this.panelElement) {
    this.focusManager.onVisibilityChange.remove(this.visibilityChanged, this);
  }
  this.focusManager.removeMonitoredElement(this.tooltipElement, 'tooltip');

  if (this.tooltipStyle) {
    this.tooltipStyle.parentNode.removeChild(this.tooltipStyle);
    this.tooltipStyle = undefined;
  }

  this.field.onFieldChange.remove(this.fieldChanged, this);
  this.field.destroy();

  this.lastText = undefined;
  this.assignment2 = undefined;

  this.errorEle = undefined;
  this.descriptionEle = undefined;
  this.highlightEle = undefined;

  this.document = undefined;
  this.tooltipElement = undefined;
  this.panelElement = undefined;
  this.tooltipTemplate = undefined;
};

/**
 * The terminal acts on UP/DOWN if there is a menu showing
 */
Object.defineProperty(Tooltip.prototype, 'isMenuShowing', {
  get: function() {
    return this.focusManager.isTooltipVisible &&
           this.field != null &&
           this.field.menu != null;
  },
  enumerable: true
});

/**
 * Called whenever the assignment that we're providing help with changes
 */
Tooltip.prototype.assignmentChanged = function(ev) {
  // This can be kicked off either by requisition doing an assign or by
  // terminal noticing a cursor movement out of a command, so we should check
  // that this really is a new assignment
  if (this.assignment2 === ev.assignment) {
    return;
  }

  this.assignment2 = ev.assignment;
  this.lastText = this.assignment2.arg.text;

  if (this.field) {
    this.field.onFieldChange.remove(this.fieldChanged, this);
    this.field.destroy();
  }

  this.field = fields.getField(this.assignment2.param.type, {
    document: this.document,
    name: this.assignment2.param.name,
    requisition: this.requisition,
    required: this.assignment2.param.isDataRequired,
    named: !this.assignment2.param.isPositionalAllowed,
    tooltip: true
  });

  this.focusManager.setImportantFieldFlag(this.field.isImportant);

  this.field.onFieldChange.add(this.fieldChanged, this);
  this.field.setConversion(this.assignment2.conversion);

  // Filled in by the template process
  this.errorEle = undefined;
  this.descriptionEle = undefined;
  this.highlightEle = undefined;

  var contents = this.tooltipTemplate.cloneNode(true);
  domtemplate.template(contents, this, {
    blankNullUndefined: true,
    stack: 'tooltip.html'
  });

  util.clearElement(this.tooltipElement);
  this.tooltipElement.appendChild(contents);
  this.tooltipElement.style.display = 'block';

  this.field.setMessageElement(this.errorEle);

  this._updatePosition();
};

/**
 * Forward the event to the current field
 */
Tooltip.prototype.choiceChanged = function(ev) {
  if (this.field && this.field.setChoiceIndex) {
    var conversion = this.assignment2.conversion;
    conversion.constrainPredictionIndex(ev.choice).then(function(choice) {
      this.field.setChoiceIndex(choice);
    }.bind(this)).then(null, util.errorHandler);
  }
};

/**
 * Allow the terminal to use RETURN to chose the current menu item when
 * it can't execute the command line
 * @return true if there was a selection to use, false otherwise
 */
Tooltip.prototype.selectChoice = function(ev) {
  if (this.field && this.field.selectChoice) {
    return this.field.selectChoice();
  }
  return false;
};

/**
 * Called by the onFieldChange event on the current Field
 */
Tooltip.prototype.fieldChanged = function(ev) {
  this.requisition.setAssignment(this.assignment2, ev.conversion.arg,
                                 { matchPadding: true });

  var isError = ev.conversion.message != null && ev.conversion.message !== '';
  this.focusManager.setError(isError);

  // Nasty hack, the terminal won't know about the text change yet, so it will
  // get it's calculations wrong. We need to wait until the current set of
  // changes has had a chance to propagate
  this.document.defaultView.setTimeout(function() {
    this.terminal.focus();
  }.bind(this), 10);
};

/**
 * Called by the onTextChanged event on the Requisition
 */
Tooltip.prototype.tooltipTextChanged = function() {
  // Requisition fires onTextChanged events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change.
  if (this.assignment2.arg.text === this.lastText) {
    return;
  }

  this.lastText = this.assignment2.arg.text;

  this.field.setConversion(this.assignment2.conversion);
  util.setTextContent(this.descriptionEle, this.description);

  this._updatePosition();
};

/**
 * Called to move the tooltip to the correct horizontal position
 */
Tooltip.prototype._updatePosition = function() {
  var dimensions = this.getDimensionsOfAssignment();

  // 10 is roughly the width of a char
  if (this.panelElement) {
    this.panelElement.style.left = (dimensions.start * 10) + 'px';
  }

  this.focusManager.updatePosition(dimensions);
};

/**
 * Returns a object containing 'start' and 'end' properties which identify the
 * number of pixels from the left hand edge of the input element that represent
 * the text portion of the current assignment.
 */
Tooltip.prototype.getDimensionsOfAssignment = function() {
  var before = '';
  var assignments = this.requisition.getAssignments(true);
  for (var i = 0; i < assignments.length; i++) {
    if (assignments[i] === this.assignment2) {
      break;
    }
    before += assignments[i].toString();
  }
  before += this.assignment2.arg.prefix;

  var startChar = before.length;
  before += this.assignment2.arg.text;
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
    if (this.assignment2 instanceof CommandAssignment &&
            this.assignment2.value == null) {
      return '';
    }

    return this.assignment2.param.manual || this.assignment2.param.description;
  },
  enumerable: true
});

/**
 * Tweak CSS to show/hide the output
 */
Tooltip.prototype.visibilityChanged = function(ev) {
  if (!this.panelElement) {
    return;
  }

  if (ev.tooltipVisible) {
    this.panelElement.classList.remove('gcli-panel-hide');
  }
  else {
    this.panelElement.classList.add('gcli-panel-hide');
  }
};

exports.Tooltip = Tooltip;


});
