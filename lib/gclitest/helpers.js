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


var Q = require('gcli/promise');
var util = require('gcli/util');

// A copy of this code exists in firefox mochitests; when updated here, it
// should be updated there too. Hence the use of an exports synonym for non
// AMD contexts.
var helpers = exports;

var assert = require('test/assert');

helpers._display = undefined;
helpers._options = undefined;

helpers.setup = function(options) {
  helpers._options = options;
  helpers._display = options.display;
};

helpers.shutdown = function(options) {
  helpers._options = undefined;
  helpers._display = undefined;
};

/**
 * Various functions to return the actual state of the command line
 */
helpers._actual = {
  input: function() {
    return helpers._display.inputter.element.value;
  },

  hints: function() {
    var templateData = helpers._display.completer._getCompleterTemplateData();
    var join = function(directTabText, emptyParameters, arrowTabText) {
      return (directTabText + emptyParameters.join('') + arrowTabText)
                .replace(/\u00a0/g, ' ')
                .replace(/\u21E5/, '->')
                .replace(/ $/, '');
    };

    var promisedJoin = util.promised(join);
    return promisedJoin(templateData.directTabText,
                        templateData.emptyParameters,
                        templateData.arrowTabText);
  },

  markup: function() {
    var cursor = helpers._display.inputter.element.selectionStart;
    var statusMarkup = helpers._display.requisition.getInputStatusMarkup(cursor);
    return statusMarkup.map(function(s) {
      return Array(s.string.length + 1).join(s.status.toString()[0]);
    }).join('');
  },

  cursor: function() {
    return helpers._display.inputter.element.selectionStart;
  },

  current: function() {
    return helpers._display.requisition.getAssignmentAt(helpers._actual.cursor()).param.name;
  },

  status: function() {
    return helpers._display.requisition.getStatus().toString();
  },

  predictions: function() {
    var cursor = helpers._display.inputter.element.selectionStart;
    var assignment = helpers._display.requisition.getAssignmentAt(cursor);
    return assignment.getPredictions().then(function(predictions) {
      return predictions.map(function(prediction) {
        return prediction.name;
      });
    }, console.error);
  },

  unassigned: function() {
    return helpers._display.requisition._unassigned.map(function(assignment) {
      return assignment.arg.toString();
    }.bind(this));
  },

  outputState: function() {
    var outputData = helpers._display.focusManager._shouldShowOutput();
    return outputData.visible + ':' + outputData.reason;
  },

  tooltipState: function() {
    var tooltipData = helpers._display.focusManager._shouldShowTooltip();
    return tooltipData.visible + ':' + tooltipData.reason;
  }
};

function shouldOutputUnquoted(value) {
  var type = typeof value;
  return value == null || type === 'boolean' || type === 'number';
}

