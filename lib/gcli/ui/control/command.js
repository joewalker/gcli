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

var Status = require('../../types').Status;

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
  util.setTextContent(this.terminal.descriptionEle, this.terminal.description);

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
