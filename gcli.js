#!/usr/bin/env node
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

exports.gcliHome = __dirname;

require('./lib/gcli/index');
var gcli = require('./lib/gcli/api').getApi();

var items = [
  // require('./lib/gcli/commands/connect').items,
  require('./lib/gcli/commands/clear').items,
  require('./lib/gcli/commands/context').items,
  require('./lib/gcli/commands/exec').items,
  require('./lib/gcli/commands/global').items,
  require('./lib/gcli/commands/help').items,
  require('./lib/gcli/commands/intro').items,
  require('./lib/gcli/commands/lang').items,
  require('./lib/gcli/commands/mocks').items,
  require('./lib/gcli/commands/preflist').items,
  require('./lib/gcli/commands/pref').items,
  require('./lib/gcli/commands/test').items,

  require('./lib/gcli/commands/demo/alert').items,
  // require('./lib/gcli/commands/demo/bugs').items,
  // require('./lib/gcli/commands/demo/demo').items,
  require('./lib/gcli/commands/demo/echo').items,
  // require('./lib/gcli/commands/demo/edit').items,
  // require('./lib/gcli/commands/demo/git').items,
  // require('./lib/gcli/commands/demo/hg').items,
  require('./lib/gcli/commands/demo/sleep').items,

  // Commands using the Node API
  require('./lib/gcli/commands/server/exit').items,
  require('./lib/gcli/commands/server/firefox').items,
  require('./lib/gcli/commands/server/orion').items,
  require('./lib/gcli/commands/server/server').items,
  require('./lib/gcli/commands/server/standard').items
].reduce(function(prev, curr) { return prev.concat(curr); }, []);

gcli.addItems(items);

var util = require('./lib/gcli/util/util');
var Requisition = require('./lib/gcli/cli').Requisition;

var requisition = new Requisition();
var command, extraActions;

if (process.argv.length < 3) {
  // No command passed in. Serve GCLI over http and start a local REPL
  command = 'server start';
  extraActions = function(output) {
    if (!output.error) {
      startRepl();
    }
  };
}
else {
  // Command passed in. No server/REPL and a process.exit(1) on failure to
  // propagate test errors
  command = process.argv.slice(2).join(' ');
  extraActions = function(output) {
    if (output.error) {
      process.exit(1);
    }
  };
}

/**
 * Convert an Output object to a string, and then log that to stdout/stderr
 * depending on the error status
 */
function logResults(output) {
  var context = requisition.conversionContext;
  return output.convert('string', context).then(function(message) {
    if (output.error) {
      console.error(message);
    }
    else {
      console.log(message);
    }
    return output;
  });
}

requisition.updateExec(command)
           .then(logResults)
           .then(extraActions)
           .then(null, util.errorHandler);

/**
 * Start a NodeJS REPL to execute commands
 */
function startRepl() {
  var repl = require('repl');

  var gcliEval = function(command, scope, file, callback) {
    // Why does node wrap the command in '(...)\n'?
    command = command.replace(/^\((.*)\n\)$/, function(all, part) {
      return part;
    });

    if (command.length !== 0) {
      requisition.updateExec(command)
                 .then(logResults)
                 .then(
                     function() { callback(); },
                     function(ex) { util.errorHandler(ex); callback(); }
                 );
    }
  };

  console.log('This is also a limited GCLI REPL. ' +
              'Type \'help\' for a list of commands, CTRL+C 3 times to exit:');
  repl.start(': ', process, gcliEval, false, true);
}
