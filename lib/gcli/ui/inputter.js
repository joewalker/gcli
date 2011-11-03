/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var cliView = exports;


var KeyEvent = require('gcli/util').event.KeyEvent;
var dom = require('gcli/util').dom;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;

var inputterCss = require('text!gcli/ui/inputter.css');


/**
 * A wrapper to take care of the functions concerning an input element
 */
function Inputter(options) {
  this.requisition = options.requisition;

  // Suss out where the input element is
  this.element = options.inputElement || 'gcliInput';
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
    this.style = dom.importCss(inputterCss, this.document);
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

  if (options.completer == null) {
    options.completer = new Completer(options);
  }
  else if (typeof options.completer === 'function') {
    options.completer = new options.completer(options);
  }
  this.completer = options.completer;
  this.completer.decorate(this);

  // Use the provided history object, or instantiate our own
  this.history = options.history = options.history || new History(options);
  this._scrollingThroughHistory = false;

  // Cursor position affects hint severity
  this.onMouseUp = function(ev) {
    this.completer.update(this.getInputState());
  }.bind(this);
  this.element.addEventListener('mouseup', this.onMouseUp, false);

  this.focusManager = options.focusManager;
  if (this.focusManager) {
    this.focusManager.addMonitoredElement(this.element, 'input');
  }

  this.requisition.inputChange.add(this.onInputChange, this);
}

/**
 * Avoid memory leaks
 */
Inputter.prototype.destroy = function() {
  this.requisition.inputChange.remove(this.onInputChange, this);
  if (this.focusManager) {
    this.focusManager.removeMonitoredElement(this.element, 'input');
  }

  this.element.removeEventListener('keydown', this.onKeyDown, false);
  this.element.removeEventListener('keyup', this.onKeyUp, false);
  delete this.onKeyDown;
  delete this.onKeyUp;

  this.history.destroy();
  this.completer.destroy();

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
 * Handler for the Requisition.inputChange event
 */
Inputter.prototype.onInputChange = function() {
  if (this._caretChange == null) {
    // We weren't expecting a change so this was requested by the hint system
    // we should move the cursor to the end of the 'changed section', and the
    // best we can do for that right now is the end of the current argument.
    this._caretChange = Caret.TO_ARG_END;
  }
  this._setInputInternal(this.requisition.toString());
};

/**
 * Internal function to set the input field to a value.
 * This function checks to see if the current value is the same as the new
 * value, and makes no changes if they are the same (except for caret/completer
 * updating - see below). If changes are to be made, they are done in a timeout
 * to avoid XUL bug 676520.
 * This function assumes that the data model is up to date with the new value.
 * It does attempts to leave the caret position in the same position in the
 * input string unless this._caretChange === Caret.TO_ARG_END. This is required
 * for completion events.
 * It does not change the completer decoration unless this._updatePending is
 * set. This is required for completion events.
 */
Inputter.prototype._setInputInternal = function(str, update) {
  if (!this.document) {
    return; // This can happen post-destroy()
  }

  if (this.element.value && this.element.value === str) {
    this._processCaretChange(this.getInputState(), false);
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
    input.typed = str;
    this._processCaretChange(input);
    this.element.value = str;

    if (update) {
      this.update();
    }
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
 * @param forceUpdate Do we call this.completer.update even when the cursor has
 * not changed (useful when input.typed has changed)
 */
Inputter.prototype._processCaretChange = function(input, forceUpdate) {
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

  var newInput = { typed: input.typed, cursor: { start: start, end: end }};
  if (start !== input.cursor.start || end !== input.cursor.end || forceUpdate) {
    this.completer.update(newInput);
  }

  this.element.selectionStart = newInput.cursor.start;
  this.element.selectionEnd = newInput.cursor.end;

  this._caretChange = null;
  return newInput;
};

/**
 * Set the input field to a value.
 * This function updates the data model and the completer decoration. It sets
 * the caret to the end of the input. It does not make any similarity checks
 * so calling this function with it's current value resets the cursor position.
 * It does not execute the input or affect the history.
 * This function should not be called internally, by Inputter and never as a
 * result of a keyboard event on this.element or bug 676520 could be triggered.
 */
Inputter.prototype.setInput = function(str) {
  this.element.value = str;
  this.update();
};

/**
 * Focus the input element
 */
Inputter.prototype.focus = function() {
  this.element.focus();
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
      this.getCurrentAssignment().complete();
      // It's possible for TAB to not change the input, in which case the
      // onInputChange event will not fire, and the caret move will not be
      // processed. So we check that this is done
      this._caretChange = Caret.TO_ARG_END;
      this._processCaretChange(this.getInputState(), true);
    }
    this.lastTabDownAt = 0;
    this._scrollingThroughHistory = false;
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this._setInputInternal(this.history.backward(), true);
    }
    else {
      this.getCurrentAssignment().increment();
    }
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this._setInputInternal(this.history.forward(), true);
    }
    else {
      this.getCurrentAssignment().decrement();
    }
    return;
  }

  this._scrollingThroughHistory = false;
  this._caretChange = Caret.NO_CHANGE;
  this.update();
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
 * Actually parse the input and make sure we're all up to date
 */
