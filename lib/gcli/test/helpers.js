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

// A copy of this code exists in firefox mochitests. They should be kept
// in sync. Hence the exports synonym for non AMD contexts.
var helpers = exports;

var promise = require('../util/promise');
var util = require('../util/util');
var assert = require('../testharness/assert');

var cli = require('../cli');

/**
 * Ensure that the options object is setup correctly
 */
function checkOptions(options) {
  if (options == null) {
    console.trace();
    throw new Error('Missing options object');
  }
  if (options.requisition == null) {
    console.trace();
    throw new Error('display object does not contain a requisition');
  }
}

/**
 * Various functions to return the actual state of the command line
 */
helpers._actual = {
  input: function(options) {
    return options.terminal.getInputState().typed;
  },

  hints: function(options) {
    var terminal = options.terminal;
    return terminal.control.getCompleterTemplateData().then(function(data) {
      var emptyParams = data.emptyParameters.join('');
      return (data.directTabText + emptyParams + data.arrowTabText)
                .replace(/\u00a0/g, ' ')
                .replace(/\u21E5/, '->')
                .replace(/ $/, '');
    });
  },

  markup: function(options) {
    var cursor = helpers._actual.cursor(options);
    var statusMarkup = options.requisition.getInputStatusMarkup(cursor);
    return statusMarkup.map(function(s) {
      return new Array(s.string.length + 1).join(s.status.toString()[0]);
    }).join('');
  },

  cursor: function(options) {
    return options.terminal.getInputState().cursor.start;
  },

  current: function(options) {
    var cursor = helpers._actual.cursor(options);
    return options.requisition.getAssignmentAt(cursor).param.name;
  },

  status: function(options) {
    return options.requisition.status.toString();
  },

  predictions: function(options) {
    var cursor = helpers._actual.cursor(options);
    var assignment = options.requisition.getAssignmentAt(cursor);
    return assignment.getPredictions().then(function(predictions) {
      return predictions.map(function(prediction) {
        return prediction.name;
      });
    });
  },

  unassigned: function(options) {
    return options.requisition._unassigned.map(function(assignment) {
      return assignment.arg.toString();
    }.bind(this));
  },

  outputState: function(options) {
    var outputData = options.terminal.focusManager._shouldShowOutput();
    return outputData.visible + ':' + outputData.reason;
  },

  tooltipState: function(options) {
    var tooltipData = options.terminal.focusManager._shouldShowTooltip();
    return tooltipData.visible + ':' + tooltipData.reason;
  },

  options: function(options) {
    if (options.terminal.field.menu == null) {
      return [];
    }
    return options.terminal.field.menu.items.map(function(item) {
      return item.name.textContent ? item.name.textContent : item.name;
    });
  },

  message: function(options) {
    return options.terminal.errorEle.textContent;
  }
};

function shouldOutputUnquoted(value) {
  var type = typeof value;
  return value == null || type === 'boolean' || type === 'number';
}

function outputArray(array) {
  return (array.length === 0) ?
      '[ ]' :
      '[ \'' + array.join('\', \'') + '\' ]';
}

