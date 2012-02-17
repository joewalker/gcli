/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var KeyEvent = require('gcli/util').KeyEvent;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;

var inputterCss = require('text!gcli/ui/inputter.css');


/**
 * A wrapper to take care of the functions concerning an input element
 */
function Inputter(options) {
  this.requisition = options.requisition;
  this.scratchpad = options.scratchpad;
  this.focusManager = options.focusManager;

  // Suss out where the input element is
  this.element = options.inputElement || 'gcli-input';
  if (typeof this.element === 'string') {
    this.document = options.document || document;
    var name = this.element;
    this.element = this.document.getElementById(name);
    if (!this.element) {
      throw new Error('No element with id=' + name + '.');
    }
  }
  else {
    // Assume we've been passed in the correct node
    this.document = this.element.ownerDocument;
  }

  if (inputterCss != null) {
    this.style = util.importCss(inputterCss, this.document);
  }

  this.element.spellcheck = false;

  // Used to distinguish focus from TAB in CLI. See onKeyUp()
  this.lastTabDownAt = 0;

  // Used to effect caret changes. See _processCaretChange()
  this._caretChange = null;

  // Ensure that TAB/UP/DOWN isn't handled by the browser
  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);
  this.element.addEventListener('keydown', this.onKeyDown, false);
  this.element.addEventListener('keyup', this.onKeyUp, false);

  // Setup History
  this.history = new History(options);
  this._scrollingThroughHistory = false;

  // Used when we're selecting which prediction to complete with
  this._choice = null;
  this.onChoiceChange = util.createEvent('Inputter.onChoiceChange');

  // Cursor position affects hint severity
  this.onMouseUp = this.onMouseUp.bind(this);
  this.element.addEventListener('mouseup', this.onMouseUp, false);

  if (this.focusManager) {
    this.focusManager.addMonitoredElement(this.element, 'input');
  }

  this.requisition.onTextChange.add(this.onTextChange, this);

  this.assignment = this.requisition.getAssignmentAt(0);
  this.onAssignmentChange = util.createEvent('Inputter.onAssignmentChange');
  this.onInputChange = util.createEvent('Inputter.onInputChange');

  this.requisition.update(this.element.value || '');
}

/**
 * Avoid memory leaks
 */
Inputter.prototype.destroy = function() {
  this.requisition.onTextChange.remove(this.onTextChange, this);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element, 'input');
  }

  this.element.removeEventListener('mouseup', this.onMouseUp, false);
  delete this.onMouseUp;

  this.element.removeEventListener('keydown', this.onKeyDown, false);
  this.element.removeEventListener('keyup', this.onKeyUp, false);
  delete this.onKeyDown;
  delete this.onKeyUp;

  this.history.destroy();

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.document;
  delete this.element;
};

/**
 * Utility to add an element into the DOM after the input element
 */
Inputter.prototype.appendAfter = function(element) {
  this.element.parentNode.insertBefore(element, this.element.nextSibling);
};

/**
 * Handler for the input-element.onMouseUp event
 */
Inputter.prototype.onMouseUp = function(ev) {
  this._checkAssignment();
};

/**
 * Handler for the Requisition.onTextChange event
 */
Inputter.prototype.onTextChange = function() {
  if (this._caretChange == null) {
    // We weren't expecting a change so this was requested by the hint system
    // we should move the cursor to the end of the 'changed section', and the
    // best we can do for that right now is the end of the current argument.
    this._caretChange = Caret.TO_ARG_END;
  }

  var newStr = this.requisition.toString();

  if (!this.document) {
    return; // This can happen post-destroy()
  }

  // If the text is unchanged, we only need to worry about the cursor position
  if (this.element.value && this.element.value === newStr) {
    var input = this.getInputState();
    this._processCaretChange(input);
    this.onInputChange({ inputState: input });
    return;
  }

  // Updating in a timeout fixes a XUL issue (bug 676520) where textbox gives
  // incorrect values for its content
  this.document.defaultView.setTimeout(function() {
    if (!this.document) {
      return; // This can happen post-destroy()
    }

    // Bug 678520 - We could do better caret handling by recording the caret
    // position in terms of offset into an assignment, and then replacing into
    // a similar place
    var input = this.getInputState();
    input.typed = newStr;
    this._processCaretChange(input);
    this.element.value = newStr;

    this.onInputChange({ inputState: input });
  }.bind(this), 0);
};

/**
 * Various ways in which we need to manipulate the caret/selection position.
 * A value of null means we're not expecting a change
 */
