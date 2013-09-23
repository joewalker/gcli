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

var assert = require('../testharness/assert');
var mockSettings = require('./mockSettings');
var settings = require('../settings');

exports.setup = function(options) {
  if (!options.isFirefox) {
    mockSettings.setup();
  }
};

exports.shutdown = function(options) {
  if (!options.isFirefox) {
    mockSettings.shutdown();
  }
};

exports.register = function() {
  assert.is(settings.getSetting('tempTBool'),
            mockSettings.tempTBool,
            'tempTBool exists before');

  settings.removeSetting(mockSettings.tempTBoolSpec);
  assert.is(settings.getSetting('tempTBool'),
            undefined,
            'tempTBool remove by obj');

  mockSettings.tempTBool = settings.addSetting(mockSettings.tempTBoolSpec);
  assert.is(settings.getSetting('tempTBool'),
            mockSettings.tempTBool,
            'tempTBool re-added 1');

  settings.removeSetting('tempTBool');
  assert.is(settings.getSetting('tempTBool'),
            undefined,
            'tempTBool remove by name');

  mockSettings.tempTBool = settings.addSetting(mockSettings.tempTBoolSpec);
  assert.is(settings.getSetting('tempTBool'),
            mockSettings.tempTBool,
            'tempTBool re-added 2');
};

exports.testChange = function(options) {
  if (options.isFirefox) {
    assert.log('Skipping testPref in Firefox.');
    return;
  }

  mockSettings.tempTBool.setDefault();
  mockSettings.tempFBool.setDefault();
  mockSettings.tempUString.setDefault();
  mockSettings.tempNString.setDefault();
  mockSettings.tempQString.setDefault();
  mockSettings.tempNumber.setDefault();
  mockSettings.tempSelection.setDefault();

  assert.is(mockSettings.tempTBool.value, true, 'tempTBool default');
  assert.is(mockSettings.tempFBool.value, false, 'tempFBool default');
  assert.is(mockSettings.tempUString.value, undefined, 'tempUString default');
  assert.is(mockSettings.tempNString.value, null, 'tempNString default');
  assert.is(mockSettings.tempQString.value, 'q', 'tempQString default');
  assert.is(mockSettings.tempNumber.value, 42, 'tempNumber default');
  assert.is(mockSettings.tempSelection.value, 'a', 'tempSelection default');

  function tempTBoolCheck(ev) {
    assert.is(ev.setting, mockSettings.tempTBool, 'tempTBool event setting');
    assert.is(ev.value, false, 'tempTBool event value');
    assert.is(ev.setting.value, false, 'tempTBool event setting value');
  }
  mockSettings.tempTBool.onChange.add(tempTBoolCheck);
  mockSettings.tempTBool.value = false;
  assert.is(mockSettings.tempTBool.value, false, 'tempTBool change');

  function tempFBoolCheck(ev) {
    assert.is(ev.setting, mockSettings.tempFBool, 'tempFBool event setting');
    assert.is(ev.value, true, 'tempFBool event value');
    assert.is(ev.setting.value, true, 'tempFBool event setting value');
  }
  mockSettings.tempFBool.onChange.add(tempFBoolCheck);
  mockSettings.tempFBool.value = true;
  assert.is(mockSettings.tempFBool.value, true, 'tempFBool change');

  function tempUStringCheck(ev) {
    assert.is(ev.setting, mockSettings.tempUString, 'tempUString event setting');
    assert.is(ev.value, 'x', 'tempUString event value');
    assert.is(ev.setting.value, 'x', 'tempUString event setting value');
  }
  mockSettings.tempUString.onChange.add(tempUStringCheck);
  mockSettings.tempUString.value = 'x';
  assert.is(mockSettings.tempUString.value, 'x', 'tempUString change');

  function tempNStringCheck(ev) {
    assert.is(ev.setting, mockSettings.tempNString, 'tempNString event setting');
    assert.is(ev.value, 'y', 'tempNString event value');
    assert.is(ev.setting.value, 'y', 'tempNString event setting value');
  }
  mockSettings.tempNString.onChange.add(tempNStringCheck);
  mockSettings.tempNString.value = 'y';
  assert.is(mockSettings.tempNString.value, 'y', 'tempNString change');

  function tempQStringCheck(ev) {
    assert.is(ev.setting, mockSettings.tempQString, 'tempQString event setting');
    assert.is(ev.value, 'qq', 'tempQString event value');
    assert.is(ev.setting.value, 'qq', 'tempQString event setting value');
  }
  mockSettings.tempQString.onChange.add(tempQStringCheck);
  mockSettings.tempQString.value = 'qq';
  assert.is(mockSettings.tempQString.value, 'qq', 'tempQString change');

  function tempNumberCheck(ev) {
    assert.is(ev.setting, mockSettings.tempNumber, 'tempNumber event setting');
    assert.is(ev.value, -1, 'tempNumber event value');
    assert.is(ev.setting.value, -1, 'tempNumber event setting value');
  }
  mockSettings.tempNumber.onChange.add(tempNumberCheck);
  mockSettings.tempNumber.value = -1;
  assert.is(mockSettings.tempNumber.value, -1, 'tempNumber change');

  function tempSelectionCheck(ev) {
    assert.is(ev.setting, mockSettings.tempSelection, 'tempSelection event setting');
    assert.is(ev.value, 'b', 'tempSelection event value');
    assert.is(ev.setting.value, 'b', 'tempSelection event setting value');
  }
  mockSettings.tempSelection.onChange.add(tempSelectionCheck);
  mockSettings.tempSelection.value = 'b';
  assert.is(mockSettings.tempSelection.value, 'b', 'tempSelection change');

  mockSettings.tempTBool.onChange.remove(tempTBoolCheck);
  mockSettings.tempFBool.onChange.remove(tempFBoolCheck);
  mockSettings.tempUString.onChange.remove(tempUStringCheck);
  mockSettings.tempNString.onChange.remove(tempNStringCheck);
  mockSettings.tempQString.onChange.remove(tempQStringCheck);
  mockSettings.tempNumber.onChange.remove(tempNumberCheck);
  mockSettings.tempSelection.onChange.remove(tempSelectionCheck);

  function tempNStringReCheck(ev) {
    assert.is(ev.setting, mockSettings.tempNString, 'tempNString event reset');
    assert.is(ev.value, null, 'tempNString event revalue');
    assert.is(ev.setting.value, null, 'tempNString event setting revalue');
  }
  mockSettings.tempNString.onChange.add(tempNStringReCheck);

  mockSettings.tempTBool.setDefault();
  mockSettings.tempFBool.setDefault();
  mockSettings.tempUString.setDefault();
  mockSettings.tempNString.setDefault();
  mockSettings.tempQString.setDefault();
  mockSettings.tempNumber.setDefault();
  mockSettings.tempSelection.setDefault();

  mockSettings.tempNString.onChange.remove(tempNStringReCheck);

  assert.is(mockSettings.tempTBool.value, true, 'tempTBool reset');
  assert.is(mockSettings.tempFBool.value, false, 'tempFBool reset');
  assert.is(mockSettings.tempUString.value, undefined, 'tempUString reset');
  assert.is(mockSettings.tempNString.value, null, 'tempNString reset');
  assert.is(mockSettings.tempQString.value, 'q', 'tempQString reset');
  assert.is(mockSettings.tempNumber.value, 42, 'tempNumber reset');
  assert.is(mockSettings.tempSelection.value, 'a', 'tempSelection reset');
};


});
