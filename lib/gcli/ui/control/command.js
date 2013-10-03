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
function CommandControl(components) {
  this.terminal = components.terminal;
  this.focusManager = components.focusManager;
  this.requisition = components.requisition;
  this.outputViewTemplate = components.outputViewTemplate;

  this.requisition.onTextChange.add(this.textChanged, this);
  this.requisition.commandOutputManager.onOutput.add(this.outputted, this);

  // We also keep track of the last known arg text for the current assignment
  this.lastText = undefined;

  // Used to effect caret changes. See _processCaretChange()
  this._caretChange = null;

  // We keep a track of which assignment the cursor is in
  this.assignment = this.requisition.getAssignmentAt(0);

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
    if (this.assignment instanceof CommandAssignment &&
        this.assignment.value == null) {
      return '';
    }

    return this.assignment.param.manual || this.assignment.param.description;
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
  this._processCaretChange(input);

  if (this.terminal.inputElement.value !== newStr) {
    this.terminal.inputElement.value = newStr;
  }
  this.terminal.onInputChange({ inputState: input });

  // Requisition fires onTextChanged events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change.
  if (this.assignment.arg.text === this.lastText) {
    return;
  }

  this.lastText = this.assignment.arg.text;

  this.terminal.field.setConversion(this.assignment.conversion);
  util.setTextContent(this.terminal.descriptionEle, this.description);
};

/**
 * To be called internally whenever we think that the current assignment might
 * have changed, typically on mouse-clicks or key presses.
 * @param start The cursor position to use in working out the current
 * assignment. This is needed because setting the element selection start is
 * only recognised when the event loop has finished
 */
CommandControl.prototype.caretMoved = function(start) {
  var newAssignment = this.requisition.getAssignmentAt(start);
  if (this.assignment !== newAssignment) {
    if (this.assignment.param.type.onLeave) {
      this.assignment.param.type.onLeave(this.assignment);
    }

    // This can be kicked off either by requisition doing an assign or by
    // terminal noticing a cursor movement out of a command, so we should check
    // that this really is a new assignment
    var isNew = (this.assignment !== newAssignment);

    this.assignment = newAssignment;
    this.terminal.updateCompletion();

    if (isNew) {
      this.updateHints();
    }

    if (this.assignment.param.type.onEnter) {
      this.assignment.param.type.onEnter(this.assignment);
    }
  }
  else {
    if (this.assignment && this.assignment.param.type.onChange) {
      this.assignment.param.type.onChange(this.assignment);
    }
  }

  // This is slightly nasty - the focusManager generally relies on people
  // telling it what it needs to know (which makes sense because the event
  // system to do it with events would be unnecessarily complex). However
  // requisition doesn't know about the focusManager either. So either one
  // needs to know about the other, or a third-party needs to break the
  // deadlock. This line is all we're quibbling about, so for now we hack
  this.focusManager.setError(this.assignment.message);
};

/**
 * Called whenever the assignment that we're providing help with changes
 */
CommandControl.prototype.updateHints = function() {
  this.lastText = this.assignment.arg.text;

  if (this.terminal.field) {
    this.terminal.field.onFieldChange.remove(this.terminal.fieldChanged, this.terminal);
    this.terminal.field.destroy();
  }

  this.terminal.field = fields.getField(this.assignment.param.type, {
    document: this.terminal.document,
    name: this.assignment.param.name,
    requisition: this.requisition,
    required: this.assignment.param.isDataRequired,
    named: !this.assignment.param.isPositionalAllowed,
    tooltip: true
  });

  this.focusManager.setImportantFieldFlag(this.terminal.field.isImportant);

  this.terminal.field.onFieldChange.add(this.terminal.fieldChanged, this.terminal);
  this.terminal.field.setConversion(this.assignment.conversion);

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
};

/**
 * See also handleDownArrow for some symmetry
 */
CommandControl.prototype.handleUpArrow = function() {
  // If the user is on a valid value, then we increment the value, but if
  // they've typed something that's not right we page through predictions
  if (this.assignment.getStatus() === Status.VALID) {
    this.requisition.increment(this.assignment);
    this.focusManager.onInputChange();
    return promise.resolve(true);
  }

  return promise.resolve(false);
};

/**
 * See also handleUpArrow for some symmetry
 */
CommandControl.prototype.handleDownArrow = function() {
  if (this.assignment.getStatus() === Status.VALID) {
    this.requisition.decrement(this.assignment);
    this.focusManager.onInputChange();
    return promise.resolve(true);
  }

  return promise.resolve(false);
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
      this.focusManager.setError(true);
    }
  }

  this.terminal.unsetChoice();
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
  this._processCaretChange(inputState);

  this.terminal._previousValue = this.terminal.inputElement.value;

  // The changes made by complete may happen asynchronously, so after the
  // the call to complete() we should avoid making changes before the end
  // of the event loop
  var index = this.terminal.getChoiceIndex();
  return this.requisition.complete(inputState.cursor, index).then(function(updated) {
    // Abort UI changes if this UI update has been overtaken
    if (updated) {
      this.terminal.unsetChoice();
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
      this.terminal.unsetChoice();
    }
  }.bind(this));
};

