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


var canon = require('gcli/canon');

var examiner = require("test/examiner");

var testCss = require("text!test/commands/test.css");
var testHtml = require('text!test/commands/test.html');


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  canon.addCommand(testCommandSpec);
};

exports.shutdown = function() {
  canon.removeCommand(testCommandSpec);
};

exports.options = {};

/**
 * The 'test' command
 */
var testCommandSpec = {
  name: 'test',
  description: 'Runs the GCLI Unit Tests',
  params: [
    {
      name: 'suite',
      type: {
        name: 'selection',
        lookup: function() {
          return Object.keys(examiner.suites).map(function(name) {
            return { name: name, value: examiner.suites[name] };
          });
        }
      },
      description: 'Test suite to run.',
      defaultValue: null
    }
  ],
  exec: function(args, context) {
    examiner.reset();

    var runner = args.suite ? args.suite : examiner;
    return runner.run(exports.options).then(function() {
      context.update('');
      return context.createView({
        html: testHtml,
        css: testCss,
        cssId: 'gcli-test',
        data: examiner.toRemote(),
        options: { allowEval: true, stack: 'test.html' }
      });
    });
  }
};


});
