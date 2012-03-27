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
 * - scratchpad (default=none) A way to move JS content to custom JS editor
 * @param components Object that links to other UI components. GCLI provided:
 * - requisition: A GCLI Requisition object whose state is monitored
 * - element: Element to use as root
 * - autoResize: (default=false): Should we attempt to sync the dimensions of
 *   the complete element with the input element.
 */
function Completer(options, components) {
  this.requisition = components.requisition;
  this.scratchpad = options.scratchpad;
  this.input = { typed: '', cursor: { start: 0, end: 0 } };
  this.choice = 0;

  this.element = components.element;
  this.element.classList.add('gcli-in-complete');
  this.element.setAttribute('tabindex', '-1');
  this.element.setAttribute('aria-live', 'polite');

  this.document = this.element.ownerDocument;

  this.inputter = components.inputter;

  this.inputter.onInputChange.add(this.update, this);
  this.inputter.onAssignmentChange.add(this.update, this);
  this.inputter.onChoiceChange.add(this.update, this);

  if (components.autoResize) {
    this.inputter.onResize.add(this.resized, this);

    var dimensions = this.inputter.getDimensions();
    if (dimensions) {
      this.resized(dimensions);
    }
  }

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
  this.inputter.onResize.remove(this.resized, this);

  delete this.document;
  delete this.element;
  delete this.template;
  delete this.inputter;
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Completer.prototype.resized = function(ev) {
  this.element.style.top = ev.top + 'px';
  this.element.style.height = ev.height + 'px';
  this.element.style.lineHeight = ev.height + 'px';
  this.element.style.left = ev.left + 'px';
  this.element.style.width = ev.width + 'px';
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
  this._preTemplateUpdate();

  var template = this.template.cloneNode(true);
  domtemplate.template(template, this, { stack: 'completer.html' });

  util.clearElement(this.element);
  while (template.hasChildNodes()) {
    this.element.appendChild(template.firstChild);
  }
};

/**
 * Update the state of a number of internal variables in preparation for
 * templating. Some of these properties are interdependent, so it makes sense
 * to do them in one go.
 */
Completer.prototype._preTemplateUpdate = function() {
  this.input = this.inputter.getInputState();

  // What text should we display as the tab text, and should it be given as a
  // '-> full' or as 'suffix' (which depends on if the completion is a strict
  // completion or not)
  if (this.input.typed.trim().length === 0) {
    this.directTabText = '';
    this.arrowTabText = '';
  }
  else {
    var current = this.inputter.assignment;
    var prediction = current.conversion.getPredictionAt(this.choice);
    if (!prediction) {
      this.directTabText = '';
      this.arrowTabText = '';
    }
    else {
      var tabText = prediction.name;

      var existing = current.arg.text;

      if (existing === tabText) {
        this.directTabText = '';
        this.arrowTabText = '';
      }
      else {
        if (isStrictCompletion(existing, tabText) &&
                this.input.cursor.start === this.input.typed.length) {
          // Display the suffix of the prediction as the completion
          var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;
          this.directTabText = tabText.slice(existing.length - numLeadingSpaces);
          this.arrowTabText = '';
        }
        else {
          this.directTabText = '';

          // Display the '-> prediction' at the end of the completer element
          // These JS escapes are aka &nbsp;&rarr; the right arrow
          this.arrowTabText = ' \u00a0\u21E5 ' + tabText;
        }
      }
    }
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
    var typedEndSpace = this.requisition.typedEndsWithWhitespace();
    // Cache computed property
    var directTabText = this.directTabText;
    // If this is the first blank assignment we might not need a space prefix
    // also we skip [param] text if we have directTabText, but only for the
    // first blank param.
    var firstBlankParam = true;
    var params = [];
    this.requisition.getAssignments().forEach(function(assignment) {
      if (!assignment.param.isPositionalAllowed) {
        return;
      }

      if (!assignment.arg.isBlank()) {
        if (directTabText !== '') {
          firstBlankParam = false;
        }
        return;
      }

      if (directTabText !== '' && firstBlankParam) {
        firstBlankParam = false;
        return;
      }

      var text = (assignment.param.isDataRequired) ?
          '<' + assignment.param.name + '>' :
          '[' + assignment.param.name + ']';

      // Add a space if we don't have one at the end of the input or if
      // this isn't the first param we've mentioned
      if (!typedEndSpace || !firstBlankParam) {
        text = ' ' + text;
      }

      firstBlankParam = false;
      params.push(text);
    }.bind(this));
    return params;
  }
});

exports.Completer = Completer;


});