helpers._createDebugCheck = function() {
  var requisition = helpers._display.requisition;
  var command = requisition.commandAssignment.value;
  var cursor = helpers._actual.cursor();
  var input = helpers._actual.input();
  var padding = Array(input.length + 1).join(' ');

  var hintsPromise = helpers._actual.hints();
  var predictionsPromise = helpers._actual.predictions();

  return util.promised(Array)(hintsPromise, predictionsPromise).then(function(values) {
    var hints = values[0];
    var predictions = values[1];
    var output = '';

    output += 'helpers.audit([\n';
    output += '  {\n';

    if (cursor === input.length) {
      output += '    setup: \'' + input + '\',\n';
    }
    else {
      output += '    setup: function() {\n';
      output += '      helpers.setInput(\'' + input + '\', ' + cursor + ');\n';
      output += '    },\n';
    }

    output += '    check: {\n';

    output += '      input:  \'' + input + '\',\n';
    output += '      hints:  ' + padding + '\'' + hints + '\',\n';
    output += '      markup: \'' + helpers._actual.markup() + '\',\n';
    output += '      cursor: ' + cursor + ',\n';
    output += '      current: \'' + helpers._actual.current() + '\',\n';
    output += '      status: \'' + helpers._actual.status() + '\',\n';

    if (predictions.length === 0) {
      output += '      predictions: [ ],\n';
    }
    else {
      output += '      predictions: [\'' + predictions.join('\',\'') + '\'],\n';
    }

    if (requisition._unassigned.length === 0) {
      output += '      unassigned: [ ],\n';
    }
    else {
      var unassignedValues = requisition._unassigned.join('\',\'');
      output += '      unassigned: [\'' + unassignedValues + '\'],\n';
    }

    output += '      outputState: \'' + helpers._actual.outputState() + '\',\n';
    output += '      tooltipState: \'' + helpers._actual.tooltipState() + '\'' +
              (command ? ',' : '') +'\n';

    if (command) {
      output += '      args: {\n';
      output += '        command: { name: \'' + command.name + '\' },\n';

      requisition.getAssignments().forEach(function(assignment) {
        output += '        ' + assignment.param.name + ': { ';

        if (typeof assignment.value === 'string') {
          output += 'value: \'' + assignment.value + '\', ';
        }
        else if (shouldOutputUnquoted(assignment.value)) {
          output += 'value: ' + assignment.value + ', ';
        }
        else {
          output += '/*value:' + assignment.value + ',*/ ';
        }

        output += 'arg: \'' + assignment.arg + '\', ';
        output += 'status: \'' + assignment.getStatus().toString() + '\', ';
        output += 'message: \'' + assignment.getMessage() + '\'';
        output += ' },\n';
      });

      output += '      }\n';
    }

    output += '    }\n';
    output += '  }\n';
    output += ']);';

    return output;
  }.bind(this), console.error);
};

/**
 * We're splitting status into setup() which alters the state of the system
 * and check() which ensures that things are in the right place afterwards.
 */
helpers.setInput = function(typed, cursor) {
  return helpers._display.inputter.setInput(typed).then(function() {
    if (cursor != null) {
      helpers._display.inputter.setCursor({ start: cursor, end: cursor });
    }
    else {
      // This is a hack because jsdom appears to not handle cursor updates
      // in the same way as most browsers.
      if (helpers._options.isJsdom) {
        helpers._display.inputter.setCursor({
          start: typed.length,
          end: typed.length
        });
      }
    }

    helpers._display.focusManager.onInputChange();

    // Firefox testing is noisy and distant, so logging helps
    if (helpers._options.isFirefox) {
      var cursorStr = (cursor == null ? '' : ', ' + cursor);
      assert.log('setInput("' + typed + '"' + cursorStr + ')');
    }
  }.bind(this), console.error);
};

/**
 * Simulate focusing the input field
 */
helpers.focusInput = function() {
  helpers._display.inputter.focus();
};

/**
 * Simulate pressing TAB in the input field
 */
helpers.pressTab = function() {
  return helpers.pressKey(9 /*KeyEvent.DOM_VK_TAB*/);
};

/**
 * Simulate pressing RETURN in the input field
 */
helpers.pressReturn = function() {
  return helpers.pressKey(13 /*KeyEvent.DOM_VK_RETURN*/);
};

/**
 * Simulate pressing a key by keyCode in the input field
 */
helpers.pressKey = function(keyCode) {
  var fakeEvent = {
    keyCode: keyCode,
    preventDefault: function() { },
    timeStamp: new Date().getTime()
  };
  helpers._display.inputter.onKeyDown(fakeEvent);
  return helpers._display.inputter.onKeyUp(fakeEvent);
};

/**
 * check() is the new status. Similar API except that it doesn't attempt to
 * alter the display/requisition at all, and it makes extra checks.
 */
