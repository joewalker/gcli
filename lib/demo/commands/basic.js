/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var gcli = require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(echo);
  gcli.addCommand(alert);
};

exports.shutdown = function() {
  gcli.removeCommand(echo);
  gcli.removeCommand(alert);
};


/**
 * Arm window.alert with metadata
 */
var alert = {
  name: 'alert',
  description: {
    'root': 'Show an alert dialog'
  },
  params: [
    {
      name: 'message',
      type: 'string',
      description: {
        'root': 'Message to display'
      }
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
  description: {
    root: 'Show a message',
  },
  params: [
    {
      name: 'message',
      type: 'string',
      description: {
        root: 'The message to output'
      }
    }
  ],
  returnType: 'string',
  exec: function echo(args, context) {
    return args.message;
  }
};


});
