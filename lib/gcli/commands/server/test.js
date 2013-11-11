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

var fs = require('fs');
var jsdom = require('jsdom').jsdom;
var main = require('../../../../gcli');

require('../../test/suite');
var examiner = require('../../testharness/examiner');
var stati = require('../../testharness/status').stati;

var Requisition = require('../../cli').Requisition;
var Terminal = require('../../ui/terminal').Terminal;
var helpers = require('../../test/helpers');
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
        name: 'nodom',
        type: 'boolean',
        description: 'Run the unit tests without a DOM',
        option: true
      }
    ],
    returnType: 'terminal',
    noRemote: true,
    exec: function(args, context) {
      if (args.nodom) {
        var requisition = new Requisition();
        var options = {
          isNode: (typeof(process) !== 'undefined' && process.title === 'node'),
          isHttp: false,
          isFirefox: false,
          isPhantomjs: false,
          isNoDom: true,
          requisition: requisition,
          automator: createRequisitionAutomator(requisition)
        };

        helpers.resetResponseTimes();
        return args.suite.run(options).then(function() {
          var reply = '\n' + examiner.detailedResultLog('NodeJS/NoDom') +
                      '\n' + helpers.timingSummary;

          if (examiner.toRemote().summary.status === stati.pass) {
            return reply;
          }
          else {
            throw reply;
          }
        });
      }

      var deferred = context.defer();
      jsdom.env({
        html: fs.readFileSync(main.gcliHome + '/index.html').toString(),
        src: [ ],
        features: {
          QuerySelector: true
        },
        done: function(errors, window) {
          patchDom(window);

          var requisition = new Requisition({}, window.document);

          Terminal.create({
            requisition: requisition,
            document: window.document
          }).then(function(terminal) {
            window.terminal = terminal;

            var options = {
              isNode: true,
              isHttp: false,
              isFirefox: false,
              isPhantomjs: false,
              isJsdom: true,
              window: window,
              requisition: requisition,
              automator: createTerminalAutomator(terminal)
            };

            helpers.resetResponseTimes();

            args.suite.run(options).then(function() {
              var reply = '\n' + examiner.detailedResultLog('NodeJS/JSDom') +
                          '\n' + helpers.timingSummary;

              if (examiner.toRemote().summary.status === stati.pass) {
                deferred.resolve(reply);
              }
              else {
                deferred.reject(reply);
              }
            });
          });
        }
      });
      return deferred.promise;
    }
  }
];

function patchDom(window) {
  if ('classList' in window.document.documentElement) {
    console.log('test.js may not need patchDom any more');
  }
  else {
    Object.defineProperty(window.HTMLElement.prototype, 'classList', {
      get: function() {
        var self = this;
        function update(fn) {
          return function(value) {
            var classes = self.className.split(/\s+/);
            var index = classes.indexOf(value);
            fn(classes, index, value);
            self.className = classes.join(' ');
          };
        }

        var ret = {
          add: update(function(classes, index, value) {
            if (!~index) { classes.push(value); }
          }),
          remove: update(function(classes, index) {
            if (~index) { classes.splice(index, 1); }
          }),
          toggle: update(function(classes, index, value) {
            if (~index) { classes.splice(index, 1); }
            else { classes.push(value); }
          }),
          contains: function(value) {
            return !!~self.className.split(/\s+/).indexOf(value);
          },
          item: function(i) {
            return self.className.split(/\s+/)[i] || null;
          }
        };

        Object.defineProperty(ret, 'length', {
          get: function() {
            return self.className.split(/\s+/).length;
          }
        });

        return ret;
      }
    });
  }
}
