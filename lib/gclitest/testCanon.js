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

  var helpers = require('gclitest/helpers');
  var canon = require('gcli/canon');
  var test = require('test/assert');

  exports.testAddRemove = function(options) {
    var startCount = canon.getCommands().length;
    var events = 0;

    var canonChange = function(ev) {
      events++;
    };
    canon.onCanonChange.add(canonChange);

    canon.addCommand({
      name: 'testadd',
      exec: function() {
        return 1;
      }
    });

    test.is(canon.getCommands().length, startCount + 1, 'add command success');
    test.is(events, 1, 'add event');
    helpers.exec(options, {
      typed: 'testadd',
      outputMatch: /^1$/
    });

    canon.addCommand({
      name: 'testadd',
      exec: function() {
        return 2;
      }
    });

    test.is(canon.getCommands().length, startCount + 1, 'readd command success');
    test.is(events, 2, 'readd event');
    helpers.exec(options, {
      typed: 'testadd',
      outputMatch: /^2$/
    });

    canon.removeCommand('testadd');

    test.is(canon.getCommands().length, startCount, 'remove command success');
    test.is(events, 3, 'remove event');
    helpers.status(options, {
      typed: 'testadd',
      status: 'ERROR'
    });

    canon.addCommand({
      name: 'testadd',
      exec: function() {
        return 3;
      }
    });

    test.is(canon.getCommands().length, startCount + 1, 'rereadd command success');
    test.is(events, 4, 'rereadd event');
    helpers.exec(options, {
      typed: 'testadd',
      outputMatch: /^3$/
    });

    canon.removeCommand({
      name: 'testadd'
    });

    test.is(canon.getCommands().length, startCount, 'reremove command success');
    test.is(events, 5, 'reremove event');
    helpers.status(options, {
      typed: 'testadd',
      status: 'ERROR'
    });

    canon.removeCommand({ name: 'nonexistant' });
    test.is(canon.getCommands().length, startCount, 'nonexistant1 command success');
    test.is(events, 5, 'nonexistant1 event');

    canon.removeCommand('nonexistant');
    test.is(canon.getCommands().length, startCount, 'nonexistant2 command success');
    test.is(events, 5, 'nonexistant2 event');

    canon.onCanonChange.remove(canonChange);
  };

});
