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

// Patch Node to be more like a browser
global.URL = require('dom-urls');
require('jsdom-global')();

global.staticRequire = function(requistingModule, name) {
  return new Promise(function(resolve, reject) {
    const path = require('path');
    const parent = path.dirname(requistingModule.id);
    const filename = parent + '/' + name;

    const fs = require('fs');
    fs.readFile(filename, { encoding: 'utf8' }, function(err, data) {
      if (err) {
        reject(err);
      }

      resolve(data);
    });
  });
};

const system = require('./lib/gcli/system').createSystem();

const items = [
  require('./lib/gcli/items/basic').items,
  require('./lib/gcli/items/ui').items,
  require('./lib/gcli/items/remote').items,
  require('./lib/gcli/items/standard').items,
  require('./lib/gcli/items/demo').items,
  require('./lib/gcli/items/server').items,

].reduce((prev, curr)  => prev.concat(curr), []);

system.addItems(items);

const util = require('./lib/gcli/util/util');
const Requisition = require('./lib/gcli/cli').Requisition;

const environment = {
  document: document,
  window: window
};

const requisition = new Requisition(system, { environment: environment });
let command, extraActions;

if (process.argv.length < 3) {
  // No command passed in. Serve GCLI over http and start a local REPL
  command = 'server start';
  extraActions = output => {
    if (!output.error) {
      startRepl();
    }
  };
}
else {
  // Command passed in. No server/REPL and a process.exit(1) on failure to
  // propagate test errors
  command = process.argv.slice(2).join(' ');
  extraActions = output => {
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
  const context = requisition.conversionContext;
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
           .catch(util.errorHandler);

/**
 * Start a NodeJS REPL to execute commands
 */
function startRepl() {
  const repl = require('repl');

  const gcliEval = function(command, scope, file, callback) {
    // Why does node wrap the command in '(...)\n'?
    command = command.replace(/^\((.*)\n\)$/, function(all, part) {
      return part;
    });

    if (command.length !== 0) {
      requisition.updateExec(command)
                 .then(logResults)
                 .then(function() { callback(); })
                 .catch(function(ex) { util.errorHandler(ex); callback(); });
    }
  };

  console.log('This is also a limited GCLI REPL. ' +
              'Type \'help\' for a list of commands, CTRL+C 3 times to exit:');
  repl.start(': ', process, gcliEval, false, true);
}
