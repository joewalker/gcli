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
  gcli.addCommand(edit);
  gcli.addCommand(sleep);
};

exports.shutdown = function() {
  gcli.removeCommand(echo);
  gcli.removeCommand(alert);
  gcli.removeCommand(edit);
  gcli.removeCommand(sleep);
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

/**
 * 'edit' command
 */
var edit = {
  name: 'edit',
  description: 'Edit a file',
  params: [
    {
      name: 'resource',
      type: { name: 'resource', include: 'text/css' },
      description: 'The resource to edit'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    var promise = context.createPromise();
    args.resource.loadContents(function(data) {
      promise.resolve('<p>This is just a demo</p>' +
                      '<textarea rows=5 cols=80>' + data + '</textarea>');
    });
    return promise;
  }
};

/**
 * 'sleep' command
 */
var sleep = {
  name: 'sleep',
  description: 'Wait for a while',
  params: [
    {
      name: 'length',
      type: { name: 'number', min: 1 },
      description: 'How long to wait (s)'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    var promise = context.createPromise();
    window.setTimeout(function() {
      promise.resolve('done');
    }, args.length * 1000);
    return promise;
  }
};


});
