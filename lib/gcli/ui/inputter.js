/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var cliView = exports;


var console = require('gcli/util').console;
var event = require('gcli/util').event;
var dom = require('gcli/util').dom;
var KeyEvent = event.KeyEvent;

var Status = require('gcli/types').Status;
var History = require('gcli/history').History;

var inputterCss = require('text!gcli/ui/inputter.css');


/**
 * We only want to import inputterCss once so this tracks whether or not we have
 * done it. Note technically it's only once per document, so perhaps we should
 * have a list of documents into which we've imported the CSS?
 */
var inputterCssImported = false;

/**
 * A wrapper to take care of the functions concerning an input element
 */
function Inputter(options) {
  if (!inputterCssImported && !options.preStyled) {
    dom.importCssString(inputterCss, this.doc);
    inputterCssImported = true;
  }

  this.requ = options.requisition;

  // Suss out where the input element is
  this.element = options.inputElement || 'gcliInput';
  if (typeof this.element === 'string') {
    this.doc = options.document || document;
    var name = this.element;
    this.element = this.doc.getElementById(name);
    if (!this.element) {
      throw new Error('No element with id=' + name + '.');
    }
  }
  else {
    // Assume we've been passed in the correct node
    this.doc = this.element.ownerDocument;
  }

  this.element.spellcheck = false;

  // Used to distinguish focus from TAB in CLI. See onKeyUp()
  this.lastTabDownAt = 0;

  // Ensure that TAB/UP/DOWN isn't handled by the browser
  event.addCommandKeyListener(this.element, this.onCommandKey.bind(this));
  event.addListener(this.element, 'keyup', this.onKeyUp.bind(this));

  // Use our document if no other is supplied
  options.document = options.document || this.doc;

  if (options.completer == null) {
    options.completer = new Completer(options);
  }
  else if (typeof options.completer === 'function') {
    options.completer = new options.completer(options);
  }
  this.completer = options.completer;
  this.completer.decorate(this);

  // Use the provided history object, or instantiate our own.
  this.history = options.history = options.history || new History(options);
  this._scrollingThroughHistory = false;

  // cursor position affects hint severity.
  event.addListener(this.element, 'mouseup', function(ev) {
    this.completer.update();
  }.bind(this));

  this.requ.inputChange.add(this.onInputChange, this);
}

/**
 * Handler for the Requisition.inputChange event
 */
Inputter.prototype.onInputChange = function() {
  var start = dom.getSelectionStart(this.element);
  var end = dom.getSelectionEnd(this.element);

  this.element.value = this.requ.toString();

  dom.setSelectionStart(this.element, start);
  dom.setSelectionEnd(this.element, end);

  this.completer.update();
};

/**
 * When the input element gets/loses focus make sure we tell the popup so it
 * can show/hide accordingly.
 */
Inputter.prototype.sendFocusEventsToPopup = function(popup) {
  event.addListener(this.element, 'focus', popup.showOutput);
  event.addListener(this.element, 'blur', popup.hideOutput);
};

/**
 * Focus the input element
 */
Inputter.prototype.focus = function() {
  this.element.focus();
};

/**
 * Utility to add an element into the DOM after the input element.
 */
