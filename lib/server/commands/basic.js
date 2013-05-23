/*
 * Copyright 2012, Mozilla Foundation and contributors
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

var main = require('../../../gcli');
var gcli = main.require('gcli/index');

/**
 * 'echo' command
 */
var echoCmdSpec = {
  name: 'echo',
  description: {
    root: 'Show a message',
    fr_fr: 'Afficher un message'
  },
  params: [
    {
      name: 'message',
      type: 'string',
      description: {
        root: 'The message to output',
        fr_fr: 'Le message à afficher'
      }
    }
  ],
  returnType: 'string',
  exec: function echo(args, context) {
    return args.message;
  }
};

/**
 * 'exit' build command
 */
var exitCmdSpec = {
  name: 'exit',
  description: 'Quit from GCLI',
  exec: function(args, context) {
    process.exit(0);
  }
};

/**
 * 'sleep' command
 */
var sleepCmdSpec = {
  name: 'sleep',
  description: 'Wait for a while',
  params: [
    {
      name: 'length',
      type: { name: 'number', min: 1 },
      description: 'How long to wait (s)'
    }
  ],
  returnType: 'string',
  exec: function(args, context) {
    var deferred = context.defer();
    setTimeout(function() {
      deferred.resolve('Done');
    }, args.length * 1000);
    return deferred.promise;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(echoCmdSpec);
  gcli.addCommand(exitCmdSpec);
  gcli.addCommand(sleepCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(echoCmdSpec);
  gcli.removeCommand(exitCmdSpec);
  gcli.removeCommand(sleepCmdSpec);
};