helpers._check = function(name, checks) {
  var suffix = name ? ' (for \'' + name + '\')' : '';

  if ('input' in checks) {
    assert.is(helpers._actual.input(), checks.input, 'input' + suffix);
  }

  if ('cursor' in checks) {
    assert.is(helpers._actual.cursor(), checks.cursor, 'cursor' + suffix);
  }

  if ('current' in checks) {
    assert.is(helpers._actual.current(), checks.current, 'current' + suffix);
  }

  if ('status' in checks) {
    assert.is(helpers._actual.status(), checks.status, 'status' + suffix);
  }

  if ('markup' in checks) {
    assert.is(helpers._actual.markup(), checks.markup, 'markup' + suffix);
  }

  if ('hints' in checks) {
    var hintCheck = assert.checkCalled(function(actualHints) {
      assert.is(actualHints, checks.hints, 'hints' + suffix);
    });
    helpers._actual.hints().then(hintCheck, console.error);
  }

  if ('predictions' in checks) {
    var predictionsCheck = assert.checkCalled(function(actualPredictions) {
      helpers._arrayIs(actualPredictions,
                       checks.predictions,
                       'predictions' + suffix);
    });
    helpers._actual.predictions().then(predictionsCheck, console.error);
  }

  if ('predictionsContains' in checks) {
    var containsCheck = assert.checkCalled(function(actualPredictions) {
      checks.predictionsContains.forEach(function(prediction) {
        var index = actualPredictions.indexOf(prediction);
        assert.ok(index !== -1,
                  'predictionsContains:' + prediction + suffix);
      });
    });
    helpers._actual.predictions().then(containsCheck, console.error);
  }

  if ('tooltipState' in checks) {
    assert.is(helpers._actual.tooltipState(),
              checks.tooltipState,
              'tooltipState' + suffix);
  }

  if ('unassigned' in checks) {
    helpers._arrayIs(helpers._actual.unassigned(),
                     checks.unassigned,
                     'unassigned' + suffix);
  }

  if ('outputState' in checks) {
    assert.is(helpers._actual.outputState(),
              checks.outputState,
              'outputState' + suffix);
  }

  if (checks.args != null) {
    var requisition = helpers._display.requisition;
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
        assert.ok(false, 'Unknown arg: ' + paramName + suffix);
        return;
      }

      if ('value' in check) {
        assert.is(assignment.value,
                  check.value,
                  'arg.' + paramName + '.value' + suffix);
      }

      if ('name' in check) {
        assert.is(assignment.value.name,
                  check.name,
                  'arg.' + paramName + '.name' + suffix);
      }

      if ('type' in check) {
        assert.is(assignment.arg.type,
                  check.type,
                  'arg.' + paramName + '.type' + suffix);
      }

      if ('arg' in check) {
        assert.is(assignment.arg.toString(),
                  check.arg,
                  'arg.' + paramName + '.arg' + suffix);
      }

      if ('status' in check) {
        assert.is(assignment.getStatus().toString(),
                  check.status,
                  'arg.' + paramName + '.status' + suffix);
      }

      if ('message' in check) {
        if (typeof check.message.test === 'function') {
          assert.ok(check.message.test(assignment.getMessage()),
                    'arg.' + paramName + '.message' + suffix);
        }
        else {
          assert.is(assignment.getMessage(),
                    check.message,
                    'arg.' + paramName + '.message' + suffix);
        }
      }
    });
  }
};

/**
 * A way of turning a set of tests into something more declarative, this helps
 * to allow tests to be asynchronous.
 * @param audits An array of objects each of which contains:
 * - setup: (Optional) string/function to be called to set the test up.
 *     If audit is a string then it is passed to helpers.setInput().
 *     If audit is a function then it is executed.
 * - name: (Optional) For debugging purposes. If name is undefined, and 'setup'
 *     is a string then the setup value will be used automatically
 * - check: Check data. Available checks:
 *   - input: The text displayed in the input field
 *   - cursor: The position of the start of the cursor
 *   - status: One of "VALID", "ERROR", "INCOMPLETE"
 *   - hints: The hint text, i.e. a concatenation of the directTabText, the
 *       emptyParameters and the arrowTabText. The text as inserted into the UI
 *       will include NBSP and Unicode RARR characters, these should be
 *       represented using normal space and '->' for the arrow
 *   - markup: What state should the error markup be in. e.g. "VVVIIIEEE"
 *   - args: Maps of checks to make against the arguments:
 *     - value: i.e. assignment.value (which ignores defaultValue)
 *     - type: Argument/BlankArgument/MergedArgument/etc i.e. what's assigned
 *             Care should be taken with this since it's something of an
 *             implementation detail
 *     - arg: The toString value of the argument
 *     - status: i.e. assignment.getStatus
 *     - message: i.e. assignment.getMessage
 *     - name: For commands - checks assignment.value.name
 * - post: (Optional) function to be called after the checks have been run
 */
