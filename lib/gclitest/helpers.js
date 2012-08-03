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


var test = require('test/assert');
var util = require('gcli/util');


var cachedOptions = undefined;

exports.setup = function(opts) {
  cachedOptions = opts;
};

exports.shutdown = function(opts) {
  cachedOptions = undefined;
};

/**
 * We're splitting status into setup() which alters the state of the system
 * and check() which ensures that things are in the right place afterwards.
 */
exports.setInput = function(typed, cursor) {
  cachedOptions.display.inputter.setInput(typed);

  if (cursor) {
    cachedOptions.display.inputter.setCursor({ start: cursor, end: cursor });
  }
};

/**
 * Simulate pressing TAB in the input field
 */
exports.pressTab = function() {
  // requisition.complete({ start: 5, end: 5 }, 0);

  var fakeEvent = {
    keyCode: util.KeyEvent.DOM_VK_TAB,
    preventDefault: function() { },
    timeStamp: new Date().getTime()
  };
  cachedOptions.display.inputter.onKeyDown(fakeEvent);
  cachedOptions.display.inputter.onKeyUp(fakeEvent);
};

/**
 * check() is the new status. Similar API except that it doesn't attempt to
 * alter the display/requisition at all, and it makes extra checks.
 * Available checks:
 *   input: The text displayed in the input field
 *   cursor: The position of the start of the cursor
 *   status: One of "VALID", "ERROR", "INCOMPLETE"
 *   hints: The hint text, i.e. a concatenation of the directTabText, the
 *     emptyParameters and the arrowTabText. The text as inserted into the UI
 *     will include NBSP and Unicode RARR characters, these should be
 *     represented using normal space and '->' for the arrow
 *   markup: What state should the error markup be in. e.g. "VVVIIIEEE"
 *   args: Maps of checks to make against the arguments:
 *     value: i.e. assignment.value (which ignores defaultValue)
 *     type: Argument/BlankArgument/MergedArgument/etc i.e. what's assigned
 *           Care should be taken with this since it's something of an
 *           implementation detail
 *     arg: The toString value of the argument
 *     status: i.e. assignment.getStatus
 *     message: i.e. assignment.getMessage
 *     name: For commands - checks assignment.value.name
 */
exports.check = function(checks) {
  var requisition = cachedOptions.display.requisition;
  var completer = cachedOptions.display.completer;
  var actual = completer._getCompleterTemplateData();

  if (checks.input != null) {
    test.is(cachedOptions.display.inputter.element.value,
            checks.input,
            'input');
  }

  if (checks.cursor != null) {
    test.is(cachedOptions.display.inputter.element.selectionStart,
            checks.cursor,
            'cursor');
  }

  if (checks.status != null) {
    test.is(requisition.getStatus().toString(),
            checks.status,
            'status');
  }

  if (checks.markup != null) {
    var cursor = cachedOptions.display.inputter.element.selectionStart;
    var statusMarkup = requisition.getInputStatusMarkup(cursor);
    var actualMarkup = statusMarkup.map(function(s) {
      return Array(s.string.length + 1).join(s.status.toString()[0]);
    }).join('');

    test.is(checks.markup,
            actualMarkup,
            'markup');
  }

  if (checks.hints != null) {
    var actualHints = actual.directTabText +
                      actual.emptyParameters.join('') +
                      actual.arrowTabText;
    actualHints = actualHints.replace(/\u00a0/g, ' ')
                             .replace(/\u21E5/, '->')
                             .replace(/ $/, '');
    test.is(actualHints,
            checks.hints,
            'hints');
  }

  if (checks.args != null) {
    Object.keys(checks.args).forEach(function(paramName) {
      var check = checks.args[paramName];

      var assignment;
      if (paramName === 'command') {
        assignment = requisition.commandAssignment;
      }
      else {
        assignment = requisition.getAssignment(paramName);
      }

      if (assignment == null) {
        test.ok(false, 'Unknown arg: ' + paramName);
        return;
      }

      if (check.value != null) {
        test.is(assignment.value,
                check.value,
                'arg[\'' + paramName + '\'].value');
      }

      if (check.name != null) {
        test.is(assignment.value.name,
                check.name,
                'arg[\'' + paramName + '\'].name');
      }

      if (check.type != null) {
        test.is(assignment.arg.type,
                check.type,
                'arg[\'' + paramName + '\'].type');
      }

      if (check.arg != null) {
        test.is(assignment.arg.toString(),
                check.arg,
                'arg[\'' + paramName + '\'].arg');
      }

      if (check.status != null) {
        test.is(assignment.getStatus().toString(),
                check.status,
                'arg[\'' + paramName + '\'].status');
      }

      if (check.message != null) {
        test.is(assignment.getMessage(),
                check.message,
                'arg[\'' + paramName + '\'].message');
      }
    });
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
