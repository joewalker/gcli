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
var main = require('../../../gcli');

main.require('gcli/test/suite');
var examiner = main.require('gcli/testharness/examiner');
var stati = main.require('gcli/testharness/status').stati;

var Requisition = main.require('gcli/cli').Requisition;
var Terminal = main.require('gcli/ui/terminal').Terminal;
var helpers = main.require('gcli/test/helpers');

exports.items = [
  {
    item: 'command',
    name: 'test',
    description: 'Run GCLI unit tests',
    params: [
      {
        name: 'suite',
        type: {
          name: 'selection',
          lookup: function() {
            return Object.keys(examiner.suites).map(function(name) {
              return { name: name, value: examiner.suites[name] };
            });
          }
        },
        description: 'Test suite to run.',
        defaultValue: examiner
      },
      {
        name: 'nodom',
        type: 'boolean',
        description: 'Run the unit tests without a DOM'
      }
    ],
    returnType: 'terminal',
    noRemote: true,
    exec: function(args, context) {
      var options = {
        isNode: true,
        isHttp: false,
        isFirefox: false,
        isPhantomjs: false,
        isUnamdized: main.useUnamd
      };

      if (args.nodom) {
        options.isNoDom = true;
        options.requisition = new Requisition();

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
          options.window = window;
          options.isJsdom = true;

          var requisition = new Requisition({}, window.document);
          options.requisition = requisition;

          options.terminal = window.terminal = new Terminal({
            requisition: requisition,
            document: window.document
          });

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