Inputter.prototype.update = function() {
  var input = this.getInputState();
  this.requisition.update(input);
  this.completer.update(input);
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

  return input;
};

cliView.Inputter = Inputter;


/**
 * Completer is an 'input-like' element that sits  an input element annotating
 * it with visual goodness.
 * @param {object} options An object that contains various options which
 * customizes how the completer functions.
 * Properties on the options object:
 * - document (required) DOM document to be used in creating elements
 * - requisition (required) A GCLI Requisition object whose state is monitored
 * - completeElement (optional) An element to use
 * - completionPrompt (optional) The prompt to show before a completion.
 *   Defaults to '&#x00bb;' (double greater-than, a.k.a right guillemet).
 */
function Completer(options) {
  this.document = options.document;
  this.requisition = options.requisition;
  this.elementCreated = false;

  this.element = options.completeElement || 'gcliComplete';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.document.getElementById(name);

    if (!this.element) {
      this.elementCreated = true;
      this.element = dom.createElement(this.document, 'div');
      this.element.className = 'gcliCompletion gcliVALID';
      this.element.setAttribute('tabindex', '-1');
      this.element.setAttribute('aria-live', 'polite');
    }
  }

  this.completionPrompt = typeof options.completionPrompt === 'string'
    ? options.completionPrompt
    : '&#x00bb;';

  if (options.inputBackgroundElement) {
    this.backgroundElement = options.inputBackgroundElement;
  }
  else {
    this.backgroundElement = this.element;
  }
}

/**
 * Avoid memory leaks
 */
Completer.prototype.destroy = function() {
  delete this.document;
  delete this.element;
  delete this.backgroundElement;

  if (this.elementCreated) {
    this.document.defaultView.removeEventListener('resize', this.resizer, false);
  }

  delete this.inputter;
};

/**
 * A list of the styles that decorate() should copy to make the completion
 * element look like the input element. backgroundColor is a spiritual part of
 * this list, but see comment in decorate().
 */
