'use strict';

const socketio = require('socket.io');

const util = require('../util/util');
const cli = require('../cli');
const Remoter = require('./remoted').Remoter;

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
  const io = socketio.listen(server);
  exports.useSocket(io, context);
};

/**
 * Link to an existing web-socket server
 */
exports.useSocket = function(io, context) {
  io.sockets.on('connection', socket => {
    // Tell the browser that we're up and running
    socket.emit('connected');

    const requisition = cli.getMapping(context).requisition;
    const remoter = new Remoter(requisition);

    remoter.addListener((name, data) => {
      // console.log('EMIT ' + name + ' ' + debugStr(data, 30));
      socket.emit('event', { name: name, data: data });
    });

    Object.keys(remoter.exposed).forEach(command => {
      socket.on(command, request => {
        // Handle errors from exceptions an promise rejections
        const onError = err => {
          console.log('SOCKET ' + command +
                      '(' + debugStr(request.data, 30) + ') Exception');
          util.errorHandler(err);

          socket.emit('reply', {
            id: request.id,
            exception: '' + err
          });
        };

        try {
          const func = remoter.exposed[command];
          const reply = func.call(remoter, request.data);
          Promise.resolve(reply).then(data => {
            console.log('SOCKET ' + command +
                        '(' + debugStr(request.data, 30) + ') → ' +
                        debugStr(data, 20) + ')');

            socket.emit('reply', {
              id: request.id,
              reply: data
            });
          }).catch(onError);
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
  const summary = JSON.stringify(obj) || '';
  return summary.length > 40 ? summary.substr(0, 39) + '…' : summary;
}
