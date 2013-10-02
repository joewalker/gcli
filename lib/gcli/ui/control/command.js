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

'use strict';

var util = require('../../util/util');
var promise = require('../../util/promise');
var domtemplate = require('../../util/domtemplate');

var Status = require('../../types').Status;
var CommandAssignment = require('../../cli').CommandAssignment;
var fields = require('../fields');

var RESOLVED = promise.resolve(true);

/**
 * CommandControl (like other control classes) drives a Terminal to allow
 * input and show the results of the input. Each Control class represents a
 * language. CommandControl supports GCLI commands.
 */
function CommandControl(terminal, requisition) {
  this.terminal = terminal;
  this.requisition = requisition;

  this.requisition.onTextChange.add(this.textChanged, this);
  this.requisition.commandOutputManager.onOutput.add(this.outputted, this);

  this.requisition.update('');
}

CommandControl.prototype.destroy = function() {
  this.requisition.onTextChange.remove(this.textChanged, this);
  this.requisition.commandOutputManager.onOutput.remove(this.outputted, this);

  this.terminal = undefined;
  this.requisition = undefined;
};

/**
 * The description (displayed at the top of the hint area) should be blank if
 * we're entering the CommandAssignment (because it's obvious) otherwise it's
 * the parameter description.
 */
Object.defineProperty(CommandControl.prototype, 'description', {
  get: function() {
    if (this.terminal.assignment instanceof CommandAssignment &&
        this.terminal.assignment.value == null) {
      return '';
    }

    return this.terminal.assignment.param.manual || this.terminal.assignment.param.description;
  },
  enumerable: true
});

/**
 * Handler for the Requisition.textChanged event
 */
CommandControl.prototype.textChanged = function() {
  if (this.terminal == null) {
    return; // This can happen post-destroy()
  }

  if (this.terminal._caretChange == null) {
    // We weren't expecting a change so this was requested by the hint system
    // we should move the cursor to the end of the 'changed section', and the
    // best we can do for that right now is the end of the current argument.
    this.terminal._caretChange = Caret.TO_ARG_END;
  }

  var newStr = this.requisition.toString();
  var input = this.terminal.getInputState();

  input.typed = newStr;
  this.terminal._processCaretChange(input);

  if (this.terminal.inputElement.value !== newStr) {
    this.terminal.inputElement.value = newStr;
  }
  this.terminal.onInputChange({ inputState: input });

  // Requisition fires onTextChanged events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change.
  if (this.terminal.assignment.arg.text === this.terminal.lastText) {
    return;
  }

  this.terminal.lastText = this.terminal.assignment.arg.text;

  this.terminal.field.setConversion(this.terminal.assignment.conversion);
  util.setTextContent(this.terminal.descriptionEle, this.description);

  this.terminal._updatePosition();
};

/**
 * To be called internally whenever we think that the current assignment might
 * have changed, typically on mouse-clicks or key presses.
 * @param start Optional - if specified, the cursor position to use in working
 * out the current assignment. This is needed because setting the element
 * selection start is only recognised when the event loop has finished
 */
CommandControl.prototype._checkAssignment = function(start) {
  if (start == null) {
    start = this.terminal.inputElement.selectionStart;
  }
  var newAssignment = this.requisition.getAssignmentAt(start);
  if (this.terminal.assignment !== newAssignment) {
    if (this.terminal.assignment.param.type.onLeave) {
      this.terminal.assignment.param.type.onLeave(this.terminal.assignment);
    }

    // This can be kicked off either by requisition doing an assign or by
    // terminal noticing a cursor movement out of a command, so we should check
    // that this really is a new assignment
    var isNew = (this.terminal.assignment !== newAssignment);

    this.terminal.assignment = newAssignment;

    this.terminal.updateCompletion({ assignment: this.terminal.assignment });

    if (isNew) {
      this.assignmentChanged({ assignment: this.terminal.assignment });
    }

    if (this.terminal.assignment.param.type.onEnter) {
      this.terminal.assignment.param.type.onEnter(this.terminal.assignment);
    }
  }
  else {
    if (this.terminal.assignment && this.terminal.assignment.param.type.onChange) {
      this.terminal.assignment.param.type.onChange(this.terminal.assignment);
    }
  }

  // This is slightly nasty - the focusManager generally relies on people
  // telling it what it needs to know (which makes sense because the event
  // system to do it with events would be unnecessarily complex). However
  // requisition doesn't know about the focusManager either. So either one
  // needs to know about the other, or a third-party needs to break the
  // deadlock. These 2 lines are all we're quibbling about, so for now we hack
  if (this.terminal.focusManager) {
    this.terminal.focusManager.setError(this.terminal.assignment.message);
  }
};

/**
 * Called whenever the assignment that we're providing help with changes
 */
