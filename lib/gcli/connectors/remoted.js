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

'use strict';

var host = require('../util/host');
var fileparser = require('../util/fileparser');

var cli = require('../cli');
var remote = require('../types/remote');

/**
 * Execute a system command
 * @param data An object containing the following properties:
 * - cmd: The executable to call
 * - args: Arguments to the executable
 * - cwd: The working directory
 * - env: A map of environment variables
 * @return a promise of a string containing the output of the command
 */
exports.system = function(context, data) {
  return host.exec({
    cmd: data.cmd,
    args: data.args,
    cwd: data.cwd,
    env: data.env
  });
};

/**
 * Execute a GCLI command
 * @param data An object containing the following properties:
 * - typed: The command string
 * @return a promise of an object with the following properties:
 * - data: The output of the command
 * - type: The type of the data to allow selection of a converter
 * - error: True if the output was considered an error
 */
exports.execute = function(context, data) {
  var requisition = cli.getMapping(context).requisition;
  return requisition.updateExec(data.typed).then(function(output) {
    return {
      data: output.data,
      type: output.type,
      error: output.error
    };
  });
};

/**
 * Retrieve a list of the remotely executable commands
 */
exports.specs = function(context, data) {
  var requisition = cli.getMapping(context).requisition;
  return {
    commands: requisition.canon.getCommandSpecs(),
    types: requisition.types.getTypeSpecs()
  };
};

/**
 * Support remote types by proxying type.parse
 */
exports.parse = function(context, data) {
  return remote.parse(context, data);
};

/**
 * Support remote types by proxying type.stringify
 */
exports.stringify = function(context, data) {
  return remote.stringify(context, data);
};

/**
 * Support remote types by proxying type.increment
 */
exports.increment = function(context, data) {
  return remote.increment(context, data);
};

/**
 * Support remote types by proxying type.decrement
 */
exports.decrement = function(context, data) {
  return remote.decrement(context, data);
};

/**
 * Examine the filesystem for file matches
 * @param data An object containing the following properties:
 * - typed: The filename as typed by the user
 * - filetype: The expected filetype
 * - existing: Boolean which defines if a file/directory is expected to exist
 * - matches: String of a regular expression which the result should match
 */
exports.parsefile = function(context, data) {
  var options = {
    filetype: data.filetype,
    existing: data.existing,
    matches: new RegExp(data.matches)
  };

  return fileparser.parse(data.typed, options).then(function(reply) {
    reply.status = reply.status.toString();
    if (reply.predictor == null) {
      return reply;
    }

    return reply.predictor().then(function(predictions) {
      delete reply.predictor;
      reply.predictions = predictions;
      return reply;
    });
  });
};
