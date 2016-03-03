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

/**
 * See notes in helpers.checkOptions()
 */
exports.createTerminalAutomator = function(terminal) {
  const automator = {
    setInput: function(typed) {
      return terminal.setInput(typed);
    },

    setCursor: function(cursor) {
      return terminal.language.setCursor(cursor);
    },

    focus: function() {
      return terminal.focus();
    },

    getInputState: function() {
      return terminal.getInputState();
    },

    getErrorMessage: function() {
      return terminal.errorEle.textContent;
    },

    getCompleterTemplateData: function() {
      return terminal.language.getCompleterTemplateData();
    },

    fakeKey: function(keyCode) {
      const fakeEvent = {
        keyCode: keyCode,
        preventDefault: function() { },
        timeStamp: new Date().getTime()
      };

      terminal.onKeyDown(fakeEvent);

      if (keyCode === 8 /*KeyEvent.DOM_VK_BACK_SPACE*/) {
        terminal.inputElement.value = terminal.inputElement.value.slice(0, -1);
      }

      return terminal.handleKeyUp(fakeEvent);
    }
  };

  Object.defineProperty(automator, 'focusManager', {
    get: function() { return terminal.focusManager; },
    enumerable: true
  });

  Object.defineProperty(automator, 'field', {
    get: function() { return terminal.field; },
    enumerable: true
  });

  return automator;
};