Inputter.prototype.appendAfter = function(element) {
  this.element.parentNode.insertBefore(element, this.element.nextSibling);
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Inputter.prototype.onCommandKey = function(ev, hashId, keyCode) {
  if (keyCode === KeyEvent.DOM_VK_UP || keyCode === KeyEvent.DOM_VK_DOWN) {
    event.stopEvent(ev);
  }
  if (keyCode === KeyEvent.DOM_VK_TAB) {
    this.lastTabDownAt = 0;
    if (!ev.shiftKey) {
      event.stopEvent(ev);
      // Record the timestamp of this TAB down so onKeyUp can distinguish
      // focus from TAB in the CLI.
      this.lastTabDownAt = ev.timeStamp;
    }
    if (ev.metaKey || ev.altKey || ev.crtlKey) {
      if (this.doc.commandDispatcher) {
        this.doc.commandDispatcher.advanceFocus();
      }
      else {
        this.element.blur();
      }
    }
  }
};

/**
 * Just set the input field to a value without executing anything
 */
Inputter.prototype.setInput = function(str) {
  this.element.value = str;
  this.update();
};

/**
 * The main keyboard processing loop
 */
Inputter.prototype.onKeyUp = function(ev) {
  // RETURN does a special exec/highlight thing
  if (ev.keyCode === KeyEvent.DOM_VK_RETURN) {
    var worst = this.requ.getStatus();
    // Deny RETURN unless the command might work
    if (worst === Status.VALID) {
      this._scrollingThroughHistory = false;
      this.history.add(this.element.value);
      this.requ.exec();
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
      var cursorPos = dom.getSelectionStart(this.element);

      this.getCurrentAssignment().complete();

      // We need to move the cursor to the end of the complete parameter
      // There could be a fancy way to do this involving assignment/arg math
      // but it doesn't seem easy, so we cheat a move the cursor to just before
      // the next space, or the end of the input
      var typed = this.element.value;
      do {
        cursorPos++;
      }
      while (typed[cursorPos - 1] !== ' ' && cursorPos < typed.length)

      dom.setSelectionStart(this.element, cursorPos);
      dom.setSelectionEnd(this.element, cursorPos);
      this.completer.update();
    }
    this.lastTabDownAt = 0;
    this._scrollingThroughHistory = false;
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_UP) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.element.value = this.history.backward();
      this.update();
      dom.setSelectionStart(this.element, 0);
      dom.setSelectionEnd(this.element, this.element.value.length);
    }
    else {
      var index = dom.getSelectionStart(this.element);
      this.getCurrentAssignment().increment();
      dom.setSelectionStart(this.element, index);
      dom.setSelectionEnd(this.element, index);
    }
    return;
  }

  if (ev.keyCode === KeyEvent.DOM_VK_DOWN) {
    if (this.element.value === '' || this._scrollingThroughHistory) {
      this._scrollingThroughHistory = true;
      this.element.value = this.history.forward();
      this.update();
      dom.setSelectionStart(this.element, 0);
      dom.setSelectionEnd(this.element, this.element.value.length);
    }
    else {
      var index = dom.getSelectionStart(this.element);
      this.getCurrentAssignment().decrement();
      dom.setSelectionStart(this.element, index);
      dom.setSelectionEnd(this.element, index);
    }
    return;
  }

  this._scrollingThroughHistory = false;
  this.update();
};

/**
 * Accessor for the assignment at the cursor.
 * i.e Requisition.getAssignmentAt(cursorPos);
 */
Inputter.prototype.getCurrentAssignment = function() {
  var start = dom.getSelectionStart(this.element);
  return this.requ.getAssignmentAt(start);
};

/**
 * Actually parse the input and make sure we're all up to date
 */
Inputter.prototype.update = function() {
  this.updateCli();
  this.completer.update();
};

/**
 * Update the requisition with the contents of the input element
 */
