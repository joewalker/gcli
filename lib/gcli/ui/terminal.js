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

var promise = require('util/promise');
var util = require('util/util');
var domtemplate = require('util/domtemplate');
var KeyEvent = require('util/util').KeyEvent;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;
var CommandAssignment = require('gcli/cli').CommandAssignment;

var fields = require('gcli/ui/fields');
var FocusManager = require('gcli/ui/focus').FocusManager;

var terminalCss = require('text!gcli/ui/terminal.css');
var terminalHtml = require('text!gcli/ui/terminal.html');

var RESOLVED = promise.resolve(true);

/**
 * A wrapper to take care of the functions concerning an input element
 * @param options Object containing user customization properties, including:
 * - promptWidth (default=22px)
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition
 * - document
 */
function Terminal(options, components) {
  this.requisition = components.requisition;
  this.document = components.document;

  this.onInputChange = util.createEvent('Terminal.onInputChange');

  this.focusManager = new FocusManager(options, {
    document: this.document,
    requisition: this.requisition
  });

  // Configure the UI
  this.rootElement = this.document.getElementById('gcli-root');
  if (!this.rootElement) {
    throw new Error('Missing element, id=gcli-root');
  }

  // terminal.html contains sub-templates which we detach for later processing
  var template = util.toDom(this.document, terminalHtml);

  this.tooltipTemplate = template.querySelector('.gcli-tt');
  this.tooltipTemplate.parentElement.removeChild(this.tooltipTemplate);

  this.completerTemplate = template.querySelector('.gcli-in-complete > div');
  this.completerTemplate.parentElement.removeChild(this.completerTemplate);
  // We want the spans to line up without the spaces in the template
  util.removeWhitespace(this.completerTemplate, true);

  this.outputViewTemplate = template.querySelector('.gcli-output > div');
  this.outputViewTemplate.parentElement.removeChild(this.outputViewTemplate);

  // Now we've detached the sub-templates, load what is left
  // The following elements are stored into 'this' by this template process:
  // displayElement, panelElement, tooltipElement, outputElement,
  // inputElement, completeElement, promptElement
  domtemplate.template(template, this, { stack: 'terminal.html' });
  while (template.hasChildNodes()) {
    this.rootElement.appendChild(template.firstChild);
  }

  if (terminalCss != null) {
    this.style = util.importCss(terminalCss, this.document, 'gcli-tooltip');
  }

  this.panelElement.classList.add('gcli-panel-hide');

  // Firefox doesn't autofocus with dynamically added elements (Bug 662496)
  this.inputElement.focus();

  // Which of the available completion options is the user considering?
  this.choice = 0;

  // Used to distinguish focus from TAB in CLI. See onKeyUp()
  this.lastTabDownAt = 0;

  // Used to effect caret changes. See _processCaretChange()
  this._caretChange = null;

  // Setup History
  this.history = new History();
  this._scrollingThroughHistory = false;

  // Used when we're selecting which prediction to complete with
  this._choice = null;

  // Initially an asynchronous completion isn't in-progress
  this._completed = RESOLVED;

  // We keep a track of which assignment the cursor is in
  this.assignment = this.requisition.getAssignmentAt(0);

  // Avoid calling requisition.update when the keyUp results in no change
  this._previousValue = undefined;

  // We cache the fields we create so we can destroy them later
  this.fields = [];

  // We also keep track of the last known arg text for the current assignment
  this.lastText = undefined;

  // Bind handlers
  this.focus = this.focus.bind(this);
  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);
  this.onMouseUp = this.onMouseUp.bind(this);
  this.onWindowResize = this.onWindowResize.bind(this);

  this.rootElement.addEventListener('click', this.focus, false);

  // Ensure that TAB/UP/DOWN isn't handled by the browser
  this.inputElement.addEventListener('keydown', this.onKeyDown, false);
  this.inputElement.addEventListener('keyup', this.onKeyUp, false);

  // Cursor position affects hint severity
  this.inputElement.addEventListener('mouseup', this.onMouseUp, false);

  this.focusManager.onVisibilityChange.add(this.visibilityChanged, this);
  this.focusManager.addMonitoredElement(this.tooltipElement, 'tooltip');
  this.focusManager.addMonitoredElement(this.inputElement, 'input');

  this.requisition.onTextChange.add(this.textChanged, this);
  this.requisition.commandOutputManager.onOutput.add(this.outputted, this);

  this.document.defaultView.addEventListener('resize', this.onWindowResize, false);

  this.onInputChange.add(this.updateCompletion, this);

  this.requisition.update(this.inputElement.value || '');
  this.onWindowResize();
  this.updateCompletion();
  this.assignmentChanged({ assignment: this.assignment });
}

