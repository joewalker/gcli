/*
 * Copyright 2011, Mozilla Foundation and contributors
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
