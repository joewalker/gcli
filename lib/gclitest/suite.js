/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  // We need to make sure GCLI is initialized before we begin testing it
  require('gcli/index');

  var examiner = require('test/examiner');

  examiner.addSuite('gclitest/testTokenize', require('gclitest/testTokenize'));
  examiner.addSuite('gclitest/testSplit', require('gclitest/testSplit'));
  examiner.addSuite('gclitest/testCli', require('gclitest/testCli'));
  examiner.addSuite('gclitest/testHistory', require('gclitest/testHistory'));
  examiner.addSuite('gclitest/testRequire', require('gclitest/testRequire'));

  examiner.run();

});
