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

exports.tempTBoolSpec = {
  name: 'tempTBool',
  type: 'boolean',
  description: 'temporary default true boolean',
  defaultValue: true
};
exports.tempTBool = undefined;

var tempFBoolSpec = {
  name: 'tempFBool',
  type: 'boolean',
  description: 'temporary default false boolean',
  defaultValue: false
};
exports.tempFBool = undefined;

var tempUStringSpec = {
  name: 'tempUString',
  type: 'string',
  description: 'temporary default undefined string'
};
exports.tempUString = undefined;

var tempNStringSpec = {
  name: 'tempNString',
  type: 'string',
  description: 'temporary default undefined string',
  defaultValue: null
};
exports.tempNString = undefined;

var tempQStringSpec = {
  name: 'tempQString',
  type: 'string',
  description: 'temporary default "q" string',
  defaultValue: 'q'
};
exports.tempQString = undefined;

var tempNumberSpec = {
  name: 'tempNumber',
  type: 'number',
  description: 'temporary number',
  defaultValue: 42
};
exports.tempNumber = undefined;

var tempSelectionSpec = {
  name: 'tempSelection',
  type: { name: 'selection', data: [ 'a', 'b', 'c' ] },
  description: 'temporary selection',
  defaultValue: 'a'
};
exports.tempSelection = undefined;

/**
 * Registration and de-registration.
 */
exports.setup = function(system) {
  exports.tempTBool = system.settings.add(exports.tempTBoolSpec);
  exports.tempFBool = system.settings.add(tempFBoolSpec);
  exports.tempUString = system.settings.add(tempUStringSpec);
  exports.tempNString = system.settings.add(tempNStringSpec);
  exports.tempQString = system.settings.add(tempQStringSpec);
  exports.tempNumber = system.settings.add(tempNumberSpec);
  exports.tempSelection = system.settings.add(tempSelectionSpec);
};

exports.shutdown = function(system) {
  system.settings.remove(exports.tempTBoolSpec);
  system.settings.remove(tempFBoolSpec);
  system.settings.remove(tempUStringSpec);
  system.settings.remove(tempNStringSpec);
  system.settings.remove(tempQStringSpec);
  system.settings.remove(tempNumberSpec);
  system.settings.remove(tempSelectionSpec);

  exports.tempTBool = undefined;
  exports.tempFBool = undefined;
  exports.tempUString = undefined;
  exports.tempNString = undefined;
  exports.tempQString = undefined;
  exports.tempNumber = undefined;
  exports.tempSelection = undefined;
};
