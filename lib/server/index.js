/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var express = require('express');
var util  = require('util');
var childProcess = require('child_process');
var io = require('socket.io');
var repl = require('repl');
var jsdom = require('jsdom').jsdom;

var build = require('./build');
var main = require('../../node-main');

var requisition = new (main.requirejs('gcli/cli').Requisition)();
var view = new main.requirejs('gcli/ui/view');

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
  server.use('/exec/', execApp);
  server.use('/func/', execFunction);
  server.use(express.static(main.gcliHome, { maxAge: 0 }));

  io.listen(server).sockets.on('connection', function(socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
      console.log(data);
    });
  });

  console.log('Serving GCLI to http://localhost:9999/');
  server.listen(9999, 'localhost');

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
    var outputData = requisition.exec(command);
    reply = view.toString(outputData, jsdom());
  }
  catch (ex) {
    reply = ex.message;
    console.error(ex);
  }
  return reply;
};

/**
 * Express middleware to execute an OS level command
 */
function execApp(request, response, next) {
  var cmd = request.body.cmd;
  var args = request.body.args;
  var options = { cwd: request.body.cwd, env: request.body.env };
  childProcess.execFile(cmd, args, options, function(error, stdout, stderr) {
    var status = error ? 500 : 200;
    var output = error ? error.message : stdout.toString();
    response.writeHead(status, {
      'Content-Length': output.length,
      'Content-Type': 'text/plain'
    });
    response.end(output);
  });
}

/**
 * Express middleware to execute a JS function
 */
function execFunction(request, response, next) {
  var func = request.body.func;
  var args = request.body.args;
  try {
    var reply = exported[func].apply(exported, args);
    var data = reply == null ? '' : JSON.stringify(reply);
    response.writeHead(200, {
      'Content-Length': data.length,
      'Content-Type': 'text/plain'
    });
    response.end(data);
  }
  catch (ex) {
    var reply = JSON.stringify(ex);
    response.writeHead(500, {
      'Content-Length': reply.length,
      'Content-Type': 'text/plain'
    });
    response.end(reply);
  }
}
