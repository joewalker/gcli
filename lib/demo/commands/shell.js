/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var gcli = require('gcli/index');
var host = require('gcli/host');

/**
 * 'ls' command
 */
var ls = {
  name: 'ls',
  description: 'List directory contents',
  manual: 'For each operand that names a file of a type other than directory, ls displays its name as well as any requested, associated information. For each operand that names a file of type directory, ls displays the names of files contained within that directory, as well as any requested, associated information.' +
          '<br/>If no operands are given, the contents of the current directory are displayed. If more than one operand is given, non-directory operands are displayed first; directory and non-directory operands are sorted separately and in lexicographical order.',
  params: [
    {
      name: 'long',
      type: 'boolean',
      description: 'Long listing'
    }
  ],
  returnType: 'terminal',
  exec: function(args, context) {
    var promise = context.createPromise();
    host.exec(promise, {
      cmd: '/bin/ls',
      args: args.long ? [ '-l' ] : [ ],
    });
    return promise;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function(data, reason) {
  gcli.addCommand(ls);
};

exports.shutdown = function(data, reason) {
  gcli.removeCommand(ls);
};


});
