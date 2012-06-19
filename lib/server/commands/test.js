/*
 * Copyright 2011, Mozilla Foundation and contributors
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

var fs = require('fs');
var jsdom = require('jsdom').jsdom;
var main = require('../../../gcli');
var gcli = main.require('gcli/index');

var Display = main.require('gcli/ui/display').Display;
var gclitest = main.require('gclitest/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(testCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(testCmdSpec);
};

/**
 * 'test' command.
 */
var testCmdSpec = {
  name: 'test',
  description: 'Run GCLI unit tests',
  returnType: 'terminal',
  exec: function(args, context) {
    jsdom.env({
      html: fs.readFileSync(main.gcliHome + '/index.html').toString(),
      src: [
        fs.readFileSync(main.gcliHome + '/scripts/html5-shim.js').toString()
      ],
      features: {
        QuerySelector: true
      },
      done: function(errors, window) {
        var display = new Display({ document: window.document });
        gclitest.run({
          window: window,
          isNode: true,
          detailedResultLog: true,
          display: display,
          isUnamdized: main.useUnamd
        });
      }
    });
  }
};
