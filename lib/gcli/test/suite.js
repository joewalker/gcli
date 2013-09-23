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

// We need to make sure GCLI is initialized before we begin testing it
require('gcli/index');
var examiner = require('gcli/testharness/examiner');

// It's tempting to want to unify these strings and make addSuite() do the
// call to require(), however that breaks the build system which looks for
// the strings passed to require
examiner.addSuite('gcli/test/testAsync', require('gcli/test/testAsync'));
examiner.addSuite('gcli/test/testCanon', require('gcli/test/testCanon'));
examiner.addSuite('gcli/test/testCli', require('gcli/test/testCli'));
examiner.addSuite('gcli/test/testCompletion', require('gcli/test/testCompletion'));
examiner.addSuite('gcli/test/testContext', require('gcli/test/testContext'));
examiner.addSuite('gcli/test/testDate', require('gcli/test/testDate'));
examiner.addSuite('gcli/test/testExec', require('gcli/test/testExec'));
examiner.addSuite('gcli/test/testFail', require('gcli/test/testFail'));
examiner.addSuite('gcli/test/testFile', require('gcli/test/testFile'));
examiner.addSuite('gcli/test/testFileparser', require('gcli/test/testFileparser'));
examiner.addSuite('gcli/test/testFilesystem', require('gcli/test/testFilesystem'));
examiner.addSuite('gcli/test/testFocus', require('gcli/test/testFocus'));
examiner.addSuite('gcli/test/testHelp', require('gcli/test/testHelp'));
examiner.addSuite('gcli/test/testHistory', require('gcli/test/testHistory'));
examiner.addSuite('gcli/test/testInputter', require('gcli/test/testInputter'));
examiner.addSuite('gcli/test/testIncomplete', require('gcli/test/testIncomplete'));
examiner.addSuite('gcli/test/testIntro', require('gcli/test/testIntro'));
examiner.addSuite('gcli/test/testJs', require('gcli/test/testJs'));
examiner.addSuite('gcli/test/testKeyboard1', require('gcli/test/testKeyboard1'));
examiner.addSuite('gcli/test/testKeyboard2', require('gcli/test/testKeyboard2'));
examiner.addSuite('gcli/test/testKeyboard3', require('gcli/test/testKeyboard3'));
examiner.addSuite('gcli/test/testMenu', require('gcli/test/testMenu'));
examiner.addSuite('gcli/test/testNode', require('gcli/test/testNode'));
examiner.addSuite('gcli/test/testPref', require('gcli/test/testPref'));
examiner.addSuite('gcli/test/testRemote', require('gcli/test/testRemote'));
examiner.addSuite('gcli/test/testRequire', require('gcli/test/testRequire'));
examiner.addSuite('gcli/test/testResource', require('gcli/test/testResource'));
examiner.addSuite('gcli/test/testSettings', require('gcli/test/testSettings'));
examiner.addSuite('gcli/test/testShort', require('gcli/test/testShort'));
examiner.addSuite('gcli/test/testSpell', require('gcli/test/testSpell'));
examiner.addSuite('gcli/test/testSplit', require('gcli/test/testSplit'));
examiner.addSuite('gcli/test/testString', require('gcli/test/testString'));
examiner.addSuite('gcli/test/testTokenize', require('gcli/test/testTokenize'));
examiner.addSuite('gcli/test/testTooltip', require('gcli/test/testTooltip'));
examiner.addSuite('gcli/test/testTypes', require('gcli/test/testTypes'));
examiner.addSuite('gcli/test/testUtil', require('gcli/test/testUtil'));

});
