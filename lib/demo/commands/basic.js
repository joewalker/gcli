/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


/**
 * Arm window.alert with metadata
 */
var alert = {
  name: 'alert',
  description: 'Show an alert dialog',
  params: [
    {
      name: 'message',
      type: 'string',
      description: 'Message to display'
    }
  ],
  exec: function(args, context) {
    window.alert(args.message);
  }
};

/**
 * 'echo' command
 */
var echo = {
  name: 'echo',
  description: 'Show a message',
  params: [
    {
      name: 'message',
      type: 'string',
      description: 'Message'
    }
  ],
  returnType: 'string',
  exec: function echo(args, context) {
    return args.message;
  }
};


var gcli = require('gcli/index');

exports.startup = function() {
  gcli.addCommand(echo);
  gcli.addCommand(alert);
};

exports.shutdown = function() {
  gcli.removeCommand(echo);
  gcli.removeCommand(alert);
};


});