helpers._createDebugCheck = function(options) {
  checkOptions(options);
  var requisition = options.requisition;
  var command = requisition.commandAssignment.value;
  var cursor = helpers._actual.cursor(options);
  var input = helpers._actual.input(options);
  var padding = new Array(input.length + 1).join(' ');

  var hintsPromise = helpers._actual.hints(options);
  var predictionsPromise = helpers._actual.predictions(options);

  return promise.all(hintsPromise, predictionsPromise).then(function(values) {
    var hints = values[0];
    var predictions = values[1];
    var output = '';

    output += 'return helpers.audit(options, [\n';
    output += '  {\n';

    if (cursor === input.length) {
      output += '    setup:    \'' + input + '\',\n';
    }
    else {
      output += '    name: \'' + input + ' (cursor=' + cursor + ')\',\n';
      output += '    setup: function() {\n';
      output += '      return helpers.setInput(options, \'' + input + '\', ' + cursor + ');\n';
      output += '    },\n';
    }

    output += '    check: {\n';

    output += '      input:  \'' + input + '\',\n';
    output += '      hints:  ' + padding + '\'' + hints + '\',\n';
    output += '      markup: \'' + helpers._actual.markup(options) + '\',\n';
    output += '      cursor: ' + cursor + ',\n';
    output += '      current: \'' + helpers._actual.current(options) + '\',\n';
    output += '      status: \'' + helpers._actual.status(options) + '\',\n';
    output += '      options: ' + outputArray(helpers._actual.options(options)) + ',\n';
    output += '      message: \'' + helpers._actual.message(options) + '\',\n';
    output += '      predictions: ' + outputArray(predictions) + ',\n';
    output += '      unassigned: ' + outputArray(requisition._unassigned) + ',\n';
    output += '      outputState: \'' + helpers._actual.outputState(options) + '\',\n';
    output += '      tooltipState: \'' + helpers._actual.tooltipState(options) + '\'' +
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
        output += 'message: \'' + assignment.message + '\'';
        output += ' },\n';
      });

      output += '      }\n';
    }

    output += '    },\n';
    output += '    exec: {\n';
    output += '      output: \'\',\n';
    output += '      completed: true,\n';
    output += '      type: \'string\',\n';
    output += '      error: false\n';
    output += '    }\n';
    output += '  }\n';
    output += ']);';

    return output;
  }.bind(this), util.errorHandler);
};

/**
 * Simulate focusing the input field
 */
helpers.focusInput = function(options) {
  checkOptions(options);
  if (options.terminal) {
    options.terminal.focus();
  }
};

/**
 * Simulate pressing TAB in the input field
 */
helpers.pressTab = function(options) {
  checkOptions(options);
  return helpers.pressKey(options, 9 /*KeyEvent.DOM_VK_TAB*/);
};

/**
 * Simulate pressing RETURN in the input field
 */
helpers.pressReturn = function(options) {
  checkOptions(options);
  return helpers.pressKey(options, 13 /*KeyEvent.DOM_VK_RETURN*/);
};

/**
 * Simulate pressing a key by keyCode in the input field
 */
helpers.pressKey = function(options, keyCode) {
  checkOptions(options);
  var fakeEvent = {
    keyCode: keyCode,
    preventDefault: function() { },
    timeStamp: new Date().getTime()
  };
  options.terminal.onKeyDown(fakeEvent);
  return options.terminal.handleKeyUp(fakeEvent);
};

/**
 * A list of special key presses and how to to them, for the benefit of
 * helpers.setInput
 */
var ACTIONS = {
  '<TAB>': function(options) {
    return helpers.pressTab(options);
  },
  '<RETURN>': function(options) {
    return helpers.pressReturn(options);
  },
  '<UP>': function(options) {
    return helpers.pressKey(options, 38 /*KeyEvent.DOM_VK_UP*/);
  },
  '<DOWN>': function(options) {
    return helpers.pressKey(options, 40 /*KeyEvent.DOM_VK_DOWN*/);
  }
};

/**
 * Used in helpers.setInput to cut an input string like 'blah<TAB>foo<UP>' into
 * an array like [ 'blah', '<TAB>', 'foo', '<UP>' ].
 * When using this RegExp, you also need to filter out the blank strings.
 */
var CHUNKER = /([^<]*)(<[A-Z]+>)/;

/**
 * Alter the input to <code>typed</code> optionally leaving the cursor at
 * <code>cursor</code>.
 * @return A promise of the number of key-presses to respond
 */
