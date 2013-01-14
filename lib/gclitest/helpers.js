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

// A copy of this code exists in firefox mochitests; when updated here, it
// should be updated there too. Hence the use of an exports synonym for non
// AMD contexts.
var helpers = exports;


var Q = require('util/promise');
var util = require('util/util');
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
    });
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
  },

  options: function() {
    return helpers._display.tooltip.field.menu.items.map(function(item) {
      return item.name.textContent ? item.name.textContent : item.name;
    });
  },

  error: function() {
    return helpers._display.tooltip.errorEle.textContent;
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

helpers._createDebugCheck = function() {
  var requisition = helpers._display.requisition;
  var command = requisition.commandAssignment.value;
  var cursor = helpers._actual.cursor();
  var input = helpers._actual.input();
  var padding = Array(input.length + 1).join(' ');

  var hintsPromise = helpers._actual.hints();
  var predictionsPromise = helpers._actual.predictions();

  return util.all(hintsPromise, predictionsPromise).then(function(values) {
    var hints = values[0];
    var predictions = values[1];
    var output = '';

    output += 'helpers.audit([\n';
    output += '  {\n';

    if (cursor === input.length) {
      output += '    setup:    \'' + input + '\',\n';
    }
    else {
      output += '    name: \'' + input + ' (cursor=' + cursor + ')\',\n';
      output += '    setup: function() {\n';
      output += '      return helpers.setInput(\'' + input + '\', ' + cursor + ');\n';
      output += '    },\n';
    }

    output += '    check: {\n';

    output += '      input:  \'' + input + '\',\n';
    output += '      hints:  ' + padding + '\'' + hints + '\',\n';
    output += '      markup: \'' + helpers._actual.markup() + '\',\n';
    output += '      cursor: ' + cursor + ',\n';
    output += '      current: \'' + helpers._actual.current() + '\',\n';
    output += '      status: \'' + helpers._actual.status() + '\',\n';
    output += '      options: ' + outputArray(helpers._actual.options()) + ',\n';
    output += '      error: \'' + helpers._actual.error() + '\',\n';
    output += '      predictions: ' + outputArray(predictions) + ',\n';
    output += '      unassigned: ' + outputArray(requisition._unassigned) + ',\n';
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

    output += '    },\n';
    output += '    exec: {\n';
    output += '      output: \'\',\n';
    output += '      completed: true,\n';
    output += '    }\n';
    output += '  }\n';
    output += ']);';

    return output;
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
 * A list of special key presses and how to to them, for the benefit of
 * helpers.setInput
 */
var ACTIONS = {
  '<TAB>': helpers.pressTab,
  '<RETURN>': helpers.pressReturn,
  '<UP>': function() {
    return helpers.pressKey(38 /*KeyEvent.DOM_VK_UP*/);
  },
  '<DOWN>': function() {
    return helpers.pressKey(40 /*KeyEvent.DOM_VK_DOWN*/);
  }
};

/**
 * Used in helpers.setInput to cut an input string like "blah<TAB>foo<UP>" into
 * an array like [ "blah", "<TAB>", "foo", "<UP>" ].
 * When using this RegExp, you also need to filter out the blank strings.
 */
var CHUNKER = /([^<]*)(<[A-Z]+>)/;

/**
 * Alter the input to <code>typed</code> optionally leaving the cursor at
 * <code>cursor</code>.
 * @return A promise of the number of key-presses to respond
 */
helpers.setInput = function(typed, cursor) {
  var promise = undefined;
  var inputter = helpers._display.inputter;
  // We try to measure average keypress time, but setInput can simulate
  // several, so we try to keep track of how many
  var chunkLen = 1;

  // The easy case is a simple string without things like <TAB>
  if (typed.indexOf('<') === -1) {
    promise = inputter.setInput(typed);
  }
  else {
    // Cut the input up into input strings separated by '<KEY>' tokens. The
    // CHUNKS RegExp leaves blanks so we filter them out.
    var chunks = typed.split(CHUNKER).filter(function(s) {
      return s != '';
    });
    chunkLen = chunks.length + 1;

    // We're working on this in chunks so first clear the input
    promise = inputter.setInput('').then(function() {
      return util.promiseEach(chunks, function(chunk) {
        if (chunk.charAt(0) === '<') {
          var action = ACTIONS[chunk];
          if (typeof action !== 'function') {
            console.error('Known actions: ' + Object.keys(ACTIONS).join());
            throw new Error('Key action not found "' + chunk + '"');
          }
          return action();
        }
        else {
          return inputter.setInput(inputter.element.value + chunk);
        }
      });
    });
  }

  return promise.then(function() {
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
helpers._check = function(name, checks) {
  var outstanding = [];
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
    var hintCheck = function(actualHints) {
      assert.is(actualHints, checks.hints, 'hints' + suffix);
    };
    outstanding.push(helpers._actual.hints().then(hintCheck));
  }

  if ('predictions' in checks) {
    var predictionsCheck = function(actualPredictions) {
      helpers._arrayIs(actualPredictions,
                       checks.predictions,
                       'predictions' + suffix);
    };
    outstanding.push(helpers._actual.predictions().then(predictionsCheck));
  }

  if ('predictionsContains' in checks) {
    var containsCheck = function(actualPredictions) {
      checks.predictionsContains.forEach(function(prediction) {
        var index = actualPredictions.indexOf(prediction);
        assert.ok(index !== -1,
                  'predictionsContains:' + prediction + suffix);
      });
    };
    outstanding.push(helpers._actual.predictions().then(containsCheck));
  }

  if ('unassigned' in checks) {
    helpers._arrayIs(helpers._actual.unassigned(),
                     checks.unassigned,
                     'unassigned' + suffix);
  }

  if ('tooltipState' in checks) {
    assert.is(helpers._actual.tooltipState(),
              checks.tooltipState,
              'tooltipState' + suffix);
  }

  if ('outputState' in checks) {
    assert.is(helpers._actual.outputState(),
              checks.outputState,
              'outputState' + suffix);
  }

  if ('options' in checks) {
    helpers._arrayIs(helpers._actual.options(),
                     checks.options,
                     'options' + suffix);
  }

  if ('error' in checks) {
    assert.is(helpers._actual.error(), checks.error, 'error' + suffix);
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

  return util.all(outstanding).then(function() {
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
helpers._exec = function(name, expected) {
  if (expected == null) {
    return Q.resolve();
  }

  var output = helpers._display.requisition.exec({ hidden: true });

  if ('completed' in expected) {
    assert.is(output.completed,
              expected.completed,
              'output.completed false for: ' + name);
  }

  if (!helpers._options.window.document.createElement) {
    assert.log('skipping output tests (missing doc.createElement) for ' + name);
    return Q.resolve();
  }

  if (!('output' in expected)) {
    return Q.resolve();
  }

  var deferred = Q.defer();

  var checkOutput = function() {
    var div = helpers._options.window.document.createElement('div');
    output.toDom(div);
    var actualOutput = div.textContent.trim();

    var doTest = function(match, against) {
      if (!match.test(against)) {
        assert.ok(false, 'html output for ' + name + ' against ' + match.source);
        console.log('Actual textContent');
        console.log(against);
      }
    };

    if (typeof expected.output === 'string') {
      assert.is(actualOutput,
                expected.output,
                'html output for ' + name);
    }
    else if (Array.isArray(expected.output)) {
      expected.output.forEach(function(match) {
        doTest(match, actualOutput);
      });
    }
    else {
      doTest(expected.output, actualOutput);
    }

    deferred.resolve();
  };

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

  return deferred.promise;
};

/**
 * Helper to setup the test
 */
helpers._setup = function(name, action) {
  if (typeof action === 'string') {
    return helpers.setInput(action);
  }

  if (typeof action === 'function') {
    return Q.resolve(action());
  }

  return Q.reject('setup must be a string or a function');
};

/**
 * Helper to shutdown the test
 */
helpers._post = function(name, action) {
  if (typeof action === 'function') {
    return Q.resolve(action());
  }
  return Q.resolve(action);
};

/*
 * We do some basic response time stats so we can see if we're getting slow
 */
var totalResponseTime = 0;
var averageOver = 0;
var maxResponseTime = 0;
var maxResponseCulprit = undefined;

/**
 * Restart the stats collection process
 */
helpers.resetResponseTimes = function() {
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
 * - exec: (Optional) Execute and check the results. Available checks:
 *   - output: A string, RegExp or array of RegExps to compare with the output
 *       If typeof output is a string then the output should be exactly equal
 *       to the given string. If the type of output is a RegExp or array of
 *       RegExps then the output should match all RegExps
 *   - completed: A boolean which declares that we should check to see if the
 *       command completed synchronously
 * - post: (Optional) function to be called after the checks have been run
 */
helpers.audit = function(audits) {
  return util.promiseEach(audits, function(audit) {
    var name = audit.name;
    if (name == null && typeof audit.setup === 'string') {
      name = audit.setup;
    }

    if (assert.testLogging) {
      console.log('- START \'' + name + '\' in ' + assert.currentTest);
    }

    var start = new Date().getTime();

    var setupDone = helpers._setup(name, audit.setup);
    return setupDone.then(function(chunkLen) {

      if (typeof chunkLen !== 'number') {
        chunkLen = 1;
      }
      var responseTime = (new Date().getTime() - start) / chunkLen;
      totalResponseTime += responseTime;
      if (responseTime > maxResponseTime) {
        maxResponseTime = responseTime;
        maxResponseCulprit = assert.currentTest + '/' + name;
      }
      averageOver++;

      var checkDone = helpers._check(name, audit.check);
      return checkDone.then(function() {
        var execDone = helpers._exec(name, audit.exec);
        return execDone.then(function() {
          return helpers._post(name, audit.post).then(function() {
            if (assert.testLogging) {
              console.log('- END \'' + name + '\' in ' + assert.currentTest);
            }
          });
        });
      });
    });
  }).then(null, function(ex) {
    console.error(ex.stack);
    throw(ex);
  });
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


});
