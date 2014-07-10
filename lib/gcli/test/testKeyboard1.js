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

var javascript = require('../types/javascript');
var helpers = require('./helpers');

var tempWindow;

exports.setup = function(options) {
  tempWindow = javascript.getGlobalObject();
  javascript.setGlobalObject(options.window);
};

exports.shutdown = function(options) {
  javascript.setGlobalObject(tempWindow);
  tempWindow = undefined;
};

exports.testSimple = function(options) {
  return helpers.audit(options, [
    {
      setup: 'tsela<TAB>',
      check: { input: 'tselarr ', cursor: 8 }
    },
    {
      setup: 'tsn di<TAB>',
      check: { input: 'tsn dif ', cursor: 8 }
    },
    {
      setup: 'tsg a<TAB>',
      check: { input: 'tsg aaa ', cursor: 8 }
    }
  ]);
};

exports.testScript = function(options) {
  return helpers.audit(options, [
    {
      skipIf: function commandJsMissing() {
        return options.requisition.system.commands.get('{') == null;
      },
      setup: '{ wind<TAB>',
      check: { input: '{ window' }
    },
    {
      skipIf: function commandJsMissing() {
        return options.requisition.system.commands.get('{') == null;
      },
      setup: '{ window.docum<TAB>',
      check: { input: '{ window.document' }
    }
  ]);
};

exports.testJsdom = function(options) {
  return helpers.audit(options, [
    {
      skipIf: function jsDomOrCommandJsMissing() {
        return options.requisition.system.commands.get('{') == null;
      },
      setup: '{ window.document.titl<TAB>',
      check: { input: '{ window.document.title ' }
    }
  ]);
};
