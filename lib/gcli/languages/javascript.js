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

var RESOLVED = promise.resolve(true);

exports.items = [
  {
    // Language implementation for Javascript
    item: 'language',
    name: 'javascript',

    constructor: function(terminal, options) {
      this.terminal = terminal;
      this.focusManager = terminal.focusManager;

      this.updateHints();

      return promise.resolve(this);
    },

    destroy: function() {
      this.terminal = undefined;
    },

    handleReturn: function() {
      var input = this.terminal.inputElement.value;

      var output = eval(input);

      var document = this.terminal.document;
      var rowoutEle = document.createElement('div');
      rowoutEle.classList.add('gcli-row-out');
      rowoutEle.classList.add('gcli-row-script');
      rowoutEle.setAttribute('aria-live', 'assertive');

      var line = input + ' // ' + output;
      rowoutEle.appendChild(document.createTextNode(line));

      this.terminal.addElement(rowoutEle);
      this.terminal.scrollToBottom();

      this.focusManager.outputted();

      this.terminal.unsetChoice();
      this.terminal.inputElement.value = '';

      return RESOLVED;
    }
  }
];
