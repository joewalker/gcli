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

var KeyEvent = require('../../util/util').KeyEvent;

/**
 * See notes in helpers.checkOptions()
 */
exports.createRequisitionAutomator = function(requisition) {
  var cursor = { start: 0, end: 0 };
  var typed = '';
  var index = 0;

  var textChanged = function() {
    typed = requisition.toString();
    updateCursor();
  };

  requisition.onTextChange.add(textChanged);

  var updateCursor = function() {
    cursor.start = typed.length;
    cursor.end = typed.length;
  };

  var automator = {
    setInput: function(t) {
      typed = t;
      updateCursor();
      return requisition.update(t);
    },

    setCursor: function(c) {
      cursor.start = c.start;
      cursor.end = c.end;
    },

    focus: function() {
    },

    getInputState: function() {
      var typed = requisition.toString();
      return {
        typed: typed,
        cursor: { start: cursor.start, end: cursor.end }
      };
    },

    getErrorMessage: function() {
      return requisition.getStatusMessage();
    },

    getCompleterTemplateData: function() {
      // See also language/command:getCompleterTemplateData
      return requisition.getStateData(cursor.start, index);
    },

    fakeKey: function(keyCode) {
      if (keyCode === KeyEvent.DOM_VK_BACK_SPACE) {
        typed = typed.slice(0, -1);
      }
      if (keyCode === KeyEvent.DOM_VK_TAB) {
        return requisition.complete(cursor, index).then(function(updated) {
          // Abort UI changes if this UI update has been overtaken
          if (updated) {
            index = 0;
          }
        });
      }
      if (keyCode === KeyEvent.DOM_VK_UP) {
        index++;
      }
      if (keyCode === KeyEvent.DOM_VK_DOWN) {
        index--;
      }
      if (keyCode === KeyEvent.DOM_VK_RETURN) {
        throw new Error('Fake DOM_VK_RETURN not supported');
      }
      updateCursor();
    },

    destroy: function() {
      requisition.onTextChange.remove(textChanged);
    }
  };

  Object.defineProperty(automator, 'focusManager', {
    get: function() { return null; },
    enumerable: true
  });

  Object.defineProperty(automator, 'field', {
    get: function() { return null; },
    enumerable: true
  });

  return automator;
};