CommandControl.prototype.assignmentChanged = function() {
  this.terminal.lastText = this.terminal.assignment.arg.text;

  if (this.terminal.field) {
    this.terminal.field.onFieldChange.remove(this.terminal.fieldChanged, this.terminal);
    this.terminal.field.destroy();
  }

  this.terminal.field = fields.getField(this.terminal.assignment.param.type, {
    document: this.terminal.document,
    name: this.terminal.assignment.param.name,
    requisition: this.terminal.requisition,
    required: this.terminal.assignment.param.isDataRequired,
    named: !this.terminal.assignment.param.isPositionalAllowed,
    tooltip: true
  });

  this.terminal.focusManager.setImportantFieldFlag(this.terminal.field.isImportant);

  this.terminal.field.onFieldChange.add(this.terminal.fieldChanged, this.terminal);
  this.terminal.field.setConversion(this.terminal.assignment.conversion);

  // Filled in by the template process
  this.terminal.errorEle = undefined;
  this.terminal.descriptionEle = undefined;

  var contents = this.terminal.tooltipTemplate.cloneNode(true);
  domtemplate.template(contents, this.terminal, {
    blankNullUndefined: true,
    stack: 'terminal.html#tooltip'
  });

  util.clearElement(this.terminal.tooltipElement);
  this.terminal.tooltipElement.appendChild(contents);
  this.terminal.tooltipElement.style.display = 'block';

  this.terminal.field.setMessageElement(this.terminal.errorEle);

  this.terminal._updatePosition();
};

/**
 * See also handleDownArrow for some symmetry
 */
CommandControl.prototype.handleUpArrow = function() {
  if (this.terminal.isMenuShowing) {
    this.terminal.changeChoice(-1);
    return RESOLVED;
  }

  if (this.terminal.inputElement.value === '' || this.terminal._scrollingThroughHistory) {
    this.terminal._scrollingThroughHistory = true;
    return this.terminal.requisition.update(this.terminal.history.backward());
  }

  // If the user is on a valid value, then we increment the value, but if
  // they've typed something that's not right we page through predictions
  if (this.terminal.assignment.getStatus() === Status.VALID) {
    this.terminal.requisition.increment(this.terminal.assignment);
    // See notes on focusManager.onInputChange in onKeyDown
    if (this.terminal.focusManager) {
      this.terminal.focusManager.onInputChange();
    }
  }
  else {
    this.terminal.changeChoice(-1);
  }

  return RESOLVED;
};

/**
 * See also handleUpArrow for some symmetry
 */
CommandControl.prototype.handleDownArrow = function() {
  if (this.terminal.isMenuShowing) {
    this.terminal.changeChoice(+1);
    return RESOLVED;
  }

  if (this.terminal.inputElement.value === '' || this.terminal._scrollingThroughHistory) {
    this.terminal._scrollingThroughHistory = true;
    return this.terminal.requisition.update(this.terminal.history.forward());
  }

  // See notes above for the UP key
  if (this.terminal.assignment.getStatus() === Status.VALID) {
    this.terminal.requisition.decrement(this.terminal.assignment,
                               this.terminal.requisition.executionContext);
    // See notes on focusManager.onInputChange in onKeyDown
    if (this.terminal.focusManager) {
      this.terminal.focusManager.onInputChange();
    }
  }
  else {
    this.terminal.changeChoice(+1);
  }

  return RESOLVED;
};

/**
 * RETURN checks status and might exec
 */
CommandControl.prototype.handleReturn = function() {
  // Deny RETURN unless the command might work
  if (this.requisition.status === Status.VALID) {
    this.terminal._scrollingThroughHistory = false;
    this.terminal.history.add(this.terminal.inputElement.value);
    this.requisition.exec();
  }
  else {
    // If we can't execute the command, but there is a menu choice to use
    // then use it.
    if (!this.terminal.selectChoice()) {
      this.terminal.focusManager.setError(true);
    }
  }

  this.terminal._choice = 0;
  return RESOLVED;
};

/**
 * Warning: We get TAB events for more than just the user pressing TAB in our
 * input element.
 */
CommandControl.prototype.handleTab = function() {
  // It's possible for TAB to not change the input, in which case the
  // textChanged event will not fire, and the caret move will not be
  // processed. So we check that this is done first
  this.terminal._caretChange = Caret.TO_ARG_END;
  var inputState = this.terminal.getInputState();
  this.terminal._processCaretChange(inputState);

  this.terminal._previousValue = this.terminal.inputElement.value;

  // The changes made by complete may happen asynchronously, so after the
  // the call to complete() we should avoid making changes before the end
  // of the event loop
  return this.requisition.complete(inputState.cursor, this.terminal._choice).then(function(updated) {
    // Abort UI changes if this UI update has been overtaken
    if (updated) {
      this.terminal._choice = 0;
      this.terminal.choiceChanged({ choice: this.terminal._choice });
    }
  }.bind(this));
};

/**
 * The input test has changed in some way.
 */
CommandControl.prototype.handleInput = function(value) {
  this.terminal._caretChange = Caret.NO_CHANGE;

  return this.requisition.update(value).then(function(updated) {
    // Abort UI changes if this UI update has been overtaken
    if (updated) {
      this.terminal._choice = 0;
      this.terminal.choiceChanged({ choice: this.terminal._choice });
    }
  }.bind(this));
};

/**
 * Monitor for new command executions
 */
CommandControl.prototype.outputted = function(ev) {
  this.terminal.outputted(ev);
};

exports.CommandControl = CommandControl;

/**
 * Various ways in which we need to manipulate the caret/selection position.
 * A value of null means we're not expecting a change
 */
var Caret = exports.Caret = {
  /**
   * We are expecting changes, but we don't need to move the cursor
   */
  NO_CHANGE: 0,

  /**
   * We want the entire input area to be selected
   */
  SELECT_ALL: 1,

  /**
   * The whole input has changed - push the cursor to the end
   */
  TO_END: 2,

  /**
   * A part of the input has changed - push the cursor to the end of the
   * changed section
   */
  TO_ARG_END: 3
};
