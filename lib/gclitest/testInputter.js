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


var mockCommands = require('gclitest/mockCommands');
var KeyEvent = require('gcli/util').KeyEvent;

var assert = require('test/assert');

var latestEvent = undefined;
var latestOutput = undefined;
var latestData = undefined;

var outputted = function(ev) {
  function updateData() {
    latestData = latestOutput.data;
  }

  if (latestOutput != null) {
    ev.output.onChange.remove(updateData);
  }

  latestEvent = ev;
  latestOutput = ev.output;

  ev.output.onChange.add(updateData);
};

exports.setup = function(options) {
  options.display.requisition.commandOutputManager.onOutput.add(outputted);
  mockCommands.setup();
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  options.display.requisition.commandOutputManager.onOutput.remove(outputted);
};

exports.testOutput = function(options) {
  latestEvent = undefined;
  latestOutput = undefined;
  latestData = undefined;

  var inputter = options.display.inputter;
  var focusManager = options.display.focusManager;

  inputter.setInput('tss');

  inputter.onKeyDown({
    keyCode: KeyEvent.DOM_VK_RETURN
  });

  assert.is(inputter.element.value, 'tss', 'inputter should do nothing on RETURN keyDown');
  assert.is(latestEvent, undefined, 'no events this test');
  assert.is(latestData, undefined, 'no data this test');

  inputter.onKeyUp({
    keyCode: KeyEvent.DOM_VK_RETURN
  });

  assert.ok(latestEvent != null, 'events this test');
  assert.is(latestData.command.name, 'tss', 'last command is tss');

  assert.is(inputter.element.value, '', 'inputter should exec on RETURN keyUp');

  assert.ok(focusManager._recentOutput, 'recent output happened');

  inputter.onKeyUp({
    keyCode: KeyEvent.DOM_VK_F1
  });

  assert.ok(!focusManager._recentOutput, 'no recent output happened post F1');
  assert.ok(focusManager._helpRequested, 'F1 = help');

  inputter.onKeyUp({
    keyCode: KeyEvent.DOM_VK_ESCAPE
  });

  assert.ok(!focusManager._helpRequested, 'ESCAPE = anti help');

  latestOutput.onClose();
};


});
