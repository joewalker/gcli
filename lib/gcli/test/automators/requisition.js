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
var createRequisitionAutomator = function(requisition) {
  var cursor;
  var automator = {
    getInputState: function() {
      var typed = requisition.toString();
      return {
        typed: typed,
        cursor: { start: typed.length, end: typed.length }
      };
    },

    setCursor: function(cursor) {
    },

    getCompleterTemplateData: function() {
      var start = this.getInputState().cursor.start;
      return requisition.getStateData(start, 0);
    },

    focus: function() {
    },

    getErrorMessage: function() {
      return requisition.getStatusMessage();
    },

    fakeKey: function(keyCode) {
    },

    setInput: function(typed) {
      return requisition.update(typed);
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
