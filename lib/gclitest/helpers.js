/*
 * Copyright 2011, Mozilla Foundation and contributors
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


var test = require('test/assert');

/**
 * Check that we can parse command input.
 * Doesn't execute the command, just checks that we grok the input properly:
 *
 * helpers.status({
 *   // Test inputs
 *   typed: "ech",           // Required
 *   cursor: 3,              // Optional cursor position
 *
 *   // Thing to check
 *   status: "INCOMPLETE",   // One of "VALID", "ERROR", "INCOMPLETE"
 *   emptyParameters: [ "<message>" ], // Still to type
 *   directTabText: "o",     // Simple completion text
 *   arrowTabText: "",       // When the completion is not an extension
 *   markup: "VVVIIIEEE",    // What state should the error markup be in
 * });
 */
exports.status = function(options, tests) {
  var requisition = options.display.requisition;
  var inputter = options.display.inputter;
  var completer = options.display.completer;

  if (tests.typed) {
    inputter.setInput(tests.typed);
  }
  else {
    test.ok(false, "Missing typed for " + JSON.stringify(tests));
    return;
  }

  if (tests.cursor) {
    inputter.setCursor(tests.cursor);
  }

  if (tests.status) {
    test.is(requisition.getStatus().toString(), tests.status,
            "status for " + tests.typed);
  }

  if (tests.emptyParameters != null) {
    var realParams = completer.emptyParameters;
    test.is(realParams.length, tests.emptyParameters.length,
            'emptyParameters.length for \'' + tests.typed + '\'');

    if (realParams.length === tests.emptyParameters.length) {
      for (var i = 0; i < realParams.length; i++) {
        test.is(realParams[i].replace(/\u00a0/g, ' '), tests.emptyParameters[i],
                'emptyParameters[' + i + '] for \'' + tests.typed + '\'');
      }
    }
  }

  if (tests.markup) {
    var cursor = tests.cursor ? tests.cursor.start : tests.typed.length;
    var statusMarkup = requisition.getInputStatusMarkup(cursor);
    var actualMarkup = statusMarkup.map(function(s) {
      return Array(s.string.length + 1).join(s.status.toString()[0]);
    }).join('');
    test.is(tests.markup, actualMarkup, 'markup for ' + tests.typed);
  }

  if (tests.directTabText) {
    test.is(completer.directTabText, tests.directTabText,
            'directTabText for \'' + tests.typed + '\'');
  }

  if (tests.arrowTabText) {
    test.is(completer.arrowTabText, ' \u00a0\u21E5 ' + tests.arrowTabText,
            'arrowTabText for \'' + tests.typed + '\'');
  }
};

/**
 * Execute a command:
 *
 * helpers.exec({
 *   // Test inputs
 *   typed: "echo hi",        // Optional, uses existing if undefined
 *
 *   // Thing to check
 *   args: { message: "hi" }, // Check that the args were understood properly
 *   outputMatch: /^hi$/,     // Regex to test against textContent of output
 *   blankOutput: true,       // Special checks when there is no output
 * });
 */
exports.exec = function(options, tests) {
  var requisition = options.display.requisition;
  var inputter = options.display.inputter;

  tests = tests || {};

  if (tests.typed) {
    inputter.setInput(tests.typed);
  }

  var typed = inputter.getInputState().typed;
  var output = requisition.exec({ hidden: true });

  test.is(typed, output.typed, 'output.command for: ' + typed);

  if (tests.completed !== false) {
    test.ok(output.completed, 'output.completed false for: ' + typed);
  }
  else {
    // It is actually an error if we say something is async and it turns
    // out not to be? For now we're saying 'no'
    // test.ok(!output.completed, 'output.completed true for: ' + typed);
  }

  if (tests.args != null) {
    test.is(Object.keys(tests.args).length, Object.keys(output.args).length,
            'arg count for ' + typed);

    Object.keys(output.args).forEach(function(arg) {
      var expectedArg = tests.args[arg];
      var actualArg = output.args[arg];

      if (Array.isArray(expectedArg)) {
        if (!Array.isArray(actualArg)) {
          test.ok(false, 'actual is not an array. ' + typed + '/' + arg);
          return;
        }

        test.is(expectedArg.length, actualArg.length,
                'array length: ' + typed + '/' + arg);
        for (var i = 0; i < expectedArg.length; i++) {
          test.is(expectedArg[i], actualArg[i],
                  'member: "' + typed + '/' + arg + '/' + i);
        }
      }
      else {
        test.is(expectedArg, actualArg, 'typed: "' + typed + '" arg: ' + arg);
      }
    });
  }

  if (!options.window.document.createElement) {
    test.log('skipping output tests (missing doc.createElement) for ' + typed);
    return;
  }

  var div = options.window.document.createElement('div');
  output.toDom(div);
  var displayed = div.textContent.trim();

  if (tests.outputMatch) {
    function doTest(match, against) {
      if (!match.test(against)) {
        test.ok(false, "html output for " + typed + " against " + match.source);
        console.log("Actual textContent");
        console.log(against);
      }
    }
    if (Array.isArray(tests.outputMatch)) {
      tests.outputMatch.forEach(function(match) {
        doTest(match, displayed);
      });
    }
    else {
      doTest(tests.outputMatch, displayed);
    }
  }

  if (tests.blankOutput != null) {
    if (!/^$/.test(displayed)) {
      test.ok(false, "html for " + typed + " (textContent sent to info)");
      console.log("Actual textContent");
      console.log(displayed);
    }
  }
};


});
