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

'use strict';

var assert = require('gcli/testharness/assert');

exports.testWorking = function(options) {
  // There are lots of requirement tests that we could be doing here
  // The fact that we can get anything at all working is a testament to
  // require doing what it should - we don't need to test the
  var requireable = require('gcli/test/requirable');
  assert.is(requireable.thing1, 'thing1');
  assert.is(requireable.thing2, 2);
  assert.ok(requireable.thing3 === undefined);
};

exports.testDomains = function(options) {
  var requireable = require('gcli/test/requirable');
  assert.ok(requireable.status === undefined);
  requireable.setStatus(null);
  assert.is(requireable.getStatus(), null);
  assert.ok(requireable.status === undefined);
  requireable.setStatus('42');
  assert.is(requireable.getStatus(), '42');
  assert.ok(requireable.status === undefined);

  if (options.isUnamdized) {
    assert.log('Running unamdized, Reduced tests');
    return;
  }

  if (define.Domain) {
    var domain = new define.Domain();
    var requireable2 = domain.require('gcli/test/requirable');
    assert.is(requireable2.status, undefined);
    assert.is(requireable2.getStatus(), 'initial');
    requireable2.setStatus(999);
    assert.is(requireable2.getStatus(), 999);
    assert.is(requireable2.status, undefined);

    assert.is(requireable.getStatus(), '42');
    assert.is(requireable.status, undefined);
  }
};

exports.testLeakage = function(options) {
  var requireable = require('gcli/test/requirable');
  assert.ok(requireable.setup === undefined);
  assert.ok(requireable.shutdown === undefined);
  assert.ok(requireable.testWorking === undefined);
};

exports.testMultiImport = function(options) {
  var r1 = require('gcli/test/requirable');
  var r2 = require('gcli/test/requirable');
  assert.is(r1, r2);
};

exports.testUncompilable = function(options) {
  // This test is commented out because it breaks the RequireJS module
  // loader and because it causes console output and because testing failure
  // cases such as this is something of a luxury
  // It's not totally clear how a module loader should perform with unusable
  // modules, however at least it should go into a flat spin ...
  // GCLI mini_require reports an error as it should
  /*
  if (define.Domain) {
    try {
      var unrequireable = require('gcli/test/unrequirable');
      t.fail();
    }
    catch (ex) {
      console.error(ex);
    }
  }
  */
};

exports.testRecursive = function(options) {
  // See Bug 658583
  /*
  var recurse = require('gcli/test/recurse');
  */
};


});
