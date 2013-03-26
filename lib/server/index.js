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

var main = require('../../gcli');

var Requisition = main.require('gcli/cli').Requisition;
var converters = main.require('gcli/converters');
var Status = main.require('gcli/types').Status;

var jsdom = require('jsdom').jsdom;
var document = jsdom('<html><head></head><body></body></html>');
var environment = {
  document: document,
  window: document.defaultView
};
var requisition = new Requisition(environment, document);

/**
 * Utility to call requisition.update and requisition.exec properly, returning
 * a promise of a string formatted for output (even if the command returned
 * a DOM structure)
 */
exports.exec = function(command) {
  return requisition.update(command).then(function() {
    if (requisition.getStatus() !== Status.VALID) {
      throw new Error('Invalid command "' + command + "'");
    }
    else {
      var output = requisition.exec();

      function convert() {
        var context = requisition.context;
        return converters.convert(output.data, output.type, 'string', context);
      }

      return output.then(function() { return convert(); },
                         function() { throw convert(); });
    }
  });
};