helpers.audit = function(audits) {
  var auditNext = function(index) {
    var audit = audits[index];
    var name = audit.name;

    var complete = undefined;
    if (typeof audit.setup === 'string') {
      name = name || audit.setup;
      complete = helpers.setInput(audit.setup);
    }
    else if (typeof audit.setup === 'function') {
      complete = audit.setup();
    }

    Q.resolve(complete).then(function() {
      helpers._check(name, audit.check);

      if (typeof audit.post === 'function') {
        audit.post();
      }

      if (index + 1 < audits.length) {
        auditNext(index + 1);
      }
    }.bind(this), console.error);
  }.bind(this);

  auditNext(0);
};

/**
 * Compare 2 arrays.
 */
helpers._arrayIs = function(actual, expected, message) {
  assert.ok(Array.isArray(actual), 'actual is not an array: ' + message);
  assert.ok(Array.isArray(expected), 'expected is not an array: ' + message);

  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    return;
  }

  assert.is(actual.length, expected.length, 'array length: ' + message);

  for (var i = 0; i < actual.length && i < expected.length; i++) {
    assert.is(actual[i], expected[i], 'member[' + i + ']: ' + message);
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
helpers.exec = function(tests) {
  var requisition = helpers._display.requisition;
  var inputter = helpers._display.inputter;

  tests = tests || {};

  if (tests.typed) {
    inputter.setInput(tests.typed);
  }

  var typed = inputter.getInputState().typed;
  var output = requisition.exec({ hidden: true });

  assert.is(typed, output.typed, 'output.command for: ' + typed);

  if (tests.completed !== false) {
    assert.ok(output.completed, 'output.completed false for: ' + typed);
  }
  else {
    // It is actually an error if we say something is async and it turns
    // out not to be? For now we're saying 'no'
    // test.ok(!output.completed, 'output.completed true for: ' + typed);
  }

  if (tests.args != null) {
    assert.is(Object.keys(tests.args).length, Object.keys(output.args).length,
            'arg count for ' + typed);

    Object.keys(output.args).forEach(function(arg) {
      var expectedArg = tests.args[arg];
      var actualArg = output.args[arg];

      if (Array.isArray(expectedArg)) {
        helpers._arrayIs(actualArg, expectedArg, 'args for typed: "' + typed);
      }
      else {
        assert.is(expectedArg, actualArg, 'typed: "' + typed + '" arg: ' + arg);
      }
    });
  }

  if (!helpers._options.window.document.createElement) {
    assert.log('skipping output tests (missing doc.createElement) for ' + typed);
    return;
  }

  var checkOutput = assert.checkCalled(function() {
    var div = helpers._options.window.document.createElement('div');
    output.toDom(div);
    var displayed = div.textContent.trim();

    if (tests.outputMatch) {
      var doTest = function(match, against) {
        if (!match.test(against)) {
          assert.ok(false, "html output for " + typed + " against " + match.source);
          console.log("Actual textContent");
          console.log(against);
        }
      };

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
        assert.ok(false, "html for " + typed + " (textContent sent to info)");
        console.log("Actual textContent");
        console.log(displayed);
      }
    }
  }, this);

  if (output.completed !== false) {
    checkOutput();
  }
  else {
    var changed = function() {
      if (output.completed !== false) {
        checkOutput();
        output.onChange.remove(changed);
      }
    };
    output.onChange.add(changed);
  }

};


});
