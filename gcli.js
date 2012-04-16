#!/usr/bin/env node
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.gcliHome = __dirname;

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
