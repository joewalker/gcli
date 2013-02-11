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

var Promise = require('util/promise');
var util = require('util/util');
var domtemplate = require('util/domtemplate');

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

  this.autoResize = components.autoResize;
  if (this.autoResize) {
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

  if (this.autoResize) {
    this.inputter.onResize.remove(this.resized, this);
  }

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
 * Bring the completion element up to date with what the requisition says
 */
Completer.prototype.update = function(ev) {
  this.choice = (ev && ev.choice != null) ? ev.choice : 0;

  var data = this._getCompleterTemplateData();
  var template = this.template.cloneNode(true);
  domtemplate.template(template, data, { stack: 'completer.html' });

  util.clearElement(this.element);
  while (template.hasChildNodes()) {
    this.element.appendChild(template.firstChild);
  }
};

/**
 * Calculate the properties required by the template process for completer.html
 */
Completer.prototype._getCompleterTemplateData = function() {
  // Some of the data created by this function can be calculated synchronously
  // but other parts depend on predictions which are asynchronous.
  var promisedDirectTabText = Promise.defer();
  var promisedArrowTabText = Promise.defer();
  var promisedEmptyParameters = Promise.defer();

  var input = this.inputter.getInputState();
  var current = this.requisition.getAssignmentAt(input.cursor.start);
  var predictionPromise = undefined;

  if (input.typed.trim().length !== 0) {
    predictionPromise = current.getPredictionAt(this.choice);
  }

  Promise.resolve(predictionPromise).then(function(prediction) {
    // directTabText is for when the current input is a prefix of the completion
    // arrowTabText is for when we need to use an -> to show what will be used
    var directTabText = '';
    var arrowTabText = '';
    var emptyParameters = [];

    if (input.typed.trim().length !== 0) {
      var cArg = current.arg;

      if (prediction) {
        var tabText = prediction.name;
        var existing = cArg.text;

        // Normally the cursor being just before whitespace means that you are
        // 'in' the previous argument, which means that the prediction is based
        // on that argument, however NamedArguments break this by having 2 parts
        // so we need to prepend the tabText with a space for NamedArguments,
        // but only when there isn't already a space at the end of the prefix
        // (i.e. ' --name' not ' --name ')
        if (current.isInName()) {
          tabText = ' ' + tabText;
        }

        if (existing !== tabText) {
          // Decide to use directTabText or arrowTabText
          // Strip any leading whitespace from the user inputted value because
          // the tabText will never have leading whitespace.
          var inputValue = existing.replace(/^\s*/, '');
          var isStrictCompletion = tabText.indexOf(inputValue) === 0;
          if (isStrictCompletion && input.cursor.start === input.typed.length) {
            // Display the suffix of the prediction as the completion
            var numLeadingSpaces = existing.match(/^(\s*)/)[0].length;

            directTabText = tabText.slice(existing.length - numLeadingSpaces);
          }
          else {
            // Display the '-> prediction' at the end of the completer element
            // \u21E5 is the JS escape right arrow
            arrowTabText = '\u21E5 ' + tabText;
          }
        }
      }
      else {
        // There's no prediction, but if this is a named argument that needs a
        // value (that is without any) then we need to show that one is needed
        // For example 'git commit --message ', clearly needs some more text
        if (cArg.type === 'NamedArgument' && cArg.text === '') {
          emptyParameters.push('<' + current.param.type.name + '>\u00a0');
        }
      }
    }

    // Add a space between the typed text (+ directTabText) and the hints,
    // making sure we don't add 2 sets of padding
    if (directTabText !== '') {
      directTabText += '\u00a0';
    }
    else if (!this.requisition.typedEndsWithSeparator()) {
      emptyParameters.unshift('\u00a0');
    }

    // Calculate the list of parameters to be filled in
    // We generate an array of emptyParameter markers for each positional
    // parameter to the current command.
    // Generally each emptyParameter marker begins with a space to separate it
    // from whatever came before, unless what comes before ends in a space.

    this.requisition.getAssignments().forEach(function(assignment) {
      // Named arguments are handled with a group [options] marker
      if (!assignment.param.isPositionalAllowed) {
        return;
      }

      // No hints if we've got content for this parameter
      if (assignment.arg.toString().trim() !== '') {
        return;
      }

      if (directTabText !== '' && current === assignment) {
        return;
      }

      var text = (assignment.param.isDataRequired) ?
          '<' + assignment.param.name + '>\u00a0' :
          '[' + assignment.param.name + ']\u00a0';

      emptyParameters.push(text);
    }.bind(this));

    var command = this.requisition.commandAssignment.value;
    var addOptionsMarker = false;

    // We add an '[options]' marker when there are named parameters that are
    // not filled in and not hidden, and we don't have any directTabText
    if (command && command.hasNamedParameters) {
      command.params.forEach(function(param) {
        var arg = this.requisition.getAssignment(param.name).arg;
        if (!param.isPositionalAllowed && !param.hidden
                && arg.type === "BlankArgument") {
          addOptionsMarker = true;
        }
      }, this);
    }

    if (addOptionsMarker) {
      // Add an nbsp if we don't have one at the end of the input or if
      // this isn't the first param we've mentioned
      emptyParameters.push('[options]\u00a0');
    }

    promisedDirectTabText.resolve(directTabText);
    promisedArrowTabText.resolve(arrowTabText);
    promisedEmptyParameters.resolve(emptyParameters);
  }.bind(this), console.error);

  return {
    statusMarkup: this._getStatusMarkup(input),
    unclosedJs: this._getUnclosedJs(),
    scratchLink: this._getScratchLink(),
    directTabText: promisedDirectTabText.promise,
    arrowTabText: promisedArrowTabText.promise,
    emptyParameters: promisedEmptyParameters.promise
  };
};

/**
 * Calculate the statusMarkup required to show wavy lines underneath the input
 * text (like that of an inline spell-checker) which used by the template
 * process for completer.html
 */
Completer.prototype._getStatusMarkup = function(input) {
  // statusMarkup is wrapper around requisition.getInputStatusMarkup converting
  // space to &nbsp; in the string member (for HTML display) and status to an
  // appropriate class name (i.e. lower cased, prefixed with gcli-in-)
  var statusMarkup = this.requisition.getInputStatusMarkup(input.cursor.start);

  statusMarkup.forEach(function(member) {
    member.string = member.string.replace(/ /g, '\u00a0'); // i.e. &nbsp;
    member.className = 'gcli-in-' + member.status.toString().toLowerCase();
  }, this);

  return statusMarkup;
};

/**
 * Is the entered command a JS command with no closing '}'?
 */
Completer.prototype._getUnclosedJs = function() {
  // TWEAK: This code should be considered for promotion to Requisition
  var command = this.requisition.commandAssignment.value;
  return command && command.name === '{' &&
      this.requisition.getAssignment(0).arg.suffix.indexOf('}') === -1;
};

/**
 * The text for the 'jump to scratchpad' feature, or '' if it is disabled
 */
Completer.prototype._getScratchLink = function() {
  var command = this.requisition.commandAssignment.value;
  return this.scratchpad && command && command.name === '{' ?
      this.scratchpad.linkText :
      '';
};

exports.Completer = Completer;


});
