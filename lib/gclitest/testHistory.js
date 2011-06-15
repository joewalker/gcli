/* ***** BEGIN LICENSE BLOCK *****
 *
 * TODO
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {

var t = require('test/assert');
var History = require('gcli/ui/history').History;

exports.setup = function() {
};

exports.shutdown = function() {
};

exports.testSimpleHistory = function () {
    var history = new History({});
    history.add('foo');
    history.add('bar');
    t.verifyEqual('bar', history.backward());
    t.verifyEqual('foo', history.backward());

    // Adding to the history again moves us back to the start of the history.
    history.add('quux');
    t.verifyEqual('quux', history.backward());
    t.verifyEqual('bar', history.backward());
    t.verifyEqual('foo', history.backward());
};

exports.testBackwardsPastIndex = function () {
    var history = new History({});
    history.add('foo');
    history.add('bar');
    t.verifyEqual('bar', history.backward());
    t.verifyEqual('foo', history.backward());

    // Moving backwards past recorded history just keeps giving you the last
    // item.
    t.verifyEqual('foo', history.backward());
};

exports.testForwardsPastIndex = function () {
    var history = new History({});
    history.add('foo');
    history.add('bar');
    t.verifyEqual('bar', history.backward());
    t.verifyEqual('foo', history.backward());

    // Going forward through the history again.
    t.verifyEqual('bar', history.forward());

    // 'Present' time.
    t.verifyEqual('', history.forward());

    // Going to the 'future' just keeps giving us the empty string.
    t.verifyEqual('', history.forward());
};

});
