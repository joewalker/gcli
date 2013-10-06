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

var util = require('../util/util');
var promise = require('../util/promise');
var domtemplate = require('../util/domtemplate');

var fields = require('../ui/fields');

var RESOLVED = promise.resolve(true);

/**
 * JavascriptLanguage (like other language implementations) drives a Terminal to
 * allow input and show the results of the input. Each Control class represents
 * a language. JavascriptLanguage supports GCLI commands.
 */
function JavascriptLanguage(options) {
  this.terminal = options.terminal;
  this.focusManager = options.focusManager;
  this.outputViewTemplate = options.outputViewTemplate;

  this.updateHints();
}

/**
 * Avoid memory leaks
 */
JavascriptLanguage.prototype.destroy = function() {

  this.terminal = undefined;
  this.requisition = undefined;
};

/**
 *
 */
JavascriptLanguage.prototype.updateHints = function() {
  /*
  if (this.terminal.field) {
    this.terminal.field.onFieldChange.remove(this.terminal.fieldChanged, this.terminal);
    this.terminal.field.destroy();
  }

  this.terminal.field = fields.getField('blank', {
    document: this.terminal.document,
    name: 'none',
    required: false,
    named: false,
    tooltip: true
  });

  this.focusManager.setImportantFieldFlag(false);

  // this.terminal.field.onFieldChange.add(this.terminal.fieldChanged, this.terminal);
  // this.terminal.field.setConversion(this.assignment.conversion);

  // Filled in by the template process
  this.terminal.errorEle = undefined;
  this.terminal.descriptionEle = undefined;

  var contents = this.terminal.tooltipTemplate.cloneNode(true);
  domtemplate.template(contents, this.terminal, {
    blankNullUndefined: true,
    stack: 'terminal.html#tooltip'
  });
  */

  util.clearElement(this.terminal.tooltipElement);
  //this.terminal.tooltipElement.appendChild(contents);
  this.terminal.tooltipElement.style.display = 'none';

  this.terminal.field.setMessageElement('');
};

/**
 * The description (displayed at the top of the hint area) should be blank if
 * we're entering the CommandAssignment (because it's obvious) otherwise it's
 * the parameter description.
 */
Object.defineProperty(JavascriptLanguage.prototype, 'description', {
  value: '',
  enumerable: true
});

/**
 * Present an error message to the hint popup
 */
Object.defineProperty(JavascriptLanguage.prototype, 'message', {
  value: '',
  enumerable: true
});

/**
 * To be called internally whenever we think that the current assignment might
 * have changed, typically on mouse-clicks or key presses.
 * @param start The cursor position to use in working out the current
 * assignment. This is needed because setting the element selection start is
 * only recognised when the event loop has finished
 */
JavascriptLanguage.prototype.caretMoved = function(start) {
};

/**
 * See also handleDownArrow for some symmetry
 */
JavascriptLanguage.prototype.handleUpArrow = function() {
  return promise.resolve(false);
};

/**
 * See also handleUpArrow for some symmetry
 */
JavascriptLanguage.prototype.handleDownArrow = function() {
  return promise.resolve(false);
};

/**
 * RETURN checks status and might exec
 */
JavascriptLanguage.prototype.handleReturn = function() {
  var input = this.terminal.inputElement.value;

  var template = this.outputViewTemplate.cloneNode(true);
  var templateOptions = { stack: 'terminal.html#outputView' };

  var data = {
    onclick: function() {},
    ondblclick: function() {},
    language: this,
    output: { typed: input },
    prompt: '\u00bb',
    promptClass: '',
    // Elements attached to this by template().
    rowinEle: null,
    rowoutEle: null,
    durationEle: null,
    throbEle: null,
    promptEle: null
  };

  domtemplate.template(template, data, templateOptions);

  var output = eval(input);

  var document = data.rowoutEle.ownerDocument;
  var duration = '';
  data.durationEle.appendChild(document.createTextNode(duration));
  data.promptEle.classList.add('gcli-row-complete');

  util.clearElement(data.rowoutEle);

  var node = document.createTextNode('' + output);
  data.rowoutEle.appendChild(node);

  this.terminal.scrollToBottom();
  data.throbEle.style.display = 'none';

  this.terminal.addElement(data.rowinEle);
  this.terminal.addElement(data.rowoutEle);
  this.terminal.scrollToBottom();

  this.focusManager.outputted();

  this.terminal.unsetChoice();
  this.terminal.inputElement.value = '';

  return RESOLVED;
};

/**
 * Warning: We get TAB events for more than just the user pressing TAB in our
 * input element.
 */
JavascriptLanguage.prototype.handleTab = function() {
  this.terminal.unsetChoice();
  return RESOLVED;
};

/**
 * The input test has changed in some way.
 */
JavascriptLanguage.prototype.handleInput = function(value) {
  this.terminal.unsetChoice();
  return RESOLVED;
};

/**
 * Counterpart to |setInput| for moving the cursor.
 * @param cursor A JS object shaped like { start: x, end: y }
 */
JavascriptLanguage.prototype.setCursor = function(cursor) {
  this.terminal.inputElement.selectionStart = cursor.start;
  this.terminal.inputElement.selectionEnd = cursor.end;
};

/**
 * Calculate the properties required by the template process for completer.html
 */
JavascriptLanguage.prototype.getCompleterTemplateData = function() {
  return promise.resolve({
    statusMarkup: [
      {
        string: this.terminal.inputElement.value.replace(/ /g, '\u00a0'), // i.e. &nbsp;
        className: 'gcli-in-valid'
      }
    ],
    unclosedJs: false,
    directTabText: '',
    arrowTabText: '',
    emptyParameters: ''
  });
};

/**
 * Called by the onFieldChange event (via the terminal) on the current Field
 */
JavascriptLanguage.prototype.fieldChanged = function(ev) {
  // TODO: didn't we cause this in updateHints
};

/**
 * Show a short introduction to this language
 */
JavascriptLanguage.prototype.showIntro = function() {
  // TODO: ...
};

JavascriptLanguage.prototype.item = 'language';

JavascriptLanguage.shortname = 'javascript';

exports.JavascriptLanguage = JavascriptLanguage;
exports.items = [ JavascriptLanguage ];
