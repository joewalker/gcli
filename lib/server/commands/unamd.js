/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var copy = require('dryice').copy;
var unamd = require('../unamd');
var main = require('../../../gcli');
var gcli = main.require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(unamdCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(unamdCmdSpec);
};

/**
 * 'unamd' build command
 */
var unamdCmdSpec = {
  name: 'unamd',
  description: 'Convert CommonJS module format to NodeJS module format',
  params: [
    {
      name: 'source',
      type: 'string',
      description: 'The source directory'
    },
    {
      name: 'dest',
      type: 'string',
      description: 'The destination directory'
    }
  ],
  returnType: 'terminal',
  exec: function(args, context) {
    return unamd.unamdize(args.source, args.dest);
  }
};