helpers.setInput = function(options, typed, cursor) {
  checkOptions(options);
  var inputPromise;
  var terminal = options.terminal;
  // We try to measure average keypress time, but setInput can simulate
  // several, so we try to keep track of how many
  var chunkLen = 1;

  // The easy case is a simple string without things like <TAB>
  if (typed.indexOf('<') === -1) {
    inputPromise = (terminal == null) ?
        options.requisition.update(typed) :
        terminal.setInput(typed);
  }
  else {
    // This is a nasty hack: We return -1 to indicate to _setup() that this
    // test uses key sequences implemented by terminal.js (which doesn't exist)
    if (terminal == null) {
      return promise.resolve(-1);
    }

    // Cut the input up into input strings separated by '<KEY>' tokens. The
    // CHUNKS RegExp leaves blanks so we filter them out.
    var chunks = typed.split(CHUNKER).filter(function(s) {
      return s !== '';
    });
    chunkLen = chunks.length + 1;

    // We're working on this in chunks so first clear the input
    inputPromise = terminal.setInput('').then(function() {
      return util.promiseEach(chunks, function(chunk) {
        if (chunk.charAt(0) === '<') {
          var action = ACTIONS[chunk];
          if (typeof action !== 'function') {
            console.error('Known actions: ' + Object.keys(ACTIONS).join());
            throw new Error('Key action not found "' + chunk + '"');
          }
          return action(options);
        }
        else {
          return terminal.setInput(terminal.getInputState().typed + chunk);
        }
      });
    });
  }

  return inputPromise.then(function() {
    if (cursor != null) {
      terminal.control.setCursor({ start: cursor, end: cursor });
    }
    else {
      // This is a hack because jsdom appears to not handle cursor updates
      // in the same way as most browsers.
      if (options.isJsdom && terminal) {
        terminal.control.setCursor({
          start: typed.length,
          end: typed.length
        });
      }
    }

    if (terminal) {
      terminal.focusManager.onInputChange();
    }

    // Firefox testing is noisy and distant, so logging helps
    if (options.isFirefox) {
      var cursorStr = (cursor == null ? '' : ', ' + cursor);
      log('setInput("' + typed + '"' + cursorStr + ')');
    }

    return chunkLen;
  });
};

/**
 * Helper for helpers.audit() to ensure that all the 'check' properties match.
 * See helpers.audit for more information.
 * @param name The name to use in error messages
 * @param checks See helpers.audit for a list of available checks
 * @return A promise which resolves to undefined when the checks are complete
 */
