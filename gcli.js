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

/**
 * There are 2 options for loading GCLI CommonJS modules:
 * 1. Use Require's r.js
 * 2. Convert the modules to CommonJS format on the fly.
 *
 * The former feels less hacky, the latter allows us to use 'cover' test
 * coverage. Neither are complex so we've left them both in so they can fight
 * it out.
 */
exports.useUnamd = false;

// Setup the exports.require function to use either:
// - requirejs (through r.js) or
// - node's require (via unamd)
if (exports.useUnamd) {
  var unamd = require('./lib/server/unamd');
  [ 'gcli', 'gclitest', 'test' ].forEach(function(packageName) {
    var srcDir = exports.gcliHome + '/lib/' + packageName;
    var destDir = exports.gcliHome + '/node_modules/' + packageName;
    unamd.unamdize(srcDir, destDir);
  });

  exports.require = require;
}
else {
  // It's tempting to use RequireJS from NPM, however that would break
  // running GCLI in Firefox just by opening index.html
  var requirejs = require('./scripts/r.js');
  requirejs.config({
    nodeRequire: require,
    paths: { 'text': 'scripts/text', 'i18n': 'scripts/i18n' },
    packagePaths: {
      'lib': [
        { name: 'gcli', main: 'index', lib: '.' },
        { name: 'test', main: 'index', lib: '.' },
        { name: 'gclitest', main: 'index', lib: '.' },
        { name: 'demo', main: 'index', lib: '.' },
        { name: 'server', main: 'index', lib: '.' },
        { name: 'util', main: 'index', lib: '.' }
      ]
    }
  });

  exports.require = requirejs;

  // The Firefox build has an override directory to enable custom code, but in
  // NodeJS it's more hacky - we inject into require
  var serverOverride = function(requirePath, nodePath) {
    var host = require(nodePath);
    requirejs.define(requirePath, function(require, exports, module) {
      Object.keys(host).forEach(function(key) {
        exports[key] = host[key];
      });
    });
  };

  serverOverride('util/host', './lib/server/util/host');
  serverOverride('util/filesystem', './lib/server/util/filesystem');
  serverOverride('gcli/types/fileparser', './lib/server/gcli/types/fileparser');
}

exports.require('gcli/index');
var gcli = exports.require('gcli/api').getApi();

// gcli.addItems(exports.require('gcli/commands/connect').items);
gcli.addItems(exports.require('gcli/commands/context').items);
gcli.addItems(exports.require('gcli/commands/exec').items);
gcli.addItems(exports.require('gcli/commands/help').items);
gcli.addItems(exports.require('gcli/commands/intro').items);
gcli.addItems(exports.require('gcli/commands/pref_list').items);
gcli.addItems(exports.require('gcli/commands/pref').items);

gcli.addItems(exports.require('demo/commands/alert').items);
// gcli.addItems(exports.require('demo/commands/bugs').items);
// gcli.addItems(exports.require('demo/commands/demo').items);
gcli.addItems(exports.require('demo/commands/echo').items);
// gcli.addItems(exports.require('demo/commands/edit').items);
// gcli.addItems(exports.require('demo/commands/git').items);
// gcli.addItems(exports.require('demo/commands/hg').items);
gcli.addItems(exports.require('demo/commands/sleep').items);

// Commands using the Node API
gcli.addItems(require('./lib/server/commands/exit').items);
gcli.addItems(require('./lib/server/commands/firefox').items);
gcli.addItems(require('./lib/server/commands/server').items);
gcli.addItems(require('./lib/server/commands/standard').items);
gcli.addItems(require('./lib/server/commands/test').items);
gcli.addItems(require('./lib/server/commands/unamd').items);

var util = exports.require('util/util');
var Requisition = exports.require('gcli/cli').Requisition;
var Status = exports.require('gcli/types').Status;

var jsdom = require('jsdom').jsdom;
var doc = jsdom('<html><head></head><body></body></html>');
var environment = {
  document: doc,
  window: doc.defaultView
};
var requisition = new Requisition(environment, doc);

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
  repl.start('\u00bb ', process, gcliEval, false, true);
}
