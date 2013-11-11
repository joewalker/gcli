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

require('../../test/suite');

var examiner = require('../../testharness/examiner');
var stati = require('../../testharness/status').stati;
var helpers = require('../../test/helpers');
var Requisition = require('../../cli').Requisition;
var createRequisitionAutomator = require('../../test/automators/requisition').createRequisitionAutomator;
var createTerminalAutomator = require('../../test/automators/terminal').createTerminalAutomator;

exports.items = [
  {
    item: 'type',
    name: 'suite',
    parent: 'selection',
    cacheable: true,
    lookup: function() {
      return Object.keys(examiner.suites).map(function(name) {
        return { name: name, value: examiner.suites[name] };
      });
    }
  },
  {
    item: 'command',
    name: 'test',
    description: 'Run GCLI unit tests',
    params: [
      {
        name: 'suite',
        type: 'suite',
        description: 'Test suite to run.',
        defaultValue: examiner
      },
      {
        name: 'usehost',
        type: 'boolean',
        description: 'Run the unit tests in the host window',
        option: true
      }
    ],
    returnType: 'examiner-output',
    noRemote: true,
    exec: function(args, context) {
      if (args.usehost && typeof window === 'undefined') {
        throw new Error('Can\'t use --usehost without a parent window');
      }

      var requisition = args.usehost ?
                        new Requisition({}, window.document) :
                        new Requisition();

      var options = {
        isNode: (typeof(process) !== 'undefined' && process.title === 'node'),
        isHttp: false,
        isFirefox: false,
        isPhantomjs: false,
        requisition: requisition
      };

      if (!args.usehost) {
        options.isNoDom = true;
        options.automator = createRequisitionAutomator(requisition);
      }
      else {
        options.window = window;
        options.isNoDom = false;
        options.automator = createTerminalAutomator(window.terminal);
      }

      helpers.resetResponseTimes();
      examiner.reset();

      return args.suite.run(options).then(function() {
        return examiner.toRemote();
      });
    }
  },
  {
    item: 'converter',
    from: 'examiner-output',
    to: 'string',
    exec: function(output, conversionContext) {
      var reply = '\n' + examiner.detailedResultLog('NodeJS/NoDom') +
                  '\n' + helpers.timingSummary;

      if (output.summary.status === stati.pass) {
        return reply;
      }
      else {
        throw reply;
      }
    }
  }
];
