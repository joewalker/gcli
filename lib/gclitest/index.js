/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var test = require('test/index');

  test.addSuite('gclitest/testTokenize', require('gclitest/testTokenize'));
  test.addSuite('gclitest/testSplit', require('gclitest/testSplit'));
  test.addSuite('gclitest/testCli', require('gclitest/testCli'));
  test.addSuite('gclitest/testHistory', require('gclitest/testHistory'));

  test.addSuite('gclitest/testRequire', require('gclitest/testRequire'));

  test.run();

});
