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
var KeyEvent = require('gcli/util').KeyEvent;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;

var inputterCss = require('text!gcli/ui/inputter.css');


/**
 * A wrapper to take care of the functions concerning an input element
 * @param options Object containing user customization properties, including:
 * - scratchpad (default=none)
 * - promptWidth (default=22px)
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition
 * - focusManager
 * - element
 */
function Inputter(options, components) {
  this.requisition = components.requisition;
  this.focusManager = components.focusManager;

  this.element = components.element;
  this.element.classList.add('gcli-in-input');
  this.element.spellcheck = false;

  this.document = this.element.ownerDocument;

  this.scratchpad = options.scratchpad;

  if (inputterCss != null) {
    this.style = util.importCss(inputterCss, this.document, 'gcli-inputter');
  }

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
  this.history = new History();
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

  this.requisition.onTextChange.add(this.textChanged, this);

  this.assignment = this.requisition.getAssignmentAt(0);
  this.onAssignmentChange = util.createEvent('Inputter.onAssignmentChange');
  this.onInputChange = util.createEvent('Inputter.onInputChange');

  this.onResize = util.createEvent('Inputter.onResize');
  this.onWindowResize = this.onWindowResize.bind(this);
  this.document.defaultView.addEventListener('resize', this.onWindowResize, false);

  this.requisition.update(this.element.value || '');
}

/**
 * Avoid memory leaks
 */