var Caret = {
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

/**
 * If this._caretChange === Caret.TO_ARG_END, we alter the input object to move
 * the selection start to the end of the current argument.
 * @param input An object shaped like { typed:'', cursor: { start:0, end:0 }}
 */
Inputter.prototype._processCaretChange = function(input) {
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

    case null:
    case Caret.NO_CHANGE:
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

  this.element.selectionStart = newInput.cursor.start;
  this.element.selectionEnd = newInput.cursor.end;

  this._checkAssignment();

  this._caretChange = null;
  return newInput;
};

/**
 * To be called internally whenever we think that the current assignment might
 * have changed, typically on mouse-clicks or key presses.
 */
Inputter.prototype._checkAssignment = function() {
  var newAssignment = this.getCurrentAssignment();
  if (this.assignment !== newAssignment) {
    this.assignment = newAssignment;
    this.onAssignmentChange({ assignment: this.assignment });
  }
};

/**
 * Set the input field to a value, for external use.
 * This function updates the data model. It sets the caret to the end of the
 * input. It does not make any similarity checks so calling this function with
 * it's current value resets the cursor position.
 * It does not execute the input or affect the history.
 * This function should not be called internally, by Inputter and never as a
 * result of a keyboard event on this.element or bug 676520 could be triggered.
 */
Inputter.prototype.setInput = function(str) {
  this.requisition.update(str);
};

/**
 * Focus the input element
 */
Inputter.prototype.focus = function() {
  this.element.focus();
  this._checkAssignment();
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Inputter.prototype.onKeyDown = function(ev) {
  if (ev.keyCode === KeyEvent.DOM_VK_UP || ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    ev.preventDefault();
  }
  if (ev.keyCode === KeyEvent.DOM_VK_TAB) {
    this.lastTabDownAt = 0;
    if (!ev.shiftKey) {
      ev.preventDefault();
      // Record the timestamp of this TAB down so onKeyUp can distinguish
      // focus from TAB in the CLI.
      this.lastTabDownAt = ev.timeStamp;
    }
    if (ev.metaKey || ev.altKey || ev.crtlKey) {
      if (this.document.commandDispatcher) {
        this.document.commandDispatcher.advanceFocus();
      }
      else {
        this.element.blur();
      }
    }
  }
};

/**
 * The main keyboard processing loop
 */
Inputter.prototype.onKeyUp = function(ev) {
  if (this.focusManager) {
    this.focusManager.onKeyUp(ev);
  }

  // Give the scratchpad (if enabled) a chance to activate
  if (this.scratchpad && this.scratchpad.shouldActivate(ev)) {
    if (this.scratchpad.activate(this.element.value)) {
      this.requisition.update('');
    }
    return;
  }

  // RETURN does a special exec/highlight thing
  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    var worst = this.requisition.getStatus();
    // Deny RETURN unless the command might work
    if (worst === Status.VALID) {
      this._scrollingThroughHistory = false;
      this.history.add(this.element.value);
      this.requisition.exec();
    }
    // See bug 664135 - On pressing return with an invalid input, GCLI
    // should select the incorrect part of the input for an easy fix
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB && !ev.shiftKey) {
    // If the TAB keypress took the cursor from another field to this one,
    // then they get the keydown/keypress, and we get the keyup. In this
    // case we don't want to do any completion.
    // If the time of the keydown/keypress of TAB was close (i.e. within
    // 1 second) to the time of the keyup then we assume that we got them
    // both, and do the completion.
    if (this.lastTabDownAt + 1000 > ev.timeStamp) {
      // It's possible for TAB to not change the input, in which case the
      // onTextChange event will not fire, and the caret move will not be
      // processed. So we check that this is done first
      this._caretChange = Caret.TO_ARG_END;
      var inputState = this.getInputState();
      this._processCaretChange(inputState);
      if (this._choice == null) {
        this._choice = 0;
      }
      this.requisition.complete(inputState.cursor, this._choice);
    }
    this.lastTabDownAt = 0;
    this._scrollingThroughHistory = false;

    this._choice = null;
    this.onChoiceChange({ choice: this._choice });
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.requisition.update(this.history.backward());
    }
    else {
      // If the user has typed nothing, or they're on a valid value, then we
      // increment the value, but if they've typed something that's not right
      // we want to pick from the predictions
      if (this.assignment.getArg().text === '' ||
              this.assignment.getStatus() === Status.VALID) {
        this.assignment.increment();
      }
      else {
        if (this._choice == null) {
          this._choice = 0;
        }
        this._choice++;
        this.onChoiceChange({ choice: this._choice });
      }
    }
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.requisition.update(this.history.forward());
    }
    else {
      // See notes above for the UP key
      if (this.assignment.getArg().text === '' ||
              this.assignment.getStatus() === Status.VALID) {
        this.assignment.decrement();
      }
      else {
        if (this._choice == null) {
          this._choice = 0;
        }
        this._choice--;
        this.onChoiceChange({ choice: this._choice });
      }
    }
    return;
  }

  this._scrollingThroughHistory = false;
  this._caretChange = Caret.NO_CHANGE;

  this.requisition.update(this.element.value);

  this._choice = null;
  this.onChoiceChange({ choice: this._choice });
};

/**
 * Accessor for the assignment at the cursor.
 * i.e Requisition.getAssignmentAt(cursorPos);
 */
Inputter.prototype.getCurrentAssignment = function() {
  var start = this.element.selectionStart;
  return this.requisition.getAssignmentAt(start);
};

/**
 * Pull together an input object, which may include XUL hacks
 */
Inputter.prototype.getInputState = function() {
  var input = {
    typed: this.element.value,
    cursor: {
      start: this.element.selectionStart,
      end: this.element.selectionEnd
    }
  };

  // Workaround for potential XUL bug 676520 where textbox gives incorrect
  // values for its content
  if (input.typed == null) {
    input = { typed: '', cursor: { start: 0, end: 0 } };
    console.log('fixing input.typed=""', input);
  }

  // Workaround for a Bug 717268 (which is really a jsdom bug)
  if (input.cursor.start == null) {
    input.cursor.start = 0;
  }

  return input;
};

exports.Inputter = Inputter;


});
