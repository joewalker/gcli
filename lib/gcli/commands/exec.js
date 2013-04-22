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

define(function(require, exports, module) {

'use strict';

var gcli = require('gcli/index');
var cli = require('gcli/cli');
var host = require('util/host');
var l10n = require('util/l10n');

/**
 * Where we store the current working directory
 */
var cwd = '/';

/**
 * Where we store the current environment
 */
var env = {};

/**
 * 'cd' command
 */
var cd = {
  name: 'cd',
  description: l10n.lookup('cdDesc'),
  manual: l10n.lookup('cdManual'),
  params: [
    {
      name: 'directory',
      type: 'string',
      description: l10n.lookup('cdDirectoryDesc'),
    }
  ],
  returnType: 'string',
  exec: function(args, context) {
    cwd = args.directory;
    return 'Working directory is now ' + cwd;
  }
};

/**
 * 'exec' command
 */
var exec = {
  name: 'exec',
  description: l10n.lookup('execDesc'),
  manual: l10n.lookup('execManual'),
  params: [
    {
      name: 'command',
      type: 'string',
      description: l10n.lookup('execCommandDesc'),
    }
  ],
  returnType: 'output',
  exec: function(args, context) {
    var deferred = context.defer();

    var cmdArgs = cli.tokenize(args.command).map(function(arg) {
      return arg.text;
    });
    var cmd = cmdArgs.shift();

    var execSpec = {
      cmd: cmd,
      args: cmdArgs,
      env: env,
      cwd: cwd
    };

    host.exec(execSpec).then(function(output) {
      if (output.code === 0) {
        deferred.resolve(output);
      }
      else {
        deferred.reject(output);
      }
    });

    return deferred.promise;
  }
};

/**
 * How we display the output of a generic exec command: we have to assume that
 * it is a string to be displayed on a terminal - i.e. in a monospaced font
 */
var outputToView = {
  from: 'output',
  to: 'view',
  exec: function(output, context) {
    return context.createView({
      html: '<pre>${output.data}</pre>',
      data: { output: output }
    });
  }
};

/**
 * How we display the output of a generic exec command: we have to assume that
 * it is a string to be displayed on a terminal - i.e. in a monospaced font
 */
var outputToString = {
  from: 'output',
  to: 'string',
  exec: function(output, context) {
    return output.data;
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addConverter(outputToView);
  gcli.addConverter(outputToString);

  gcli.addCommand(cd);
  gcli.addCommand(exec);
};

exports.shutdown = function() {
  gcli.removeCommand(cd);
  gcli.removeCommand(exec);

  gcli.removeConverter(outputToString);
  gcli.removeConverter(outputToView);
};


});
