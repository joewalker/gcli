/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var domtemplate = require('gcli/ui/domtemplate');

var completerHtml = require('text!gcli/ui/completer.html');

/**
 * Completer is an 'input-like' element that sits  an input element annotating
 * it with visual goodness.
 * @param options Object containing user customization properties, including:
 * - completionPrompt The prompt - defaults to '\u00bb' (double greater-than,
 *   a.k.a right guillemet). The prompt is used directly in a TextNode, so HTML
 *   entities are not allowed.
 * - scratchpad A way to move JS content to custom JS editor
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition: A GCLI Requisition object whose state is monitored
 * - element: Element to use as root
 * - inputter: Link to instance of Inputter
 */
function Completer(options, components) {
  this.requisition = components.requisition;
  this.scratchpad = options.scratchpad;
  this.inputter = components.inputter;
  this.input = { typed: '', cursor: { start: 0, end: 0 } };
  this.choice = 0;

  this.element = components.element;
  this.element.classList.add('gcli-in-complete');
  this.element.classList.add('gcli-in-valid');
  this.element.setAttribute('tabindex', '-1');
  this.element.setAttribute('aria-live', 'polite');

  this.document = this.element.ownerDocument;

  this.completionPrompt = options.completionPrompt || '\u00bb';

  this.inputter.onInputChange.add(this.update, this);
  this.inputter.onAssignmentChange.add(this.update, this);
  this.inputter.onChoiceChange.add(this.update, this);

  this.template = util.toDom(this.document, completerHtml);
  // We want the spans to line up without the spaces in the template
  util.removeWhitespace(this.template, true);

  this.update();
}

/**
 * Avoid memory leaks
 */
Completer.prototype.destroy = function() {
  this.inputter.onInputChange.remove(this.update, this);
  this.inputter.onAssignmentChange.remove(this.update, this);
  this.inputter.onChoiceChange.remove(this.update, this);

  delete this.document;
  delete this.element;
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
Completer.prototype.decorate = function(backgroundElement) {
  this.inputter.appendAfter(this.element);

  var inputEle = this.inputter.element;
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
  this.element.style.backgroundColor = (backgroundElement != this.element) ?
      'transparent' :
      inputEle.style.backgroundColor;
  inputEle.style.backgroundColor = 'transparent';

  // Make room for the prompt
  inputEle.style.paddingLeft = '20px';

  this.resizer = this.resizer.bind(this);
  this.document.defaultView.addEventListener('resize', this.resizer, false);
  this.resizer();
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
  var height = rect.bottom - rect.top - 2;

  this.element.style.top = (rect.top + 1) + 'px';
  this.element.style.height = (height + 1) + 'px';
  this.element.style.lineHeight = (height + 1) + 'px';
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
Completer.prototype.update = function(ev) {
  if (ev && ev.choice != null) {
    this.choice = ev.choice;
  }
  this.input = this.inputter.getInputState();

  var template = this.template.cloneNode(true);
  domtemplate.template(template, this, { stack: 'completer.html' });

  util.clearElement(this.element);
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
    if (this.input.typed.length === 0) {
      return '';
    }

    var current = this.inputter.assignment;
    var prediction = current.conversion.getPredictionAt(this.choice);
    if (!prediction) {
      return '';
    }
    var tabText = prediction.name;

    var existing = current.arg.text;

    if (existing === tabText) {
      return '';
    }

    if (isStrictCompletion(existing, tabText) &&
            this.input.cursor.start === this.input.typed.length) {
      // Display the suffix of the prediction as the completion
      var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;
      return tabText.slice(existing.length - numLeadingSpaces);
    }

    // Display the '-> prediction' at the end of the completer element
    return ' \u00a0\u21E5 ' + tabText; // aka &nbsp;&rarr; the right arrow
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
    var command = this.requisition.commandAssignment.value;
    return command && command.name === '{' ? this.scratchpad.linkText : null;
  }
});

/**
 * Is the entered command a JS command with no closing '}'?
 * TWEAK: This code should be considered for promotion to Requisition
 */
Object.defineProperty(Completer.prototype, 'unclosedJs', {
  get: function() {
    var command = this.requisition.commandAssignment.value;
    var jsCommand = command && command.name === '{';
    var unclosedJs = jsCommand &&
        this.requisition.getAssignment(0).arg.suffix.indexOf('}') === -1;
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
      var isCurrent = (this.inputter.assignment === assignment);
      if (!isCurrent && assignment.arg.text === '') {
        params.push(assignment.param);
      }
    }.bind(this));
    return params;
  }
});

exports.Completer = Completer;


});
