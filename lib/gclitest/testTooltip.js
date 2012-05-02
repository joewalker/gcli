/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var test = require('test/assert');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function() {
  mockCommands.setup();
};

exports.shutdown = function() {
  mockCommands.shutdown();
};


function type(typed, tests, options) {
  var inputter = options.display.inputter;
  var tooltip = options.display.tooltip;

  inputter.setInput(typed);
  if (tests.cursor) {
    inputter.setCursor({ start: tests.cursor, end: tests.cursor });
  }

  if (!options.isNode) {
    if (tests.important) {
      test.ok(tooltip.field.isImportant, 'Important for ' + typed);
    }
    else {
      test.ok(!tooltip.field.isImportant, 'Not important for ' + typed);
    }

    if (tests.options) {
      var names = tooltip.field.menu.items.map(function(item) {
        return item.name.textContent ? item.name.textContent : item.name;
      });
      test.is(tests.options.join('|'), names.join('|'), 'Options for ' + typed);
    }

    if (tests.error) {
      test.is(tests.error, tooltip.errorEle.textContent, 'Error for ' + typed);
    }
    else {
      test.is('', tooltip.errorEle.textContent, 'No error for ' + typed);
    }
  }
}

exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping activate tests');
    return;
  }

  if (options.isNode) {
    test.log('Running under Node. Reduced checks due to JSDom.textContent');
  }

  type(' ', { }, options);

  type('tsb ', {
    important: true,
    options: [ 'false', 'true' ]
  }, options);

  type('tsb t', {
    important: true,
    options: [ 'true' ]
  }, options);

  type('tsb tt', {
    important: true,
    options: [ ],
    error: 'Can\'t use \'tt\'.'
  }, options);


  type('asdf', {
    important: false,
    options: [ ],
    error: 'Can\'t use \'asdf\'.'
  }, options);

  type('', { }, options);
};


});
