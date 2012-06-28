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


/**
 * Prompt is annoying because some systems provide a UI elements (i.e. firefox)
 * while some expect you to overlay them on an input element (i.e. the web)
 * Also we want to provide click -> show menu ability.
 * @param options Object containing user customization properties, including:
 * - promptChar (default='\u00bb') (double greater-than, a.k.a right guillemet)
 *   The prompt is used directly in a TextNode, so no HTML entities.
 * @param components Object that links to other UI components. GCLI provided:
 * - element
 * - inputter
 */
function Prompt(options, components) {
  this.element = components.element;
  this.element.classList.add('gcli-prompt');

  var prompt = options.promptChar || '\u00bb';
  var text = this.element.ownerDocument.createTextNode(prompt);
  this.element.appendChild(text);

  this.inputter = components.inputter;
  if (this.inputter) {
    this.inputter.onResize.add(this.resized, this);

    var dimensions = this.inputter.getDimensions();
    if (dimensions) {
      this.resized(dimensions);
    }
  }
}

/**
 * Avoid memory leaks
 */
Prompt.prototype.destroy = function() {
  if (this.inputter) {
    this.inputter.onResize.remove(this.resized, this);
  }

  delete this.element;
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Prompt.prototype.resized = function(ev) {
  this.element.style.top = ev.top + 'px';
  this.element.style.height = ev.height + 'px';
  this.element.style.left = ev.left + 'px';
  this.element.style.width = ev.width + 'px';
};

exports.Prompt = Prompt;


});
