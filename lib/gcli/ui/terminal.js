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

var promise = require('../util/promise');
var util = require('../util/util');
var domtemplate = require('../util/domtemplate');
var KeyEvent = require('../util/util').KeyEvent;
var host = require('../util/host');

var Status = require('../types').Status;
var History = require('../history').History;

var FocusManager = require('./focus').FocusManager;
var CommandControl = require('./control/command').CommandControl;
var Caret = require('./control/command').Caret;

var RESOLVED = promise.resolve(true);

/**
 * Kick off a resource load as soon as we can
 */
var resourcesPromise = promise.all([
  host.staticRequire(module, './terminal.css'),
  host.staticRequire(module, './terminal.html')
]);

/**
 * Asynchronous construction. Use Terminal.create();
 * @private
 */
function Terminal() {
  throw new Error('Use Terminal.create().then(...) rather than new Terminal()');
}

/**
 * A wrapper to take care of the functions concerning an input element
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition
 * - document
 */
Terminal.create = function(components) {
  var terminal = Object.create(Terminal.prototype);
  return resourcesPromise.then(function(resources) {
    terminal._init(components, resources[0], resources[1]);
    return terminal;
  });
};

/**
 * Asynchronous construction. Use Terminal.create();
 * @private
 */
Terminal.prototype._init = function(components, terminalCss, terminalHtml) {
  this.document = components.document;

  this.focusManager = new FocusManager(this.document);
  this.control = new CommandControl(this, this.focusManager,
                                    components.requisition);

  this.onInputChange = util.createEvent('Terminal.onInputChange');

  // Configure the UI
  this.rootElement = this.document.getElementById('gcli-root');
  if (!this.rootElement) {
    throw new Error('Missing element, id=gcli-root');
  }

  // terminal.html contains sub-templates which we detach for later processing
  var template = util.toDom(this.document, terminalHtml);

  // JSDom appears to have a broken parentElement, so this is a workaround
  // this.tooltipTemplate = template.querySelector('.gcli-tt');
  // this.tooltipTemplate.parentElement.removeChild(this.tooltipTemplate);
  var tooltipParent = template.querySelector('.gcli-tooltip');
  this.tooltipTemplate = tooltipParent.children[0];
  tooltipParent.removeChild(this.tooltipTemplate);

  // this.completerTemplate = template.querySelector('.gcli-in-complete > div');
  // this.completerTemplate.parentElement.removeChild(this.completerTemplate);
  var completerParent = template.querySelector('.gcli-in-complete');
  this.completerTemplate = completerParent.children[0];
  completerParent.removeChild(this.completerTemplate);
  // We want the spans to line up without the spaces in the template
  util.removeWhitespace(this.completerTemplate, true);

  // this.outputViewTemplate = template.querySelector('.gcli-display > div');
  // this.outputViewTemplate.parentElement.removeChild(this.outputViewTemplate);
  var outputViewParent = template.querySelector('.gcli-display');
  this.outputViewTemplate = outputViewParent.children[0];
  outputViewParent.removeChild(this.outputViewTemplate);

  // Now we've detached the sub-templates, load what is left
  // The following elements are stored into 'this' by this template process:
  // displayElement, panelElement, tooltipElement,
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

  // Used to distinguish focus from TAB in CLI. See onKeyUp()
  this.lastTabDownAt = 0;

  // Used to effect caret changes. See _processCaretChange()
  this._caretChange = null;

  // Setup History
  this.history = new History();
  this._scrollingThroughHistory = false;

  // Initially an asynchronous completion isn't in-progress
  this._completed = RESOLVED;

  // Avoid updating when the keyUp results in no change
  this._previousValue = undefined;

  // We cache the fields we create so we can destroy them later
  this.fields = [];

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

  this.document.defaultView.addEventListener('resize', this.onWindowResize, false);

  this.onInputChange.add(this.updateCompletion, this);

  this.onWindowResize();
  this.updateCompletion();
  this.control.updateHints();
};

/**
 * Avoid memory leaks
 */
Terminal.prototype.destroy = function() {
  this.document.defaultView.removeEventListener('resize', this.onWindowResize, false);

  this.focusManager.removeMonitoredElement(this.inputElement, 'input');
  this.focusManager.removeMonitoredElement(this.tooltipElement, 'tooltip');
  this.focusManager.onVisibilityChange.remove(this.visibilityChanged, this);

  this.inputElement.removeEventListener('mouseup', this.onMouseUp, false);
  this.inputElement.removeEventListener('keydown', this.onKeyDown, false);
  this.inputElement.removeEventListener('keyup', this.onKeyUp, false);
  this.rootElement.removeEventListener('click', this.focus, false);

  this.control.destroy();
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

  this.rootElement = undefined;
  this.inputElement = undefined;
  this.promptElement = undefined;
  this.completeElement = undefined;
  this.tooltipElement = undefined;
  this.panelElement = undefined;
  this.displayElement = undefined;

  this.completerTemplate = undefined;
  this.tooltipTemplate = undefined;
  this.outputViewTemplate = undefined;

  this.errorEle = undefined;
  this.descriptionEle = undefined;

  this.document = undefined;
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
  this.control.caretMoved(this.inputElement.selectionStart);
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

  this.control.caretMoved(start);

  this._caretChange = null;
  return newInput;
};

