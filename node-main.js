/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

exports.gcliHome = __dirname;

var fs = require('fs');

// It's tempting to use RequireJS from npm, however that would break
// running GCLI in Firefox just by opening index.html
exports.requirejs = require('./scripts/r.js');
exports.requirejs.config({
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

exports.requirejs('gcli/index');
var help = exports.requirejs('gcli/commands/help');
help.startup();
exports.requirejs('gcli/commands/pref').startup();
exports.requirejs('test/commands').startup();
require('./lib/server/commands').startup();

help.helpManHtml = fs.readFileSync(exports.gcliHome + '/lib/server/help_man.txt', 'utf8');
help.helpListHtml = fs.readFileSync(exports.gcliHome + '/lib/server/help_list.txt', 'utf8');

var server = require('./lib/server/index');

if (process.argv.length < 3) {
  server.serve();
}
else {
  var command = process.argv.slice(2).join(' ');
  var reply = server.exec(command);
  console.log(reply);
}
