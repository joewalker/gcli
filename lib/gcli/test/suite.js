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

'use strict';

// We need to make sure GCLI is initialized before we begin testing it
require('../index');
var examiner = require('../testharness/examiner');

// It's tempting to want to unify these strings and make addSuite() do the
// call to require(), however that breaks the build system which looks for
// the strings passed to require
examiner.addSuite('testAsync', require('./testAsync'));
examiner.addSuite('testCanon', require('./testCanon'));
examiner.addSuite('testCli', require('./testCli'));
examiner.addSuite('testCompletion', require('./testCompletion'));
examiner.addSuite('testContext', require('./testContext'));
examiner.addSuite('testDate', require('./testDate'));
examiner.addSuite('testExec', require('./testExec'));
examiner.addSuite('testFail', require('./testFail'));
examiner.addSuite('testFile', require('./testFile'));
examiner.addSuite('testFileparser', require('./testFileparser'));
examiner.addSuite('testFilesystem', require('./testFilesystem'));
examiner.addSuite('testFocus', require('./testFocus'));
examiner.addSuite('testHelp', require('./testHelp'));
examiner.addSuite('testHistory', require('./testHistory'));
examiner.addSuite('testInputter', require('./testInputter'));
examiner.addSuite('testIncomplete', require('./testIncomplete'));
examiner.addSuite('testIntro', require('./testIntro'));
examiner.addSuite('testJs', require('./testJs'));
examiner.addSuite('testKeyboard1', require('./testKeyboard1'));
examiner.addSuite('testKeyboard2', require('./testKeyboard2'));
examiner.addSuite('testKeyboard3', require('./testKeyboard3'));
examiner.addSuite('testKeyboard4', require('./testKeyboard4'));
examiner.addSuite('testMenu', require('./testMenu'));
examiner.addSuite('testNode', require('./testNode'));
examiner.addSuite('testPref1', require('./testPref1'));
examiner.addSuite('testPref2', require('./testPref2'));
examiner.addSuite('testRemote', require('./testRemote'));
examiner.addSuite('testResource', require('./testResource'));
examiner.addSuite('testSettings', require('./testSettings'));
examiner.addSuite('testShort', require('./testShort'));
examiner.addSuite('testSpell', require('./testSpell'));
examiner.addSuite('testSplit', require('./testSplit'));
examiner.addSuite('testString', require('./testString'));
examiner.addSuite('testTokenize', require('./testTokenize'));
examiner.addSuite('testTooltip', require('./testTooltip'));
examiner.addSuite('testTypes', require('./testTypes'));
examiner.addSuite('testUtil', require('./testUtil'));
