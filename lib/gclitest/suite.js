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

  // We need to make sure GCLI is initialized before we begin testing it
  require('gcli/index');

  var examiner = require('test/examiner');

  // It's tempting to want to unify these strings and make addSuite() do the
  // call to require(), however that breaks the build system which looks for
  // the strings passed to require
  examiner.addSuite('gclitest/testCanon', require('gclitest/testCanon'));
  examiner.addSuite('gclitest/testCli', require('gclitest/testCli'));
  examiner.addSuite('gclitest/testCompletion', require('gclitest/testCompletion'));
  examiner.addSuite('gclitest/testExec', require('gclitest/testExec'));
  examiner.addSuite('gclitest/testHelp', require('gclitest/testHelp'));
  examiner.addSuite('gclitest/testHistory', require('gclitest/testHistory'));
  examiner.addSuite('gclitest/testInputter', require('gclitest/testInputter'));
  examiner.addSuite('gclitest/testIntro', require('gclitest/testIntro'));
  examiner.addSuite('gclitest/testJs', require('gclitest/testJs'));
  examiner.addSuite('gclitest/testKeyboard', require('gclitest/testKeyboard'));
  examiner.addSuite('gclitest/testPref', require('gclitest/testPref'));
  examiner.addSuite('gclitest/testRequire', require('gclitest/testRequire'));
  examiner.addSuite('gclitest/testResource', require('gclitest/testResource'));
  examiner.addSuite('gclitest/testScratchpad', require('gclitest/testScratchpad'));
  examiner.addSuite('gclitest/testSettings', require('gclitest/testSettings'));
  examiner.addSuite('gclitest/testSpell', require('gclitest/testSpell'));
  examiner.addSuite('gclitest/testSplit', require('gclitest/testSplit'));
  examiner.addSuite('gclitest/testTokenize', require('gclitest/testTokenize'));
  examiner.addSuite('gclitest/testTooltip', require('gclitest/testTooltip'));
  examiner.addSuite('gclitest/testTypes', require('gclitest/testTypes'));
  examiner.addSuite('gclitest/testUtil', require('gclitest/testUtil'));

  exports.examiner = examiner;
});