Inputter.prototype.destroy = function() {
  this.document.defaultView.removeEventListener('resize', this.onWindowResize, false);

  this.requisition.onTextChange.remove(this.textChanged, this);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element, 'input');
  }

  this.element.removeEventListener('mouseup', this.onMouseUp, false);
  this.element.removeEventListener('keydown', this.onKeyDown, false);
  this.element.removeEventListener('keyup', this.onKeyUp, false);

  this.history.destroy();

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    delete this.style;
  }

  delete this.onMouseUp;
  delete this.onKeyDown;
  delete this.onKeyUp;
  delete this.onWindowResize;
  delete this.tooltip;
  delete this.document;
  delete this.element;
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Inputter.prototype.onWindowResize = function() {
  // Mochitest sometimes causes resize after shutdown. See Bug 743190
  if (!this.element) {
    return;
  }

  // Simplify when jsdom does getBoundingClientRect(). See Bug 717269
  var dimensions = this.getDimensions();
  if (dimensions) {
    this.onResize(dimensions);
  }
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Inputter.prototype.getDimensions = function() {
  // Remove this when jsdom does getBoundingClientRect(). See Bug 717269
  if (!this.element.getBoundingClientRect) {
    return undefined;
  }

  var fixedLoc = {};
  var currentElement = this.element.parentNode;
  while (currentElement && currentElement.nodeName !== '#document') {
    var style = this.document.defaultView.getComputedStyle(currentElement, '');
    if (style) {
      var position = style.getPropertyValue('position');
      if (position === 'absolute' || position === 'fixed') {
        var bounds = currentElement.getBoundingClientRect();
        fixedLoc.top = bounds.top;
        fixedLoc.left = bounds.left;
        break;
      }
    }
    currentElement = currentElement.parentNode;
  }

  var rect = this.element.getBoundingClientRect();
  return {
    top: rect.top - (fixedLoc.top || 0) + 1,
    height: rect.bottom - rect.top - 1,
    left: rect.left - (fixedLoc.left || 0) + 2,
    width: rect.right - rect.left
  };
};

/**
 * Handler for the input-element.onMouseUp event
 */
Inputter.prototype.onMouseUp = function(ev) {
  this._checkAssignment();
};

/**
 * Handler for the Requisition.textChanged event
 */
Inputter.prototype.textChanged = function() {
  if (!this.document) {
    return; // This can happen post-destroy()
  }

  if (this._caretChange == null) {
    // We weren't expecting a change so this was requested by the hint system
    // we should move the cursor to the end of the 'changed section', and the
    // best we can do for that right now is the end of the current argument.
    this._caretChange = Caret.TO_ARG_END;
  }

  var newStr = this.requisition.toString();
  var input = this.getInputState();

  input.typed = newStr;
  this._processCaretChange(input);

  if (this.element.value !== newStr) {
    this.element.value = newStr;
  }
  this.onInputChange({ inputState: input });
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

  if (this.element.selectionStart !== start) {
    this.element.selectionStart = start;
  }
  if (this.element.selectionEnd !== end) {
    this.element.selectionEnd = end;
  }

  this._checkAssignment(start);

  this._caretChange = null;
  return newInput;
};

/**
 * To be called internally whenever we think that the current assignment might
 * have changed, typically on mouse-clicks or key presses.
 * @param start Optional - if specified, the cursor position to use in working
 * out the current assignment. This is needed because setting the element
 * selection start is only recognised when the event loop has finished
 */
Inputter.prototype._checkAssignment = function(start) {
  if (start == null) {
    start = this.element.selectionStart;
  }
  var newAssignment = this.requisition.getAssignmentAt(start);
  if (this.assignment !== newAssignment) {
    this.assignment = newAssignment;
    this.onAssignmentChange({ assignment: this.assignment });
  }

  // This is slightly nasty - the focusManager generally relies on people
  // telling it what it needs to know (which makes sense because the event
  // system to do it with events would be unnecessarily complex). However
  // requisition doesn't know about the focusManager either. So either one
  // needs to know about the other, or a third-party needs to break the
  // deadlock. These 2 lines are all we're quibbling about, so for now we hack
  if (this.focusManager) {
    var message = this.assignment.conversion.message;
    this.focusManager.setError(message != null && message !== '');
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
 * Counterpart to |setInput| for moving the cursor.
 * @param cursor An object shaped like { start: x, end: y }
 */
Inputter.prototype.setCursor = function(cursor) {
  this._caretChange = Caret.NO_CHANGE;
  this._processCaretChange({ typed: this.element.value, cursor: cursor });
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
    return;
  }

  // The following keys do not affect the state of the command line so we avoid
  // informing the focusManager about keyboard events that involve these keys
  if (ev.keyCode === KeyEvent.DOM_VK_F1 ||
      ev.keyCode === KeyEvent.DOM_VK_ESCAPE ||
      ev.keyCode === KeyEvent.DOM_VK_UP ||
      ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    return;
  }

  if (this.focusManager) {
    this.focusManager.onInputChange();
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
  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_F1) {
    this.focusManager.helpRequest();
    return;
  }

  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_ESCAPE) {
    this.focusManager.removeHelp();
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    if (this.tooltip && this.tooltip.isMenuShowing) {
      this.changeChoice(-1);
    }
    else if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.requisition.update(this.history.backward());
    }
    else {
      // If the user is on a valid value, then we increment the value, but if
      // they've typed something that's not right we page through predictions
      if (this.assignment.getStatus() === Status.VALID) {
        this.requisition.increment(this.assignment);
        // See notes on focusManager.onInputChange in onKeyDown
        if (this.focusManager) {
          this.focusManager.onInputChange();
        }
      }
      else {
        this.changeChoice(-1);
      }
    }
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    if (this.tooltip && this.tooltip.isMenuShowing) {
      this.changeChoice(+1);
    }
    else if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.requisition.update(this.history.forward());
    }
    else {
      // See notes above for the UP key
      if (this.assignment.getStatus() === Status.VALID) {
        this.requisition.decrement(this.assignment);
        // See notes on focusManager.onInputChange in onKeyDown
        if (this.focusManager) {
          this.focusManager.onInputChange();
        }
      }
      else {
        this.changeChoice(+1);
      }
    }
    return;
  }

  // RETURN checks status and might exec
  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    var worst = this.requisition.getStatus();
    // Deny RETURN unless the command might work
    if (worst === Status.VALID) {
      this._scrollingThroughHistory = false;
      this.history.add(this.element.value);
      this.requisition.exec();
    }
    else {
      // If we can't execute the command, but there is a menu choice to use
      // then use it.
      if (!this.tooltip.selectChoice()) {
        this.focusManager.setError(true);
      }
    }

    this._choice = null;
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB && !ev.shiftKey) {
    // Being able to complete 'nothing' is OK if there is some context, but
    // when there is nothing on the command line it jsut looks bizarre.
    var hasContents = (this.element.value.length > 0);
    // If the TAB keypress took the cursor from another field to this one,
    // then they get the keydown/keypress, and we get the keyup. In this
    // case we don't want to do any completion.
    // If the time of the keydown/keypress of TAB was close (i.e. within
    // 1 second) to the time of the keyup then we assume that we got them
    // both, and do the completion.
    if (hasContents && this.lastTabDownAt + 1000 > ev.timeStamp) {
      // It's possible for TAB to not change the input, in which case the
      // textChanged event will not fire, and the caret move will not be
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

  // Give the scratchpad (if enabled) a chance to activate
  if (this.scratchpad && this.scratchpad.shouldActivate(ev)) {
    if (this.scratchpad.activate(this.element.value)) {
      this.requisition.update('');
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
 * Used by onKeyUp for UP/DOWN to change the current choice from an options
 * menu.
 */
Inputter.prototype.changeChoice = function(amount) {
  if (this._choice == null) {
    this._choice = 0;
  }
  // There's an annoying up is down thing here, the menu is presented
  // with the zeroth index at the top working down, so the UP arrow needs
  // pick the choice below because we're working down
  this._choice += amount;
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
