/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var util = require('gcli/util');
var test = require('test/assert');

exports.testFindCssSelector = function(options) {
  if (options.window.isFake) {
    console.log('Skipping dom.findCssSelector tests due to window.isFake');
    return;
  }

  var nodes = options.window.document.querySelectorAll('*');
  for (var i = 0; i < nodes.length; i++) {
    var selector = util.findCssSelector(nodes[i]);
    var matches = options.window.document.querySelectorAll(selector);

    test.is(matches.length, 1, 'multiple matches for ' + selector);
    test.is(matches[0], nodes[i], 'non-matching selector: ' + selector);
  }
};


});
