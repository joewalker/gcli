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
        { name: 'server', main: 'index', lib: '.' }
      ]
    }
  });

  exports.require = requirejs;
}

exports.require('gcli/index');

// Load the commands defined in Node modules
require('./lib/server/commands/unamd').startup();
require('./lib/server/commands/firefox').startup();
// require('./lib/server/commands/git').startup();
require('./lib/server/commands/make').startup();
require('./lib/server/commands/standard').startup();
require('./lib/server/commands/test').startup();

// Load the commands defined in CommonJS modules
var help = exports.require('gcli/commands/help');
help.startup();
exports.require('gcli/commands/pref').startup();

var fs = require('fs');
help.helpManHtml = fs.readFileSync(exports.gcliHome + '/lib/server/commands/help_man.txt', 'utf8');
help.helpListHtml = fs.readFileSync(exports.gcliHome + '/lib/server/commands/help_list.txt', 'utf8');

// Serve or execute
var server = require('./lib/server/index');
if (process.argv.length < 3) {
  server.serve();
}
else {
  var command = process.argv.slice(2).join(' ');
  var reply = server.exec(command);
  console.log(reply);
}
