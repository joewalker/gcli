/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var mockSettings = require('gclitest/mockSettings');
var test = require('test/assert');


exports.setup = function() {
  mockSettings.setup();
};

exports.shutdown = function() {
  mockSettings.shutdown();
};

exports.testChange = function() {
  mockSettings.tempTBool.setDefault();
  mockSettings.tempFBool.setDefault();
  mockSettings.tempUString.setDefault();
  mockSettings.tempNString.setDefault();
  mockSettings.tempQString.setDefault();
  mockSettings.tempNumber.setDefault();
  mockSettings.tempSelection.setDefault();

  test.is(mockSettings.tempTBool.value, true, 'tempTBool default');
  test.is(mockSettings.tempFBool.value, false, 'tempFBool default');
  test.is(mockSettings.tempUString.value, undefined, 'tempUString default');
  test.is(mockSettings.tempNString.value, null, 'tempNString default');
  test.is(mockSettings.tempQString.value, 'q', 'tempQString default');
  test.is(mockSettings.tempNumber.value, 42, 'tempNumber default');
  test.is(mockSettings.tempSelection.value, 'a', 'tempSelection default');

  function tempTBoolCheck(ev) {
    test.is(ev.setting, mockSettings.tempTBool, 'tempTBool event setting');
    test.is(ev.value, false, 'tempTBool event value');
    test.is(ev.setting.value, false, 'tempTBool event setting value');
  }
  mockSettings.tempTBool.onChange.add(tempTBoolCheck);
  mockSettings.tempTBool.value = false;
  test.is(mockSettings.tempTBool.value, false, 'tempTBool change');

  function tempFBoolCheck(ev) {
    test.is(ev.setting, mockSettings.tempFBool, 'tempFBool event setting');
    test.is(ev.value, true, 'tempFBool event value');
    test.is(ev.setting.value, true, 'tempFBool event setting value');
  }
  mockSettings.tempFBool.onChange.add(tempFBoolCheck);
  mockSettings.tempFBool.value = true;
  test.is(mockSettings.tempFBool.value, true, 'tempFBool change');

  function tempUStringCheck(ev) {
    test.is(ev.setting, mockSettings.tempUString, 'tempUString event setting');
    test.is(ev.value, 'x', 'tempUString event value');
    test.is(ev.setting.value, 'x', 'tempUString event setting value');
  }
  mockSettings.tempUString.onChange.add(tempUStringCheck);
  mockSettings.tempUString.value = 'x';
  test.is(mockSettings.tempUString.value, 'x', 'tempUString change');

  function tempNStringCheck(ev) {
    test.is(ev.setting, mockSettings.tempNString, 'tempNString event setting');
    test.is(ev.value, 'y', 'tempNString event value');
    test.is(ev.setting.value, 'y', 'tempNString event setting value');
  }
  mockSettings.tempNString.onChange.add(tempNStringCheck);
  mockSettings.tempNString.value = 'y';
  test.is(mockSettings.tempNString.value, 'y', 'tempNString change');

  function tempQStringCheck(ev) {
    test.is(ev.setting, mockSettings.tempQString, 'tempQString event setting');
    test.is(ev.value, 'qq', 'tempQString event value');
    test.is(ev.setting.value, 'qq', 'tempQString event setting value');
  }
  mockSettings.tempQString.onChange.add(tempQStringCheck);
  mockSettings.tempQString.value = 'qq';
  test.is(mockSettings.tempQString.value, 'qq', 'tempQString change');

  function tempNumberCheck(ev) {
    test.is(ev.setting, mockSettings.tempNumber, 'tempNumber event setting');
    test.is(ev.value, -1, 'tempNumber event value');
    test.is(ev.setting.value, -1, 'tempNumber event setting value');
  }
  mockSettings.tempNumber.onChange.add(tempNumberCheck);
  mockSettings.tempNumber.value = -1;
  test.is(mockSettings.tempNumber.value, -1, 'tempNumber change');

  function tempSelectionCheck(ev) {
    test.is(ev.setting, mockSettings.tempSelection, 'tempSelection event setting');
    test.is(ev.value, 'b', 'tempSelection event value');
    test.is(ev.setting.value, 'b', 'tempSelection event setting value');
  }
  mockSettings.tempSelection.onChange.add(tempSelectionCheck);
  mockSettings.tempSelection.value = 'b';
  test.is(mockSettings.tempSelection.value, 'b', 'tempSelection change');

  mockSettings.tempTBool.onChange.remove(tempTBoolCheck);
  mockSettings.tempFBool.onChange.remove(tempFBoolCheck);
  mockSettings.tempUString.onChange.remove(tempUStringCheck);
  mockSettings.tempNString.onChange.remove(tempNStringCheck);
  mockSettings.tempQString.onChange.remove(tempQStringCheck);
  mockSettings.tempNumber.onChange.remove(tempNumberCheck);
  mockSettings.tempSelection.onChange.remove(tempSelectionCheck);

  function tempNStringReCheck(ev) {
    test.is(ev.setting, mockSettings.tempNString, 'tempNString event reset');
    test.is(ev.value, null, 'tempNString event revalue');
    test.is(ev.setting.value, null, 'tempNString event setting revalue');
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

  test.is(mockSettings.tempTBool.value, true, 'tempTBool reset');
  test.is(mockSettings.tempFBool.value, false, 'tempFBool reset');
  test.is(mockSettings.tempUString.value, undefined, 'tempUString reset');
  test.is(mockSettings.tempNString.value, null, 'tempNString reset');
  test.is(mockSettings.tempQString.value, 'q', 'tempQString reset');
  test.is(mockSettings.tempNumber.value, 42, 'tempNumber reset');
  test.is(mockSettings.tempSelection.value, 'a', 'tempSelection reset');
};


});
