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


var util = require('gcli/util');
var CommandAssignment = require('gcli/cli').CommandAssignment;

var fields = require('gcli/ui/fields');
var domtemplate = require('gcli/ui/domtemplate');

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
 * - inputter: An instance of Inputter
 * - focusManager: Component to manage hiding/showing this element
 * - panelElement (optional): The element to show/hide on visibility events
 * - element: The root element to populate
 */
function Tooltip(options, components) {
  this.inputter = components.inputter;
  this.requisition = components.requisition;
  this.focusManager = components.focusManager;

  this.element = components.element;
  this.element.classList.add(options.tooltipClass || 'gcli-tooltip');
  this.document = this.element.ownerDocument;

  this.panelElement = components.panelElement;
  if (this.panelElement) {
    this.panelElement.classList.add('gcli-panel-hide');
    this.focusManager.onVisibilityChange.add(this.visibilityChanged, this);
  }
  this.focusManager.addMonitoredElement(this.element, 'tooltip');

  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // Pull the HTML into the DOM, but don't add it to the document
  if (tooltipCss != null) {
    this.style = util.importCss(tooltipCss, this.document, 'gcli-tooltip');
  }

  this.template = util.toDom(this.document, tooltipHtml);
  this.templateOptions = { blankNullUndefined: true, stack: 'tooltip.html' };

  this.inputter.onChoiceChange.add(this.choiceChanged, this);
  this.inputter.onAssignmentChange.add(this.assignmentChanged, this);

  // We keep a track of which assignment the cursor is in
  this.assignment = undefined;
  this.assignmentChanged({ assignment: this.inputter.assignment });
}

/**
 * Avoid memory leaks
 */
Tooltip.prototype.destroy = function() {
  this.inputter.onAssignmentChange.remove(this.assignmentChanged, this);
  this.inputter.onChoiceChange.remove(this.choiceChanged, this);

  if (this.panelElement) {
    this.focusManager.onVisibilityChange.remove(this.visibilityChanged, this);
  }
  this.focusManager.removeMonitoredElement(this.element, 'tooltip');

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  this.field.onFieldChange.remove(this.fieldChanged, this);
  this.field.destroy();

  delete this.errorEle;
  delete this.descriptionEle;
  delete this.highlightEle;

  delete this.document;
  delete this.element;
  delete this.panelElement;
  delete this.template;
};

/**
 * The inputter acts on UP/DOWN if there is a menu showing
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
  // inputter noticing a cursor movement out of a command, so we should check
  // that this really is a new assignment
  if (this.assignment === ev.assignment) {
    return;
  }

  if (this.assignment) {
    this.assignment.onAssignmentChange.remove(this.assignmentContentsChanged, this);
  }
  this.assignment = ev.assignment;

  if (this.field) {
    this.field.onFieldChange.remove(this.fieldChanged, this);
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

  this.field.onFieldChange.add(this.fieldChanged, this);
  this.assignment.onAssignmentChange.add(this.assignmentContentsChanged, this);

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
Tooltip.prototype.choiceChanged = function(ev) {
  if (this.field && this.field.setChoiceIndex) {
    var choice = this.assignment.conversion.constrainPredictionIndex(ev.choice);
    this.field.setChoiceIndex(choice);
  }
};

/**
 * Allow the inputter to use RETURN to chose the current menu item when
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
  this.requisition.setAssignment(this.assignment, ev.conversion.arg);

  var isError = ev.conversion.message != null && ev.conversion.message !== '';
  this.focusManager.setError(isError);

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
Tooltip.prototype.assignmentContentsChanged = function(ev) {
  // Assignments fire AssignmentChange events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change.
  if (ev.conversion.arg.text === ev.oldConversion.arg.text) {
    return;
  }

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
    if (assignments[i] === this.assignment) {
      break;
    }
    before += assignments[i].toString();
  }
  before += this.assignment.arg.prefix;

  var startChar = before.length;
  before += this.assignment.arg.text;
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
            this.assignment.value == null) {
      return '';
    }

    var output = this.assignment.param.manual;
    if (output) {
      var wrapper = this.document.createElement('span');
      util.setContents(wrapper, output);
      if (!this.assignment.param.isDataRequired) {
        var optional = this.document.createElement('span');
        optional.appendChild(this.document.createTextNode(' (Optional)'));
        wrapper.appendChild(optional);
      }
      return wrapper;
    }

    return this.assignment.param.description;
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
