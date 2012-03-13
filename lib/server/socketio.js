/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var main = require('../../gcli');
var io = require('socket.io');

var canon = main.requirejs('gcli/canon');

/**
 * Manage a connection with a remote system over socket.io / web sockets
 * @param server A node HTTP Server
 */
exports.start = function(server, requisition) {
  io.listen(server).sockets.on('connection', function(socket) {
    new Connection(socket, requisition);
  });
};

/**
 * Manages a connection from a client
 */
function Connection(socket, requisition) {
  this.socket = socket;
  this.requisition = requisition;

  this.socket.on('join', this.join.bind(this));
  this.socket.on('exec', this.exec.bind(this));
}

/**
 * The remote client has sent us a 'join' message
 */
Connection.prototype.join = function() {
  this.socket.emit('addCommands', canon.getCommandSpecs());
};

/**
 * The remote client has sent us an 'exec' message
 */
Connection.prototype.exec = function(ev) {

  var outputObject = this.requisition.exec({
    command: ev.command,
    args: ev.args
  });

  if (outputObject.output === undefined) {
    var onSuccess = function(reply) {
      this.socket.emit('reply', { id: ev.id, reply: outputObject.output });
    };

    var onFailure = function(error) {
      this.socket.emit('reply', { id: ev.id, error: error });
    };

    outputObject.promise.then(onSuccess, onFailure);
  }
  else {
    this.socket.emit('reply', { id: ev.id, reply: outputObject.output });
  }
};