Completer.copyStyles = [ 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle' ];

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Completer.prototype.decorate = function(inputter) {
  this.inputter = inputter;
  var input = inputter.element;

  // If we were told which element to use, then assume it is already
  // correctly positioned. Otherwise insert it alongside the input element
  if (this.elementCreated) {
    this.inputter.appendAfter(this.element);

    var styles = this.document.defaultView.getComputedStyle(input, null);
    Completer.copyStyles.forEach(function(style) {
      this.element.style[style] = styles[style];
    }, this);

    // The completer text is by default invisible so we make it the same color
    // as the input background.
    this.element.style.color = input.style.backgroundColor;

    // If there is a separate backgroundElement, then we make the element
    // transparent, otherwise it inherits the color of the input node
    // It's not clear why backgroundColor doesn't work when used from
    // computedStyle, but it doesn't. Patches welcome!
    this.element.style.backgroundColor = (this.backgroundElement != this.element) ?
        'transparent' :
        input.style.backgroundColor;
    input.style.backgroundColor = 'transparent';

    // Make room for the prompt
    input.style.paddingLeft = '20px';

    this.resizer = this.resizer.bind(this);
    this.document.defaultView.addEventListener('resize', this.resizer, false);
    this.resizer();
  }
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Completer.prototype.resizer = function() {
  var rect = this.inputter.element.getBoundingClientRect();
  // -4 to line up with 1px of padding and border, top and bottom
  var height = rect.bottom - rect.top - 4;

  this.element.style.top = rect.top + 'px';
  this.element.style.height = height + 'px';
  this.element.style.lineHeight = height + 'px';
  this.element.style.left = rect.left + 'px';
  this.element.style.width = (rect.right - rect.left) + 'px';
};

/**
 * Is the completion given, a "strict" completion of the user inputted value?
 * A completion is considered "strict" only if it the user inputted value is an
 * exact prefix of the completion (ignoring leading whitespace)
 */
function isStrictCompletion(inputValue, completion) {
  // Strip any leading whitespace from the user inputted value because the
  // completion will never have leading whitespace.
  inputValue = inputValue.replace(/^\s*/, '');
  // Strict: "ec" -> "echo"
  // Non-Strict: "ls *" -> "ls foo bar baz"
  return completion.indexOf(inputValue) === 0;
}

/**
 * Bring the completion element up to date with what the requisition says
 */
Completer.prototype.update = function(input) {
  var current = this.requisition.getAssignmentAt(input.cursor.start);
  var predictions = current.getPredictions();

  var completion = '<span class="gcliPrompt">' + this.completionPrompt + '</span> ';
  if (input.typed.length > 0) {
    var scores = this.requisition.getInputStatusMarkup();
    completion += this.markupStatusScore(scores, input);
  }

  if (input.typed.length > 0 && predictions.length > 0) {
    var tab = predictions[0].name;
    var existing = current.getArg().text;
    if (isStrictCompletion(existing, tab) && input.cursor.start === input.typed.length) {
      // Display the suffix of the prediction as the completion.
      var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;
      var suffix = tab.slice(existing.length - numLeadingSpaces);
      completion += '<span class="gcliCompl">' + suffix + '</span>';
    } else {
      // Display the '-> prediction' at the end of the completer element
      completion += ' &#xa0;<span class="gcliCompl">&#x21E5; ' +
          tab + '</span>';
    }
  }

  // A hack to add a grey '}' to the end of the command line when we've opened
  // with a { but haven't closed it
  var command = this.requisition.commandAssignment.getValue();
  if (command && command.name === '{') {
    if (this.requisition.getAssignment(0).getArg().suffix.indexOf('}') === -1) {
      completion += '<span class="gcliCloseBrace">}</span>';
    }
  }

  dom.setInnerHtml(this.element, '<span>' + completion + '</span>');
};

/**
 * Mark-up an array of Status values with spans
 */
Completer.prototype.markupStatusScore = function(scores, input) {
  var completion = '';
  if (scores.length === 0) {
    return completion;
  }

  var i = 0;
  var lastStatus = -1;
  while (true) {
    if (lastStatus !== scores[i]) {
      var state = scores[i];
      if (!state) {
        console.error('No state at i=' + i + '. scores.len=' + scores.length);
        state = Status.VALID;
      }
      completion += '<span class="gcli' + state.toString() + '">';
      lastStatus = scores[i];
    }
    var char = input.typed[i];
    if (char === ' ') {
      char = '&#xa0;';
    }
    completion += char;
    i++;
    if (i === input.typed.length) {
      completion += '</span>';
      break;
    }
    if (lastStatus !== scores[i]) {
      completion += '</span>';
    }
  }

  return completion;
};

cliView.Completer = Completer;


});