helpers._check = function(options, name, checks) {
  // A test method to check that all args are assigned in some way
  var requisition = options.requisition;
  requisition._args.forEach(function(arg) {
    if (arg.assignment == null) {
      assert.ok(false, 'No assignment for ' + arg);
    }
  });

  if (checks == null) {
    return promise.resolve();
  }

  var outstanding = [];
  var suffix = name ? ' (for \'' + name + '\')' : '';

  if (!options.isNoDom && 'input' in checks) {
    assert.is(helpers._actual.input(options), checks.input, 'input' + suffix);
  }

  if (!options.isNoDom && 'cursor' in checks) {
    assert.is(helpers._actual.cursor(options), checks.cursor, 'cursor' + suffix);
  }

  if (!options.isNoDom && 'current' in checks) {
    assert.is(helpers._actual.current(options), checks.current, 'current' + suffix);
  }

  if ('status' in checks) {
    assert.is(helpers._actual.status(options), checks.status, 'status' + suffix);
  }

  if (!options.isNoDom && 'markup' in checks) {
    assert.is(helpers._actual.markup(options), checks.markup, 'markup' + suffix);
  }

  if (!options.isNoDom && 'hints' in checks) {
    var hintCheck = function(actualHints) {
      assert.is(actualHints, checks.hints, 'hints' + suffix);
    };
    outstanding.push(helpers._actual.hints(options).then(hintCheck));
  }

  if (!options.isNoDom && 'predictions' in checks) {
    var predictionsCheck = function(actualPredictions) {
      helpers.arrayIs(actualPredictions,
                       checks.predictions,
                       'predictions' + suffix);
    };
    outstanding.push(helpers._actual.predictions(options).then(predictionsCheck));
  }

  if (!options.isNoDom && 'predictionsContains' in checks) {
    var containsCheck = function(actualPredictions) {
      checks.predictionsContains.forEach(function(prediction) {
        var index = actualPredictions.indexOf(prediction);
        assert.ok(index !== -1,
                  'predictionsContains:' + prediction + suffix);
      });
    };
    outstanding.push(helpers._actual.predictions(options).then(containsCheck));
  }

  if ('unassigned' in checks) {
    helpers.arrayIs(helpers._actual.unassigned(options),
                     checks.unassigned,
                     'unassigned' + suffix);
  }

  /* TODO: Fix this
  if (!options.isNoDom && 'tooltipState' in checks) {
    if (options.isJsdom) {
      assert.log('Skipped ' + name + '/tooltipState due to jsdom');
    }
    else {
      assert.is(helpers._actual.tooltipState(options),
                checks.tooltipState,
                'tooltipState' + suffix);
    }
  }
  */

  if (!options.isNoDom && 'outputState' in checks) {
    if (options.isJsdom) {
      assert.log('Skipped ' + name + '/outputState due to jsdom');
    }
    else {
      assert.is(helpers._actual.outputState(options),
                checks.outputState,
                'outputState' + suffix);
    }
  }

  if (!options.isNoDom && 'options' in checks) {
    helpers.arrayIs(helpers._actual.options(options),
                     checks.options,
                     'options' + suffix);
  }

  if (!options.isNoDom && 'error' in checks) {
    assert.is(helpers._actual.message(options), checks.error, 'error' + suffix);
  }

  if (checks.args != null) {
    Object.keys(checks.args).forEach(function(paramName) {
      var check = checks.args[paramName];

      // We allow an 'argument' called 'command' to be the command itself, but
      // what if the command has a parameter called 'command' (for example, an
      // 'exec' command)? We default to using the parameter because checking
      // the command value is less useful
      var assignment = requisition.getAssignment(paramName);
      if (assignment == null && paramName === 'command') {
        assignment = requisition.commandAssignment;
      }

      if (assignment == null) {
        assert.ok(false, 'Unknown arg: ' + paramName + suffix);
        return;
      }

      if ('value' in check) {
        if (typeof check.value === 'function') {
          try {
            check.value(assignment.value);
          }
          catch (ex) {
            assert.ok(false, '' + ex);
          }
        }
        else {
          assert.is(assignment.value,
                    check.value,
                    'arg.' + paramName + '.value' + suffix);
        }
      }

      if ('name' in check) {
        if (options.isJsdom) {
          assert.log('Skipped arg.' + paramName + '.name due to jsdom');
        }
        else {
          assert.is(assignment.value.name,
                    check.name,
                    'arg.' + paramName + '.name' + suffix);
        }
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

      if (!options.isNoDom && 'message' in check) {
        if (typeof check.message.test === 'function') {
          assert.ok(check.message.test(assignment.message),
                    'arg.' + paramName + '.message' + suffix);
        }
        else {
          assert.is(assignment.message,
                    check.message,
                    'arg.' + paramName + '.message' + suffix);
        }
      }
    });
  }

  return promise.all(outstanding).then(function() {
    // Ensure the promise resolves to nothing
    return undefined;
  });
};

/**
 * Helper for helpers.audit() to ensure that all the 'exec' properties work.
 * See helpers.audit for more information.
 * @param name The name to use in error messages
 * @param expected See helpers.audit for a list of available exec checks
 * @return A promise which resolves to undefined when the checks are complete
 */
helpers._exec = function(options, name, expected) {
  var requisition = options.requisition;
  if (expected == null) {
    return promise.resolve({});
  }

  var origLogErrors = cli.logErrors;
  if (expected.error) {
    cli.logErrors = false;
  }

  var completed = true;

  try {
    return requisition.exec({ hidden: true }).then(function(output) {
      if ('completed' in expected) {
        assert.is(completed,
                  expected.completed,
                  'output.completed for: ' + name);
      }

      if ('type' in expected) {
        assert.is(output.type,
                  expected.type,
                  'output.type for: ' + name);
      }

      if ('error' in expected) {
        assert.is(output.error,
                  expected.error,
                  'output.error for: ' + name);
      }

      if (!('output' in expected)) {
        return { output: output };
      }

      var context = requisition.conversionContext;
      var convertPromise;
      if (options.isNoDom) {
        convertPromise = output.convert('string', context);
      }
      else {
        convertPromise = output.convert('dom', context).then(function(node) {
          return node.textContent.trim();
        });
      }

      return convertPromise.then(function(textOutput) {
        var doTest = function(match, against) {
          // Only log the real textContent if the test fails
          if (against.match(match) != null) {
            assert.ok(true, 'html output for \'' + name + '\' ' +
                            'should match /' + match.source || match + '/');
          } else {
            assert.ok(false, 'html output for \'' + name + '\' ' +
                             'should match /' + match.source || match + '/. ' +
                             'Actual textContent: "' + against + '"');
          }
        };

        if (typeof expected.output === 'string') {
          assert.is(textOutput,
                    expected.output,
                    'html output for ' + name);
        }
        else if (Array.isArray(expected.output)) {
          expected.output.forEach(function(match) {
            doTest(match, textOutput);
          });
        }
        else {
          doTest(expected.output, textOutput);
        }

        if (expected.error) {
          cli.logErrors = origLogErrors;
        }
        return { output: output, text: textOutput };
      });
    }.bind(this)).then(function(data) {
      if (expected.error) {
        cli.logErrors = origLogErrors;
      }

      return data;
    });
  }
  catch (ex) {
    assert.ok(false, 'Failure executing \'' + name + '\': ' + ex);
    util.errorHandler(ex);

    if (expected.error) {
      cli.logErrors = origLogErrors;
    }
    return promise.resolve({});
  }
  finally {
    completed = false;
  }
};

/**
 * Helper to setup the test
 */
helpers._setup = function(options, name, action) {
  if (typeof action === 'string') {
    return helpers.setInput(options, action);
  }

  if (typeof action === 'function') {
    return promise.resolve(action());
  }

  return promise.reject('\'setup\' property must be a string or a function. Is ' + action);
};

/**
 * Helper to shutdown the test
 */
helpers._post = function(name, action, data) {
  if (typeof action === 'function') {
    return promise.resolve(action(data.output, data.text));
  }
  return promise.resolve(action);
};

/*
 * We do some basic response time stats so we can see if we're getting slow
 */
var totalResponseTime = 0;
var averageOver = 0;
var maxResponseTime = 0;
var maxResponseCulprit;
var start;

/**
 * Restart the stats collection process
 */
helpers.resetResponseTimes = function() {
  start = new Date().getTime();
  totalResponseTime = 0;
  averageOver = 0;
  maxResponseTime = 0;
  maxResponseCulprit = undefined;
};

/**
 * Expose an average response time in milliseconds
 */
Object.defineProperty(helpers, 'averageResponseTime', {
  get: function() {
    return averageOver === 0 ?
        undefined :
        Math.round(100 * totalResponseTime / averageOver) / 100;
  },
  enumerable: true
});

/**
 * Expose a maximum response time in milliseconds
 */
Object.defineProperty(helpers, 'maxResponseTime', {
  get: function() { return Math.round(maxResponseTime * 100) / 100; },
  enumerable: true
});

/**
 * Expose the name of the test that provided the maximum response time
 */
Object.defineProperty(helpers, 'maxResponseCulprit', {
  get: function() { return maxResponseCulprit; },
  enumerable: true
});

/**
 * Quick summary of the times
 */
Object.defineProperty(helpers, 'timingSummary', {
  get: function() {
    var elapsed = (new Date().getTime() - start) / 1000;
    return 'Total ' + elapsed + 's, ' +
           'ave response ' + helpers.averageResponseTime + 'ms, ' +
           'max response ' + helpers.maxResponseTime + 'ms ' +
           'from \'' + helpers.maxResponseCulprit + '\'';
  },
  enumerable: true
});

/**
 * A way of turning a set of tests into something more declarative, this helps
 * to allow tests to be asynchronous.
 * @param audits An array of objects each of which contains:
 * - setup: string/function to be called to set the test up.
 *     If audit is a string then it is passed to helpers.setInput().
 *     If audit is a function then it is executed. The tests will wait while
 *     tests that return promises complete.
 * - name: For debugging purposes. If name is undefined, and 'setup'
 *     is a string then the setup value will be used automatically
 * - skipIf: A function to define if the test should be skipped. Useful for
 *     excluding tests from certain environments (e.g. jsdom, firefox, etc).
 *     The name of the test will be used in log messages noting the skip
 *     See helpers.reason for pre-defined skip functions. The skip function must
 *     be synchronous, and will be passed the test options object.
 * - skipRemainingIf: A function to skip all the remaining audits in this set.
 *     See skipIf for details of how skip functions work.
 * - check: Check data. Available checks:
 *   - input: The text displayed in the input field
 *   - cursor: The position of the start of the cursor
 *   - status: One of 'VALID', 'ERROR', 'INCOMPLETE'
 *   - hints: The hint text, i.e. a concatenation of the directTabText, the
 *       emptyParameters and the arrowTabText. The text as inserted into the UI
 *       will include NBSP and Unicode RARR characters, these should be
 *       represented using normal space and '->' for the arrow
 *   - markup: What state should the error markup be in. e.g. 'VVVIIIEEE'
 *   - args: Maps of checks to make against the arguments:
 *     - value: i.e. assignment.value (which ignores defaultValue)
 *     - type: Argument/BlankArgument/MergedArgument/etc i.e. what's assigned
 *             Care should be taken with this since it's something of an
 *             implementation detail
 *     - arg: The toString value of the argument
 *     - status: i.e. assignment.getStatus
 *     - message: i.e. assignment.message
 *     - name: For commands - checks assignment.value.name
 * - exec: Object to indicate we should execute the command and check the
 *     results. Available checks:
 *   - output: A string, RegExp or array of RegExps to compare with the output
 *       If typeof output is a string then the output should be exactly equal
 *       to the given string. If the type of output is a RegExp or array of
 *       RegExps then the output should match all RegExps
 *   - completed: A boolean which declares that we should check to see if the
 *       command completed synchronously
 * - post: Function to be called after the checks have been run
 */
helpers.audit = function(options, audits) {
  checkOptions(options);
  var skipReason = null;
  return util.promiseEach(audits, function(audit) {
    var name = audit.name;
    if (name == null && typeof audit.setup === 'string') {
      name = audit.setup;
    }

    if (assert.testLogging) {
      log('- START \'' + name + '\' in ' + assert.currentTest);
    }

    if (audit.skipRemainingIf) {
      var skipRemainingIf = (typeof audit.skipRemainingIf === 'function') ?
          audit.skipRemainingIf(options) :
          !!audit.skipRemainingIf;
      if (skipRemainingIf) {
        skipReason = audit.skipRemainingIf.name ?
            'due to ' + audit.skipRemainingIf.name :
            '';
        assert.log('Skipped ' + name + ' ' + skipReason);
        return promise.resolve(undefined);
      }
    }

    if (audit.skipIf) {
      var skip = (typeof audit.skipIf === 'function') ?
          audit.skipIf(options) :
          !!audit.skipIf;
      if (skip) {
        var reason = audit.skipIf.name ? 'due to ' + audit.skipIf.name : '';
        assert.log('Skipped ' + name + ' ' + reason);
        return promise.resolve(undefined);
      }
    }

    if (skipReason != null) {
      assert.log('Skipped ' + name + ' ' + skipReason);
      return promise.resolve(undefined);
    }

    var start = new Date().getTime();

    var setupDone = helpers._setup(options, name, audit.setup);
    return setupDone.then(function(chunkLen) {
      if (typeof chunkLen !== 'number') {
        chunkLen = 1;
      }

      // Nasty hack to allow us to auto-skip tests where we're actually testing
      // a key-sequence (i.e. targeting terminal.js) when there is no terminal
      if (chunkLen === -1) {
        assert.log('Skipped ' + name + ' ' + skipReason);
        return promise.resolve(undefined);
      }

      if (assert.currentTest) {
        var responseTime = (new Date().getTime() - start) / chunkLen;
        totalResponseTime += responseTime;
        if (responseTime > maxResponseTime) {
          maxResponseTime = responseTime;
          maxResponseCulprit = assert.currentTest + '/' + name;
        }
        averageOver++;
      }

      var checkDone = helpers._check(options, name, audit.check);
      return checkDone.then(function() {
        var execDone = helpers._exec(options, name, audit.exec);
        return execDone.then(function(data) {
          return helpers._post(name, audit.post, data).then(function() {
            if (assert.testLogging) {
              log('- END \'' + name + '\' in ' + assert.currentTest);
            }
          });
        });
      });
    });
  }).then(function() {
    return (options.terminal == null) ?
        promise.resolve(undefined) :
        options.terminal.setInput('');
  });
};

/**
 * Compare 2 arrays.
 */
helpers.arrayIs = function(actual, expected, message) {
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
 * A quick helper to log to the correct place
 */
function log(message) {
  if (typeof info === 'function') {
    info(message);
  }
  else {
    console.log(message);
  }
}
