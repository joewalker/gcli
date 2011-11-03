/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  // We need to make sure GCLI is initialized before we begin testing it
  require('gcli/index');

  var examiner = require('test/examiner');

  // It's tempting to want to unify these strings and make addSuite() do the
  // call to require(), however that breaks the build system which looks for
  // the strings passed to require
  examiner.addSuite('gclitest/testTokenize', require('gclitest/testTokenize'));
  examiner.addSuite('gclitest/testSplit', require('gclitest/testSplit'));
  examiner.addSuite('gclitest/testCli', require('gclitest/testCli'));
  examiner.addSuite('gclitest/testHistory', require('gclitest/testHistory'));
  examiner.addSuite('gclitest/testRequire', require('gclitest/testRequire'));
  examiner.addSuite('gclitest/testJs', require('gclitest/testJs'));

  examiner.run();

});
