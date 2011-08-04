/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var t = require('test/assert');


exports.testWorking = function() {
  // There are lots of requirement tests that we could be doing here
  // The fact that we can get anything at all working is a testament to
  // require doing what it should - we don't need to test the
  var requireable = require('gclitest/requirable');
  t.verifyEqual('thing1', requireable.thing1);
  t.verifyEqual(2, requireable.thing2);
  t.verifyUndefined(requireable.thing3);
};

exports.testDomains = function() {
  var requireable = require('gclitest/requirable');
  t.verifyUndefined(requireable.status);
  requireable.setStatus(null);
  t.verifyEqual(null, requireable.getStatus());
  t.verifyUndefined(requireable.status);
  requireable.setStatus('42');
  t.verifyEqual('42', requireable.getStatus());
  t.verifyUndefined(requireable.status);

  if (define.Domain) {
    var domain = new define.Domain();
    var requireable2 = domain.require('gclitest/requirable');
    t.verifyUndefined(requireable2.status);
    t.verifyEqual('initial', requireable2.getStatus());
    requireable2.setStatus(999);
    t.verifyEqual(999, requireable2.getStatus());
    t.verifyUndefined(requireable2.status);

    t.verifyEqual('42', requireable.getStatus());
    t.verifyUndefined(requireable.status);
  }
};

exports.testLeakage = function() {
  var requireable = require('gclitest/requirable');
  t.verifyUndefined(requireable.setup);
  t.verifyUndefined(requireable.shutdown);
  t.verifyUndefined(requireable.testWorking);
};

exports.testMultiImport = function() {
  var r1 = require('gclitest/requirable');
  var r2 = require('gclitest/requirable');
  t.verifyTrue(r1 === r2);
};

exports.testUncompilable = function() {
  // This test is commented out because it breaks the RequireJS module
  // loader and because it causes console output and because testing failure
  // cases such as this is something of a luxury
  // It's not totally clear how a module loader should perform with unusable
  // modules, however at least it should go into a flat spin ...
  // GCLI mini_require reports an error as it should
  /*
  if (define.Domain) {
    try {
      var unrequireable = require('gclitest/unrequirable');
      t.fail();
    }
    catch (ex) {
      console.error(ex);
    }
  }
  */
};

exports.testRecursive = function() {
  // See Bug 658583
  /*
  var recurse = require('gclitest/recurse');
  */
};


});
