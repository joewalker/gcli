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
  // It's tempting to use RequireJS from npm, however that would break
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

  // The Mozilla build has an override directory, to enable custom code for
  // a platform, but in node it's more hacky - we inject into require
  var host = require('./lib/server/util/host');
  requirejs.define('util/host', function(require, exports, module) {
    Object.keys(host).forEach(function(key) {
      exports[key] = host[key];
    });
  });

  var fs = require('fs');
  var helpManHtml = fs.readFileSync(exports.gcliHome + '/lib/server/gcli/commands/help_man.html', 'utf8');
  var helpListHtml = fs.readFileSync(exports.gcliHome + '/lib/server/gcli/commands/help_list.html', 'utf8');
  requirejs.define('text!gcli/commands/help_man.html', helpManHtml);
  requirejs.define('text!gcli/commands/help_list.html', helpListHtml);
}

exports.require('gcli/index');

// Load the commands defined in Node modules
require('./lib/server/commands/basic').startup();
require('./lib/server/commands/firefox').startup();
require('./lib/server/commands/make').startup();
require('./lib/server/commands/server').startup();
require('./lib/server/commands/standard').startup();
require('./lib/server/commands/test').startup();
require('./lib/server/commands/unamd').startup();

// Load the commands defined in CommonJS modules
exports.require('gcli/commands/context').startup();
exports.require('gcli/commands/exec').startup();
exports.require('gcli/commands/help').startup();
exports.require('gcli/commands/intro').startup();
exports.require('gcli/commands/pref').startup();

// Serve or execute
var server = require('./lib/server/index');
var onSuccess, onError, command;

if (process.argv.length < 3) {
  // No command passed in. Serve GCLI over http and start a local REPL
  command = 'server start';
  onSuccess = function(message) {
    console.log(message);
    startRepl();
  };
  onFailure = function(message) {
    console.error(message);
  };
}
else {
  // Command passed in. No server/REPL and a process.exit(1) on failure to
  // propagate test errors
  command = process.argv.slice(2).join(' ');
  onSuccess = function(message) {
    console.log(message);
  };
  onFailure = function(message) {
    console.error(message);
    process.exit(1);
  };
}

server.exec(command).then(onSuccess, onFailure);

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
      var onSuccess = function(message) {
        console.log(message);
        callback();
      }
      var onError = function(message) {
        console.error(message);
        callback();
      }

      server.exec(command).then(onSuccess, onError);
    }
  };

  console.log('This is also a limited GCLI REPL. ' +
              'Type \'help\' for a list of commands, CTRL+C 3 times to exit:');
  repl.start('\u00bb ', process, gcliEval, false, true);
}
