/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var test = require('test/assert');
var History = require('gcli/history').History;

exports.setup = function() {
};

exports.shutdown = function() {
};

exports.testSimpleHistory = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Adding to the history again moves us back to the start of the history.
  history.add('quux');
  test.is('quux', history.backward());
  test.is('bar', history.backward());
  test.is('foo', history.backward());
};

exports.testBackwardsPastIndex = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Moving backwards past recorded history just keeps giving you the last
  // item.
  test.is('foo', history.backward());
};

exports.testForwardsPastIndex = function () {
  var history = new History({});
  history.add('foo');
  history.add('bar');
  test.is('bar', history.backward());
  test.is('foo', history.backward());

  // Going forward through the history again.
  test.is('bar', history.forward());

  // 'Present' time.
  test.is('', history.forward());

  // Going to the 'future' just keeps giving us the empty string.
  test.is('', history.forward());
};

});
