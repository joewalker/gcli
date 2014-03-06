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

var util = require('../../util/util');
var promise = require('../../util/promise');
var Remoter = require('../../connectors/remoted').Remoter;

var cli = require('../../cli');

var main = require('../../../../gcli');

var express = require('express');
var http = require('http');
var url = require('url');
var fs = require('fs');

var server;
var app;

exports.items = [
  {
    // 'server' parent command
    item: 'command',
    name: 'server',
    description: 'Control the built-in HTTP server'
  },
  {
    // 'server stop' command
    item: 'command',
    name: 'server stop',
    description: 'Stop the built-in HTTP server',
    returnType: 'string',
    params: [ ],
    exec: function(args, context) {
      if (server == null) {
        throw new Error('The server not running');
      }

      server.close();
      server = undefined;
      app = undefined;

      return 'Server closing ...';
    }
  },
  {
    // 'server start' command
    item: 'command',
    name: 'server start',
    description: 'Start the built-in HTTP server',
    returnType: 'string',
    params: [
      {
        name: 'port',
        type: { name: 'number', max: 65536, min: 0 },
        description: 'The TCP port to listen on',
        defaultValue: 9999
      },
      {
        name: 'host',
        type: 'string',
        description: 'The hostname to bind to',
        defaultValue: 'localhost'
      },
      {
        name: 'xhr',
        type: 'boolean',
        description: 'Enable command execution over XHR'
      },
      {
        name: 'websocket',
        type: 'boolean',
        description: 'Enable command execution over websockets'
      }
    ],
    exec: function(args, context) {
      if (server != null) {
        throw new Error('The server is already running');
      }

      var deferred = context.defer();

      app = express();
      app.use(express.logger('dev'));

      app.use('/lib', function(req, res, next) {
        var filename = main.gcliHome + '/lib' + url.parse(req.url).pathname;
        var webOverride = filename.replace(/\/lib\/gcli\//, '/web/gcli/');

        if (fs.existsSync(webOverride)) {
          filename = webOverride;
        }
        var contents = fs.readFileSync(filename, 'utf8');

        if (filename.match(/\.js$/)) {
          contents = contents.replace(/(["'](do not )?use strict[\"\'];)/,
              '$1 define(function(require, exports, module) {');
          contents += '\n});\n';
        }

        res.type('application/javascript');
        res.send(contents);
      });
      app.use(express.static(main.gcliHome));

      if (args.xhr) {
        xhrsocket.init(app, context);
      }

      server = http.createServer(app);

      if (args.websocket) {
        websocket.init(server, context);
      }

      server.on('error', function(error) {
        deferred.reject(error);
      });

      server.listen(args.port, args.host, undefined, function() {
        var msg = 'Serving GCLI to http://' + args.host + ':' + args.port + '/\n' +
                  '  To run unit tests against this server use\n' +
                  '  $ node gcli.js test && phantomjs ./phantom-test.js';
        deferred.resolve(msg);
      });

      return deferred.promise;
    }
  }
];

/**
 * Code that exports the means to have a server side 'exec' command
 */
var xhrsocket = {
  init: function(app, context) {
    app.use(express.bodyParser());

    var requisition = cli.getMapping(context).requisition;
    var remoter = new Remoter(requisition);

    Object.keys(remoter.exposed).forEach(function(command) {
      app.use('/' + command, function(req, res) {
        var func = remoter.exposed[command];
        var reply = func.call(remoter, req.body);

        // Counterpart to xhr.js/connection.call that takes JSON-able data from
        // a promise and sends it across XHR.
        var onResolve = function(data) {
          var text = stringify(data, command);
          res.send(text);
        };

        var onReject = function(data) {
          if (data.code == null) {
            data = { code: -1, data: data };
          }
          util.errorHandler(data);
          var text = stringify(data, 'error_' + command);
          res.status(500).send(text);
        };

        return promise.resolve(reply).then(onResolve).then(null, onReject);
      });
    });
  }
};

/**
 * A wrapper around JSON.stringify to fail gracefully
 */
function stringify(data, action) {
  try {
    return JSON.stringify(data);
  }
  catch (ex) {
    console.error('Performing "' + action + '". Failed to stringify', data);
    util.errorHandler(ex);

    data = {
      code: -1,
      data: ex.toString()
    };
    return JSON.stringify(data);
  }
}

/**
 * Get a quick one line debug summary of an object
 */
function debugStr(obj) {
  var summary = JSON.stringify(obj) || '';
  return summary.length > 40 ? summary.substr(0, 39) + '…' : summary;
}

/**
 * Functions to expose the 'connect' command over web-sockets
 */
var socketio = require('socket.io');

var websocket = {
  init: function(server, context) {
    this._io = socketio.listen(server);
    this._io.set('log level', 1);

    this._io.sockets.on('connection', function(socket) {
      // Tell the browser that we're up and running
      socket.emit('connected');

      var requisition = cli.getMapping(context).requisition;
      var remoter = new Remoter(requisition);

      remoter.addListener(function(name, data) {
        console.log('EMIT ' + name + ' ' + debugStr(data, 30));
        socket.emit('event', { name: name, data: data });
      });

      Object.keys(remoter.exposed).forEach(function(command) {
        socket.on(command, function(request) {
          console.log('SOCKET ' + command + ' ' + debugStr(request.data, 30));

          try {
            var func = remoter.exposed[command];
            var reply = func.call(remoter, request.data);
            promise.resolve(reply).then(function(data) {
              socket.emit('reply', {
                id: request.id,
                reply: data
              });
            });
          }
          catch (ex) {
            console.trace();
            console.error(ex);
            socket.emit('reply', {
              id: request.id,
              exception: ex.toString()
            });
          }
        });
      });
    });
  }
};
