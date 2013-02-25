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

var express = require('express');
var repl = require('repl');
var jsdom = require('jsdom').jsdom;

var main = require('../../gcli');

var requisition = new (main.require('gcli/cli').Requisition)();
var Status = main.require('gcli/types').Status;

/**
 * Serve '.' to http://localhost:9999/
 * And support a local console
 */
exports.serve = function() {
  var server = express();
  server.use(express.logger('dev'));
  server.use(express.static(main.gcliHome));

  server.on('error', function(error) {
    console.log(error);
    startRepl();
  });
  server.listen(9999, 'localhost', undefined, function() {
    console.log('Serving GCLI to http://localhost:9999/');
    startRepl();
  });
};

function startRepl() {
  var gcliEval = function(command, scope, file, callback) {
    // Why does node wrap the command in '(...)\n'?
    command = command.replace(/^\((.*)\n\)$/, function(all, part) {
      return part;
    });

    if (command.length !== 0) {
      exports.exec(command, function(message, isError) {
        console.log(message);
        callback();
      });
    }
  };

  console.log('This is also a limited GCLI REPL. ' +
              'Type \'help\' for a list of commands, CTRL+C 3 times to exit:');
  repl.start('\u00bb ', process, gcliEval, false, true);
};

/**
 * Utility to call requisition.update and requisition.exec properly
 */
exports.exec = function(command, onExec) {
  requisition.update(command).then(function() {
    if (requisition.getStatus() !== Status.VALID) {
      onExec('Invalid command "' + command + "'", true);
    }
    else {
      var output = requisition.exec();
      function display() {
        onExec(output.toString(jsdom()), output.error);
      };
      output.then(display, display);
    }
  }).then(null, console.error);
};