/**
 * Set the input field to a value, for external use.
 * It does not execute the input or affect the history.
 * This function should not be called internally, by Terminal and never as a
 * result of a keyboard event on this.inputElement or bug 676520 could be
 * triggered.
 */
Terminal.prototype.setInput = function(str) {
  this._scrollingThroughHistory = false;
  return this._setInput(str);
};

/**
 * @private Internal version of setInput
 */
Terminal.prototype._setInput = function(str) {
  this.inputElement.value = str;
  this._previousValue = this.inputElement.value;

  this._completed = this.control.handleInput(str);
  return this._completed;
};

/**
 * Counterpart to |setInput| for moving the cursor.
 * @param cursor A JS object shaped like { start: x, end: y }
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
  this.control.caretMoved(this.inputElement.selectionStart);
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Terminal.prototype.onKeyDown = function(ev) {
  if (ev.keyCode === KeyEvent.DOM_VK_UP ||
      ev.keyCode === KeyEvent.DOM_VK_DOWN) {
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
  this.handleKeyUp(ev).done();
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
    if (this.isMenuShowing) {
      return this.incrementChoice();
    }

    if (this.inputElement.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      return this._setInput(this.history.backward());
    }

    return this.control.handleUpArrow().then(function(handled) {
      if (!handled) {
        return this.incrementChoice();
      }
    }.bind(this));
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    if (this.isMenuShowing) {
      return this.decrementChoice();
    }

    if (this.inputElement.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      return this._setInput(this.history.forward());
    }

    return this.control.handleDownArrow().then(function(handled) {
      if (!handled) {
        return this.decrementChoice();
      }
    }.bind(this));
  }

  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    return this.control.handleReturn();
  }

  if (ev.keyCode === KeyEvent.DOM_VK_TAB && !ev.shiftKey) {
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
      this._completed = this.control.handleTab();
    }
    else {
      this._completed = RESOLVED;
    }

    this.lastTabDownAt = 0;
    this._scrollingThroughHistory = false;

    return this._completed;
  }

  if (this._previousValue === this.inputElement.value) {
    return RESOLVED;
  }

  var value = this.inputElement.value;
  this._scrollingThroughHistory = false;
  this._previousValue = this.inputElement.value;

  this._completed = this.control.handleInput(value);
  return this._completed;
};

/**
 * What is the index of the currently highlighted option?
 */
Terminal.prototype.getChoiceIndex = function() {
  return this.field && this.field.menu ? this.field.menu.getChoiceIndex() : 0;
};

/**
 * Don't show any menu options
 */
Terminal.prototype.unsetChoice = function() {
  if (this.field && this.field.menu) {
    this.field.menu.unsetChoice();
  }
  this.updateCompletion();
};

/**
 * Select the previous option in a list of choices
 */
Terminal.prototype.incrementChoice = function() {
  if (this.field && this.field.menu) {
    this.field.menu.incrementChoice();
  }
  return this.updateCompletion();
};

/**
 * Select the next option in a list of choices
 */
Terminal.prototype.decrementChoice = function() {
  if (this.field && this.field.menu) {
    this.field.menu.decrementChoice();
  }
  return this.updateCompletion();
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
 * Bring the completion element up to date with what the control says
 */
Terminal.prototype.updateCompletion = function() {
  return this.control.getCompleterTemplateData().then(function(data) {
    var template = this.completerTemplate.cloneNode(true);
    domtemplate.template(template, data, { stack: 'terminal.html#completer' });

    util.clearElement(this.completeElement);
    while (template.hasChildNodes()) {
      this.completeElement.appendChild(template.firstChild);
    }
  }.bind(this));
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
  this.control.fieldChanged(ev);

  // Nasty hack, the terminal won't know about the text change yet, so it will
  // get it's calculations wrong. We need to wait until the current set of
  // changes has had a chance to propagate
  this.document.defaultView.setTimeout(function() {
    this.focus();
  }.bind(this), 10);
};

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
  this.scrollToBottom();
};

/**
 * For control to add elements to the output
 */
Terminal.prototype.addElement = function(element) {
  this.displayElement.insertBefore(element, this.inputElement.parentElement);
};

/**
 * Scroll the output area down to make the input visible
 */
Terminal.prototype.scrollToBottom = function() {
  // We need to see the output of the latest command entered
  // Certain browsers have a bug such that scrollHeight is too small
  // when content does not fill the client area of the element
  var scrollHeight = Math.max(this.displayElement.scrollHeight,
                              this.displayElement.clientHeight);
  this.displayElement.scrollTop =
                      scrollHeight - this.displayElement.clientHeight;
};

exports.Terminal = Terminal;
