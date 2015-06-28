'use strict';

var socketio = require('socket.io');

var Promise = require('../util/promise').Promise;
var util = require('../util/util');

var cli = require('../cli');
var Remoter = require('./remoted').Remoter;

/**
 * Start a web-socket server from an existing express server
 */
exports.init = function(server, context) {
  // To debug socket.io:
  //   DEBUG=* node yourfile.js
  // or in the browser:
  //   localStorage.debug='*';
  // And then filter by the scopes you’re interested in.
  // You can use , to separate them.
  var io = socketio.listen(server);
  exports.useSocket(io, context);
};

/**
 * Link to an existing web-socket server
 */
exports.useSocket = function(io, context) {
  io.sockets.on('connection', function(socket) {
    // Tell the browser that we're up and running
    socket.emit('connected');

    var requisition = cli.getMapping(context).requisition;
    var remoter = new Remoter(requisition);

    remoter.addListener(function(name, data) {
      // console.log('EMIT ' + name + ' ' + debugStr(data, 30));
      socket.emit('event', { name: name, data: data });
    });

    Object.keys(remoter.exposed).forEach(function(command) {
      socket.on(command, function(request) {
        // Handle errors from exceptions an promise rejections
        var onError = function(err) {
          console.log('SOCKET ' + command +
                      '(' + debugStr(request.data, 30) + ') Exception');
          util.errorHandler(err);

          socket.emit('reply', {
            id: request.id,
            exception: '' + err
          });
        };

        try {
          var func = remoter.exposed[command];
          var reply = func.call(remoter, request.data);
          Promise.resolve(reply).then(function(data) {
            console.log('SOCKET ' + command +
                        '(' + debugStr(request.data, 30) + ') → ' +
                        debugStr(data, 20) + ')');

            socket.emit('reply', {
              id: request.id,
              reply: data
            });
          }, onError);
        }
        catch (ex) {
          onError(ex);
        }
      });
    });
  });
};

/**
 * Get a quick one line debug summary of an object
 */
function debugStr(obj) {
  var summary = JSON.stringify(obj) || '';
  return summary.length > 40 ? summary.substr(0, 39) + '…' : summary;
}