/**
 * Avoid memory leaks
 */
Terminal.prototype.destroy = function() {
  this.document.defaultView.removeEventListener('resize', this.onWindowResize, false);

  this.requisition.onTextChange.remove(this.textChanged, this);
  this.requisition.commandOutputManager.onOutput.remove(this.outputted, this);

  this.focusManager.removeMonitoredElement(this.inputElement, 'input');
  this.focusManager.removeMonitoredElement(this.tooltipElement, 'tooltip');
  this.focusManager.onVisibilityChange.remove(this.visibilityChanged, this);

  this.inputElement.removeEventListener('mouseup', this.onMouseUp, false);
  this.inputElement.removeEventListener('keydown', this.onKeyDown, false);
  this.inputElement.removeEventListener('keyup', this.onKeyUp, false);
  this.rootElement.removeEventListener('click', this.focus, false);

  this.history.destroy();
  this.focusManager.destroy();

  if (this.style) {
    this.style.parentNode.removeChild(this.style);
    this.style = undefined;
  }

  this.field.onFieldChange.remove(this.fieldChanged, this);
  this.field.destroy();

  this.onInputChange.remove(this.updateCompletion, this);

  this.focus = undefined;
  this.onMouseUp = undefined;
  this.onKeyDown = undefined;
  this.onKeyUp = undefined;
  this.onWindowResize = undefined;

  this.document = undefined;

  this.lastText = undefined;
  this.assignment = undefined;

  this.rootElement = undefined;
  this.inputElement = undefined;
  this.promptElement = undefined;
  this.completeElement = undefined;
  this.tooltipElement = undefined;
  this.panelElement = undefined;
  this.outputElement = undefined;

  this.completerTemplate = undefined;
  this.tooltipTemplate = undefined;
  this.outputViewTemplate = undefined;

  this.errorEle = undefined;
  this.descriptionEle = undefined;
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Terminal.prototype.onWindowResize = function() {
  // Mochitest sometimes causes resize after shutdown. See Bug 743190
  if (!this.inputElement) {
    return;
  }

  // Simplify when jsdom does getBoundingClientRect(). See Bug 717269
  var dimensions = this.getDimensions();
  if (dimensions) {
    // TODO: Remove this if we manage to land this with a pure CSS layout
  }
};

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Terminal.prototype.getDimensions = function() {
  // Remove this when jsdom does getBoundingClientRect(). See Bug 717269
  if (!this.inputElement.getBoundingClientRect) {
    return undefined;
  }

  var fixedLoc = {};
  var currentElement = this.inputElement.parentNode;
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

  var rect = this.inputElement.getBoundingClientRect();
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
Terminal.prototype.onMouseUp = function(ev) {
  this._checkAssignment();
};

/**
 * Handler for the Requisition.textChanged event
 */
Terminal.prototype.textChanged = function() {
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

  if (this.inputElement.value !== newStr) {
    this.inputElement.value = newStr;
  }
  this.onInputChange({ inputState: input });

  // Requisition fires onTextChanged events on any change, including minor
  // things like whitespace change in arg prefix, so we ignore anything but
  // an actual value change.
  if (this.assignment.arg.text === this.lastText) {
    return;
  }

  this.lastText = this.assignment.arg.text;

  this.field.setConversion(this.assignment.conversion);
  util.setTextContent(this.descriptionEle, this.description);

  this._updatePosition();
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
Terminal.prototype._processCaretChange = function(input) {
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

  if (this.inputElement.selectionStart !== start) {
    this.inputElement.selectionStart = start;
  }
  if (this.inputElement.selectionEnd !== end) {
    this.inputElement.selectionEnd = end;
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
Terminal.prototype._checkAssignment = function(start) {
  if (start == null) {
    start = this.inputElement.selectionStart;
  }
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

    this.updateCompletion({ assignment: this.assignment });

    if (isNew) {
      this.assignmentChanged({ assignment: this.assignment });
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
  // deadlock. These 2 lines are all we're quibbling about, so for now we hack
  if (this.focusManager) {
    this.focusManager.setError(this.assignment.message);
  }
};

/**
 * Set the input field to a value, for external use.
 * This function updates the data model. It sets the caret to the end of the
 * input. It does not make any similarity checks so calling this function with
 * it's current value resets the cursor position.
 * It does not execute the input or affect the history.
 * This function should not be called internally, by Terminal and never as a
 * result of a keyboard event on this.inputElement or bug 676520 could be
 * triggered.
 */
Terminal.prototype.setInput = function(str) {
  this._caretChange = Caret.TO_END;
  return this.requisition.update(str);
};

/**
 * Counterpart to |setInput| for moving the cursor.
 * @param cursor An object shaped like { start: x, end: y }
 */
Terminal.prototype.setCursor = function(cursor) {
  this._caretChange = Caret.NO_CHANGE;
  this._processCaretChange({ typed: this.inputElement.value, cursor: cursor });
};

/**
 * Focus the input element
 */
Terminal.prototype.focus = function() {
  this.inputElement.focus();
  this._checkAssignment();
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Terminal.prototype.onKeyDown = function(ev) {
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
        this.inputElement.blur();
      }
    }
  }
};

/**
 * Handler for use with DOM events, which just calls the promise enabled
 * handleKeyUp function but checks the exit state of the promise so we know
 * if something went wrong.
 */
Terminal.prototype.onKeyUp = function(ev) {
  this.handleKeyUp(ev).then(null, util.errorHandler);
};

/**
 * The main keyboard processing loop
 * @return A promise that resolves (to undefined) when the actions kicked off
 * by this handler are completed.
 */
Terminal.prototype.handleKeyUp = function(ev) {
  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_F1) {
    this.focusManager.helpRequest();
    return RESOLVED;
  }

  if (this.focusManager && ev.keyCode === KeyEvent.DOM_VK_ESCAPE) {
    this.focusManager.removeHelp();
    return RESOLVED;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    return this._handleUpArrow();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    return this._handleDownArrow();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    return this._handleReturn();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB && !ev.shiftKey) {
    return this._handleTab(ev);
  }

  if (this._previousValue === this.inputElement.value) {
    return RESOLVED;
  }

  this._scrollingThroughHistory = false;
  this._caretChange = Caret.NO_CHANGE;

  this._completed = this.requisition.update(this.inputElement.value);
  this._previousValue = this.inputElement.value;

  return this._completed.then(function(updated) {
    // Abort UI changes if this UI update has been overtaken
    if (updated) {
      this._choice = null;
      this.choiceChanged({ choice: this._choice });
    }
  }.bind(this));
};

/**
 * See also _handleDownArrow for some symmetry
 */
Terminal.prototype._handleUpArrow = function() {
  if (this.isMenuShowing) {
    this.changeChoice(-1);
    return RESOLVED;
  }

  if (this.inputElement.value === '' || this._scrollingThroughHistory) {
    this._scrollingThroughHistory = true;
    return this.requisition.update(this.history.backward());
  }

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

  return RESOLVED;
};

/**
 * See also _handleUpArrow for some symmetry
 */
Terminal.prototype._handleDownArrow = function() {
  if (this.isMenuShowing) {
    this.changeChoice(+1);
    return RESOLVED;
  }

  if (this.inputElement.value === '' || this._scrollingThroughHistory) {
    this._scrollingThroughHistory = true;
    return this.requisition.update(this.history.forward());
  }

  // See notes above for the UP key
  if (this.assignment.getStatus() === Status.VALID) {
    this.requisition.decrement(this.assignment,
                               this.requisition.executionContext);
    // See notes on focusManager.onInputChange in onKeyDown
    if (this.focusManager) {
      this.focusManager.onInputChange();
    }
  }
  else {
    this.changeChoice(+1);
  }

  return RESOLVED;
};

/**
 * RETURN checks status and might exec
 */
Terminal.prototype._handleReturn = function() {
  // Deny RETURN unless the command might work
  if (this.requisition.status === Status.VALID) {
    this._scrollingThroughHistory = false;
    this.history.add(this.inputElement.value);
    this.requisition.exec();
  }
  else {
    // If we can't execute the command, but there is a menu choice to use
    // then use it.
    if (!this.selectChoice()) {
      this.focusManager.setError(true);
    }
  }

  this._choice = null;
  return RESOLVED;
};

/**
 * Warning: We get TAB events for more than just the user pressing TAB in our
 * input element.
 */
Terminal.prototype._handleTab = function(ev) {
  // Being able to complete 'nothing' is OK if there is some context, but
  // when there is nothing on the command line it just looks bizarre.
  var hasContents = (this.inputElement.value.length > 0);

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

    // The changes made by complete may happen asynchronously, so after the
    // the call to complete() we should avoid making changes before the end
    // of the event loop
    this._completed = this.requisition.complete(inputState.cursor,
                                                this._choice);
    this._previousValue = this.inputElement.value;
  }
  this.lastTabDownAt = 0;
  this._scrollingThroughHistory = false;

  return this._completed.then(function(updated) {
    // Abort UI changes if this UI update has been overtaken
    if (updated) {
      this._choice = null;
      this.choiceChanged({ choice: this._choice });
    }
  }.bind(this));
};

/**
 * Used by onKeyUp for UP/DOWN to change the current choice from an options
 * menu.
 */
Terminal.prototype.changeChoice = function(amount) {
  if (this._choice == null) {
    this._choice = 0;
  }
  // There's an annoying up is down thing here, the menu is presented
  // with the zeroth index at the top working down, so the UP arrow needs
  // pick the choice below because we're working down
  this._choice += amount;
  this.choiceChanged({ choice: this._choice });
};

/**
 * Pull together an input object, which may include XUL hacks
 */
Terminal.prototype.getInputState = function() {
  var input = {
    typed: this.inputElement.value,
    cursor: {
      start: this.inputElement.selectionStart,
      end: this.inputElement.selectionEnd
    }
  };

  // Workaround for potential XUL bug 676520 where textbox gives incorrect
  // values for its content
  if (input.typed == null) {
    input = { typed: '', cursor: { start: 0, end: 0 } };
  }

  // Workaround for a Bug 717268 (which is really a jsdom bug)
  if (input.cursor.start == null) {
    input.cursor.start = 0;
  }

  return input;
};

/**
 * Bring the completion element up to date with what the requisition says
 */
Terminal.prototype.updateCompletion = function(ev) {
  this.choice = (ev && ev.choice != null) ? ev.choice : 0;

  this._getCompleterTemplateData().then(function(data) {
    var template = this.completerTemplate.cloneNode(true);
    domtemplate.template(template, data, { stack: 'terminal.html#completer' });

    util.clearElement(this.completeElement);
    while (template.hasChildNodes()) {
      this.completeElement.appendChild(template.firstChild);
    }
  }.bind(this));
};

/**
 * Calculate the properties required by the template process for completer.html
 */
Terminal.prototype._getCompleterTemplateData = function() {
  var input = this.getInputState();
  var start = input.cursor.start;

  return this.requisition.getStateData(start, this.choice).then(function(data) {
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
 * The terminal acts on UP/DOWN if there is a menu showing
 */
Object.defineProperty(Terminal.prototype, 'isMenuShowing', {
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
Terminal.prototype.assignmentChanged = function(ev) {
  this.lastText = this.assignment.arg.text;

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
  this.field.setConversion(this.assignment.conversion);

  // Filled in by the template process
  this.errorEle = undefined;
  this.descriptionEle = undefined;

  var contents = this.tooltipTemplate.cloneNode(true);
  domtemplate.template(contents, this, {
    blankNullUndefined: true,
    stack: 'terminal.html#tooltip'
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
Terminal.prototype.choiceChanged = function(ev) {
  this.updateCompletion(ev);

  if (this.field && this.field.setChoiceIndex) {
    var conversion = this.assignment.conversion;
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
Terminal.prototype.selectChoice = function(ev) {
  if (this.field && this.field.selectChoice) {
    return this.field.selectChoice();
  }
  return false;
};

/**
 * Called by the onFieldChange event on the current Field
 */
Terminal.prototype.fieldChanged = function(ev) {
  this.requisition.setAssignment(this.assignment, ev.conversion.arg,
                                 { matchPadding: true });

  var isError = ev.conversion.message != null && ev.conversion.message !== '';
  this.focusManager.setError(isError);

  // Nasty hack, the terminal won't know about the text change yet, so it will
  // get it's calculations wrong. We need to wait until the current set of
  // changes has had a chance to propagate
  this.document.defaultView.setTimeout(function() {
    this.focus();
  }.bind(this), 10);
};

/**
 * Called to move the tooltip to the correct horizontal position
 */
Terminal.prototype._updatePosition = function() {
  var dimensions = this.getDimensionsOfAssignment();

  // 7px is roughly the width of a char
  if (this.panelElement) {
    this.panelElement.style.marginLeft = (dimensions.start * 7 + 15) + 'px';
  }

  this.focusManager.updatePosition(dimensions);
};

/**
 * Returns a object containing 'start' and 'end' properties which identify the
 * number of pixels from the left hand edge of the input element that represent
 * the text portion of the current assignment.
 */
Terminal.prototype.getDimensionsOfAssignment = function() {
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
Object.defineProperty(Terminal.prototype, 'description', {
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
 * Tweak CSS to show/hide the output
 */
Terminal.prototype.visibilityChanged = function(ev) {
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

/**
 * Monitor for new command executions
 */
Terminal.prototype.outputted = function(ev) {
  if (ev.output.hidden) {
    return;
  }

  ev.output.view = new OutputView(ev.output, this);
};

exports.Terminal = Terminal;


/**
 * Adds a row to the CLI output display
 */
function OutputView(output, terminal) {
  this.output = output;
  this.terminal = terminal;

  this._outputted = this._outputted.bind(this);
  this.url = util.createUrlLookup(module);

  // Elements attached to this by template().
  this.elems = {
    rowin: null,
    rowout: null,
    hide: null,
    show: null,
    duration: null,
    throb: null,
    prompt: null
  };

  // Handle clicks and double clicks to copy and exec commands
  var context = this.terminal.requisition.conversionContext;
  this.onclick = context.update;
  this.ondblclick = context.updateExec;

  var template = this.terminal.outputViewTemplate.cloneNode(true);
  domtemplate.template(template, this, {
    allowEval: true,
    stack: 'terminal.html#outputView'
  });

  this.terminal.outputElement.insertBefore(this.elems.rowin, this.terminal.inputElement.parentElement);
  this.terminal.outputElement.insertBefore(this.elems.rowout, this.terminal.inputElement.parentElement);

  this.output.onClose.add(this.closed, this);
  this.output.promise.then(this._outputted);

  this.scrollToBottom();
}

OutputView.prototype.destroy = function() {
  this.output.onClose.remove(this.closed, this);

  this.terminal.outputElement.removeChild(this.elems.rowin);
  this.terminal.outputElement.removeChild(this.elems.rowout);

  this.output = undefined;
  this.terminal = undefined;
  this.url = undefined;
  this.elems = undefined;
};

/**
 * Only display a prompt if there is a command, otherwise, leave blank
 */
Object.defineProperty(OutputView.prototype, 'prompt', {
  get: function() {
    return this.output.canonical ? '\u00bb' : '';
  },
  enumerable: true
});

OutputView.prototype.hideOutput = function(ev) {
  this.elems.rowout.style.display = 'none';
  this.elems.hide.classList.add('cmd_hidden');
  this.elems.show.classList.remove('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.showOutput = function(ev) {
  this.elems.rowout.style.display = 'block';
  this.elems.hide.classList.remove('cmd_hidden');
  this.elems.show.classList.add('cmd_hidden');

  ev.stopPropagation();
};

OutputView.prototype.closed = function(ev) {
  this.destroy();
};

OutputView.prototype._outputted = function() {
  var document = this.elems.rowout.ownerDocument;
  var duration = this.output.duration != null ?
          'completed in ' + (this.output.duration / 1000) + ' sec ' :
          '';
  duration = document.createTextNode(duration);
  this.elems.duration.appendChild(duration);

  if (this.output.completed) {
    this.elems.prompt.classList.add('gcli-row-complete');
  }
  if (this.output.error) {
    this.elems.prompt.classList.add('gcli-row-error');
  }

  util.clearElement(this.elems.rowout);
  var context = this.terminal.requisition.conversionContext;
  this.output.convert('dom', context).then(function(node) {
    util.linksToNewTab(node);
    this.elems.rowout.appendChild(node);

    this.scrollToBottom();

    this.elems.throb.style.display = this.output.completed ? 'none' : 'block';
  }.bind(this));
};

OutputView.prototype.scrollToBottom = function() {
  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.terminal.outputElement.scrollHeight,
                              this.terminal.outputElement.clientHeight);
  this.terminal.outputElement.scrollTop =
                      scrollHeight - this.terminal.outputElement.clientHeight;
};

exports.OutputView = OutputView;


});