/**
 * Counterpart to |setInput| for moving the cursor.
 * @param cursor A JS object shaped like { start: x, end: y }
 */
CommandControl.prototype.setCursor = function(cursor) {
  this._caretChange = Caret.NO_CHANGE;
  this._processCaretChange({
    typed: this.terminal.inputElement.value,
    cursor: cursor
  });
};

/**
 * If this._caretChange === Caret.TO_ARG_END, we alter the input object to move
 * the selection start to the end of the current argument.
 * @param input An object shaped like { typed:'', cursor: { start:0, end:0 }}
 */
CommandControl.prototype._processCaretChange = function(input) {
  var start, end;
  switch (this._caretChange) {
    case Caret.SELECT_ALL:
      start = 0;
      end = input.typed.length;
      break;

    case Caret.TO_END:
      start = input.typed.length;
      end = input.typed.length;
      break;

    case Caret.TO_ARG_END:
      // There could be a fancy way to do this involving assignment/arg math
      // but it doesn't seem easy, so we cheat a move the cursor to just before
      // the next space, or the end of the input
      start = input.cursor.start;
      do {
        start++;
      }
      while (start < input.typed.length && input.typed[start - 1] !== ' ');

      end = start;
      break;

    default:
      start = input.cursor.start;
      end = input.cursor.end;
      break;
  }

  start = (start > input.typed.length) ? input.typed.length : start;
  end = (end > input.typed.length) ? input.typed.length : end;

  var newInput = {
    typed: input.typed,
    cursor: { start: start, end: end }
  };

  if (this.terminal.inputElement.selectionStart !== start) {
    this.terminal.inputElement.selectionStart = start;
  }
  if (this.terminal.inputElement.selectionEnd !== end) {
    this.terminal.inputElement.selectionEnd = end;
  }

  this.caretMoved(start);

  this._caretChange = null;
  return newInput;
};

/**
 * Calculate the properties required by the template process for completer.html
 */
CommandControl.prototype.getCompleterTemplateData = function() {
  var input = this.terminal.getInputState();
  var start = input.cursor.start;
  var index = this.terminal.getChoiceIndex();

  return this.requisition.getStateData(start, index).then(function(data) {
    // Calculate the statusMarkup required to show wavy lines underneath the
    // input text (like that of an inline spell-checker) which used by the
    // template process for completer.html
    // i.e. s/space/&nbsp/g in the string (for HTML display) and status to an
    // appropriate class name (i.e. lower cased, prefixed with gcli-in-)
    data.statusMarkup.forEach(function(member) {
      member.string = member.string.replace(/ /g, '\u00a0'); // i.e. &nbsp;
      member.className = 'gcli-in-' + member.status.toString().toLowerCase();
    }, this);

    return data;
  });
};

/**
 * Called by the onFieldChange event (via the terminal) on the current Field
 */
CommandControl.prototype.fieldChanged = function(ev) {
  this.requisition.setAssignment(this.assignment, ev.conversion.arg,
                                 { matchPadding: true });

  var isError = ev.conversion.message != null && ev.conversion.message !== '';
  this.focusManager.setError(isError);
};

/**
 * Monitor for new command executions
 */
CommandControl.prototype.outputted = function(ev) {
  if (ev.output.hidden) {
    return;
  }

  var template = this.outputViewTemplate.cloneNode(true);
  var templateOptions = { stack: 'terminal.html#outputView' };

  var context = this.requisition.conversionContext;
  var data = {
    onclick: context.update,
    ondblclick: context.updateExec,
    control: this,
    output: ev.output,
    prompt: ev.output.canonical ? '\u00bb' : '', // TODO: Really?
    promptClass: (ev.output.error ? 'gcli-row-error' : '') +
                 (ev.output.completed ? ' gcli-row-complete' : ''),
    // Elements attached to this by template().
    rowinEle: null,
    rowoutEle: null,
    durationEle: null,
    throbEle: null,
    promptEle: null
  };

  domtemplate.template(template, data, templateOptions);

  ev.output.promise.then(function() {
    var document = data.rowoutEle.ownerDocument;
    var duration = ev.output.duration != null ?
            'completed in ' + (ev.output.duration / 1000) + ' sec ' :
            '';
    data.durationEle.appendChild(document.createTextNode(duration));

    if (ev.output.completed) {
      data.promptEle.classList.add('gcli-row-complete');
    }
    if (ev.output.error) {
      data.promptEle.classList.add('gcli-row-error');
    }

    util.clearElement(data.rowoutEle);
    var context = this.requisition.conversionContext;
    ev.output.convert('dom', context).then(function(node) {
      util.linksToNewTab(node);
      data.rowoutEle.appendChild(node);

      this.terminal.scrollToBottom();

      data.throbEle.style.display = ev.output.completed ? 'none' : 'block';
    }.bind(this));
  }.bind(this));

  this.terminal.addElement(data.rowinEle);
  this.terminal.addElement(data.rowoutEle);
  this.terminal.scrollToBottom();

  this.focusManager.outputted();
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