Inputter.prototype.updateCli = function() {
  var input = {
    typed: this.element.value,
    cursor: {
      start: dom.getSelectionStart(this.element),
      end: dom.getSelectionEnd(this.element)
    }
  };

  // Workaround for a XUL bug where textbox lies about its content
  if (input.typed == null || (input.typed.length < input.cursor.start)) {
    if (this.doc.getAnonymousElementByAttribute) {
      if (!this.anonInput) {
        this.anonInput = this.doc.getAnonymousElementByAttribute(
                this.element, "anonid", "input");
        var compare = this.doc.getAnonymousElementByAttribute(
                this.element, "anonid", "input");
        console.log('test: ', this.anonInput === compare);
      }
      if (this.anonInput) {
        input.typed = this.anonInput.value;
        console.log('anonid fudge: this.requ.update=', input);
      }
      else {
        throw new Error('textbox reports that the cursor lies outside the' +
                ' text that it contains, and our workaround has failed.');
      }
    }
  }

  this.requ.update(input);
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
 * - completionPrompt (optional) The prompt to show before a completion. Defaults to '>'.
 */
function Completer(options) {
  this.doc = options.document;
  this.requ = options.requisition;
  this.elementCreated = false;

  this.element = options.completeElement || 'gcliComplete';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.doc.getElementById(name);

    if (!this.element) {
      this.elementCreated = true;
      this.element = dom.createElement('div', null, this.doc);
      this.element.className = 'gcliCompletion gcliVALID';
      this.element.setAttribute('tabindex', '-1');
      this.element.setAttribute('aria-live', 'polite');
    }
  }

  this.completionPrompt = typeof options.completionPrompt === 'string'
    ? options.completionPrompt
    : '&#x00BB;';

  if (options.inputBackgroundElement) {
    this.backgroundElement = options.inputBackgroundElement;
  }
  else {
    this.backgroundElement = this.element;
  }
}

/**
 * A list of the styles that decorate() should copy to make the completion
 * element look like the input element. backgroundColor is a spiritual part of
 * this list, but see comment in decorate().
 */
Completer.copyStyles = [
  'color', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle'
];

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Completer.prototype.decorate = function(inputter) {
  this.inputter = inputter;
  this.input = inputter.element;

  // If we were told which element to use, then assume it is already
  // correctly positioned. Otherwise insert it alongside the input element
  if (this.elementCreated) {
    this.inputter.appendAfter(this.element);

    Completer.copyStyles.forEach(function(style) {
      this.element.style[style] = dom.computedStyle(this.input, style);
    }, this);

    // If there is a separate backgroundElement, then we make the element
    // transparent, otherwise it inherits the color of the input node
    // It's not clear why backgroundColor doesn't work when used from
    // computedStyle, but it doesn't. Patches welcome!
    this.element.style.backgroundColor = (this.backgroundElement != this.element) ?
        'transparent' :
        this.input.style.backgroundColor;
    this.input.style.backgroundColor = 'transparent';

    // Make room for the prompt
    this.input.style.paddingLeft = '20px';

    var resizer = this.resizer.bind(this);
    event.addListener(this.doc.defaultView, 'resize', resizer);
    resizer();
  }
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Completer.prototype.resizer = function() {
  var rect = this.input.getBoundingClientRect();
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
Completer.prototype.update = function() {
  var typed = this.input.value;
  var start = dom.getSelectionStart(this.input);
  var current = this.requ.getAssignmentAt(start);
  var predictions = current.getPredictions();

  var completion = '<span class="gcliPrompt">' + this.completionPrompt + '</span> ';
  if (typed.length > 0) {
    var scores = this.requ.getInputStatusMarkup();
    completion += this.markupStatusScore(scores);
  }

  if (typed.length > 0 && predictions.length > 0) {
    var tab = predictions[0].name;
    tab = (typeof tab === 'string') ? tab : tab.name;
    var existing = current.getArg().text;
    if (isStrictCompletion(existing, tab) && start === typed.length) {
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

  dom.setInnerHtml(this.element, '<span>' + completion + '</span>');
};

/**
 * Mark-up an array of Status values with spans
 */
Completer.prototype.markupStatusScore = function(scores) {
  var completion = '';
  // Create mark-up
  var i = 0;
  var lastStatus = -1;
  while (true) {
    if (lastStatus !== scores[i]) {
      completion += '<span class="gcli' + scores[i].toString() + '">';
      lastStatus = scores[i];
    }
    var char = this.input.value[i];
    if (char === ' ') {
      char = '&nbsp;';
    }
    completion += char;
    i++;
    if (i === this.input.value.length) {
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
