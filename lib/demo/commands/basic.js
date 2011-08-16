/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


/**
 * 'eval' command
 */
var evalCommandSpec = {
  name: 'eval',
  params: [
    {
      name: 'javascript',
      type: 'javascript',
      description: 'Script to evaluate'
    }
  ],
  returnType: 'html',
  description: 'Call \'eval\' on some JavaScript',
  exec: function(args, context) {
    var resultPrefix = 'Result for <em>\'' + args.javascript + '\'</em>: ';
    try {
      var result = eval(args.javascript);

      if (result === null) {
        return resultPrefix + 'null.';
      }

      if (result === undefined) {
        return resultPrefix + 'undefined.';
      }

      if (typeof result === 'function') {
        return resultPrefix +
          (result + '').replace(/\n/g, '<br>').replace(/ /g, '&#160');
      }

      return resultPrefix + result;
    } catch (e) {
      return '<b>Error</b>: ' + e.message;
    }
  }
};

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
  gcli.addCommand(evalCommandSpec);
  gcli.addCommand(echo);
  gcli.addCommand(alert);
};

exports.shutdown = function() {
  gcli.removeCommand(evalCommandSpec);
  gcli.removeCommand(echo);
  gcli.removeCommand(alert);
};


});
