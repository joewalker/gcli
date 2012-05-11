/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var express = require('express');
var repl = require('repl');
var jsdom = require('jsdom').jsdom;

var main = require('../../gcli');

var requisition = new (main.require('gcli/cli').Requisition)();

/**
 * Serve '.' to http://localhost:9999/
 * And support a local console
 */
exports.serve = function() {
  var server = express.createServer();
  server.use(express.logger('dev'));
  server.use(express.bodyParser());
  // server.use(express.cookieParser('secret'));
  // server.use(express.session({secret: 'secret', key: 'express.sid'}));
  server.use(express.static(main.gcliHome, { maxAge: 0 }));

  server.listen(9999, 'localhost');
  console.log('Serving GCLI to http://localhost:9999/');

  function gcliEval(command, scope, file, callback) {
    // Why does node wrap the command in '(...)\n'?
    command = command.replace(/^\((.*)\n\)$/, function(all, part) {
      return part;
    });

    if (command.length === 0) {
      callback();
      return;
    }

    var reply = exports.exec(command);
    console.log(reply);

    callback();
  }

  console.log('This is also a limited GCLI prompt. ' +
              'Type \'help\' for a list of commands, CTRL+C twice to exit:');
  repl.start('\u00bb', process, gcliEval, false, true);
};

/**
 * Execute a single command
 */
exports.exec = function(command) {
  var reply;
  try {
    var output = requisition.exec(command);
    reply = output.toString(jsdom());
  }
  catch (ex) {
    reply = ex.message;
    console.error(ex);
  }
  return reply;
};
