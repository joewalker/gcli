/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var dom = require('gcli/util').dom;
var domtemplate = require('gcli/ui/domtemplate');

var completerHtml = require('text!gcli/ui/completer.html');

/**
 * Completer is an 'input-like' element that sits  an input element annotating
 * it with visual goodness.
 * @param {object} options An object that contains various options which
 * customizes how the completer functions.
 * Properties on the options object:
 * - document (required) DOM document to be used in creating elements
 * - requisition (required) A GCLI Requisition object whose state is monitored
 * - completeElement (optional) An element to use
 * - completionPrompt (optional) The prompt - defaults to '\u00bb'
 *   (double greater-than, a.k.a right guillemet). The prompt is used directly
 *   in a TextNode, so HTML entities are not allowed.
 */
function Completer(options) {
  this.document = options.document || document;
  this.requisition = options.requisition;
  this.elementCreated = false;
  this.scratchpad = options.scratchpad;
  this.input = { typed: '', cursor: { start: 0, end: 0 } };

  this.element = options.completeElement || 'gcli-row-complete';
  if (typeof this.element === 'string') {
    var name = this.element;
    this.element = this.document.getElementById(name);

    if (!this.element) {
      this.elementCreated = true;
      this.element = dom.createElement(this.document, 'div');
      this.element.className = 'gcli-in-complete gcli-in-valid';
      this.element.setAttribute('tabindex', '-1');
      this.element.setAttribute('aria-live', 'polite');
    }
  }

  this.completionPrompt = typeof options.completionPrompt === 'string'
      ? options.completionPrompt
      : '\u00bb';

  if (options.inputBackgroundElement) {
    this.backgroundElement = options.inputBackgroundElement;
  }
  else {
    this.backgroundElement = this.element;
  }

  this.template = dom.createElement(this.document, 'div');
  dom.setInnerHtml(this.template, completerHtml);
  // Replace the temporary div we created with the template root
  this.template = this.template.children[0];
  // We want the spans to line up without the spaces in the template
  dom.removeWhitespace(this.template, true);
}

/**
 * Avoid memory leaks
 */
Completer.prototype.destroy = function() {
  delete this.document;
  delete this.element;
  delete this.backgroundElement;
  delete this.template;

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
  var inputEle = inputter.element;

  // If we were told which element to use, then assume it is already
  // correctly positioned. Otherwise insert it alongside the input element
  if (this.elementCreated) {
    this.inputter.appendAfter(this.element);

    var styles = this.document.defaultView.getComputedStyle(inputEle, null);
    Completer.copyStyles.forEach(function(style) {
      this.element.style[style] = styles[style];
    }, this);

    // The completer text is by default invisible so we make it the same color
    // as the input background.
    this.element.style.color = inputEle.style.backgroundColor;

    // If there is a separate backgroundElement, then we make the element
    // transparent, otherwise it inherits the color of the input node
    // It's not clear why backgroundColor doesn't work when used from
    // computedStyle, but it doesn't. Patches welcome!
    this.element.style.backgroundColor = (this.backgroundElement != this.element) ?
        'transparent' :
        inputEle.style.backgroundColor;
    inputEle.style.backgroundColor = 'transparent';

    // Make room for the prompt
    inputEle.style.paddingLeft = '20px';

    this.resizer = this.resizer.bind(this);
    this.document.defaultView.addEventListener('resize', this.resizer, false);
    this.resizer();
  }
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Completer.prototype.resizer = function() {
  // Remove this when jsdom does getBoundingClientRect(). See Bug 717269
  if (!this.inputter.element.getBoundingClientRect) {
    return;
  }

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
  this.input = input;

  var template = this.template.cloneNode(true);
  domtemplate.template(template, this, { stack: 'completer.html' });

  dom.clearElement(this.element);
  while (template.hasChildNodes()) {
    this.element.appendChild(template.firstChild);
  }
};

/**
 * A proxy to requisition.getInputStatusMarkup which converts space to &nbsp;
 * in the string member (for HTML display) and converts status to an
 * appropriate class name (i.e. lower cased, prefixed with gcli-in-)
 */
Object.defineProperty(Completer.prototype, 'statusMarkup', {
  get: function() {
    var markup = this.requisition.getInputStatusMarkup(this.input.cursor.start);
    markup.forEach(function(member) {
      member.string = member.string.replace(/ /g, '\u00a0'); // i.e. &nbsp;
      member.className = 'gcli-in-' + member.status.toString().toLowerCase();
    }, this);
    return markup;
  }
});

/**
 * What text should we display as the tab text, and should it be given as a
 * '-> full' or as 'suffix' (which depends on if the completion is a strict
 * completion or not)
 */
Object.defineProperty(Completer.prototype, 'tabText', {
  get: function() {
    var current = this.requisition.getAssignmentAt(this.input.cursor.start);
    var predictions = current.getPredictions();

    if (this.input.typed.length === 0 || predictions.length === 0) {
      return '';
    }

    var tab = predictions[0].name;
    var existing = current.getArg().text;

    if (isStrictCompletion(existing, tab) &&
            this.input.cursor.start === this.input.typed.length) {
      // Display the suffix of the prediction as the completion
      var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;
      return tab.slice(existing.length - numLeadingSpaces);
    }

    // Display the '-> prediction' at the end of the completer element
    return ' \u00a0\u21E5 ' + tab; // aka &nbsp;&rarr; the right arrow
  }
});

/**
 * The text for the 'jump to scratchpad' feature, or null if it is disabled
 */
Object.defineProperty(Completer.prototype, 'scratchLink', {
  get: function() {
    if (!this.scratchpad) {
      return null;
    }
    var command = this.requisition.commandAssignment.getValue();
    return command && command.name === '{' ? this.scratchpad.linkText : null;
  }
});

/**
 * Is the entered command a JS command with no closing '}'?
 * TWEAK: This code should be considered for promotion to Requisition
 */
Object.defineProperty(Completer.prototype, 'unclosedJs', {
  get: function() {
    var command = this.requisition.commandAssignment.getValue();
    var jsCommand = command && command.name === '{';
    var unclosedJs = jsCommand &&
        this.requisition.getAssignment(0).getArg().suffix.indexOf('}') === -1;
    return unclosedJs;
  }
});

/**
 * Accessor for the list of parameters to be filled in
 */
Object.defineProperty(Completer.prototype, 'emptyParameters', {
  get: function() {
    var params = [];
    this.requisition.getAssignments().forEach(function(assignment) {
      if (assignment.getValue() == null) {
        params.push(assignment.param);
      }
    });
    return params;
  }
});

exports.Completer = Completer;


});
