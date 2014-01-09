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

var promise = require('../util/promise');
var util = require('../util/util');
var host = require('../util/host');
var fileparser = require('../util/fileparser');

var cli = require('../cli');

/**
 * Store of registered listeners so we can remove them easily
 */
var listeners = [];

/**
 * Add a new listener
 */
exports.addListener = function(context, action) {
  var canon = cli.getMapping(context).requisition.canon;

  var listener = {
    action: action,
    caller: function() {
      action('canonChanged', canon.getCommandSpecs());
    }
  };
  listeners.push(listener);

  canon.onCanonChange.add(listener.caller);
};

/**
 * Remove an existing listener
 */
exports.removeListener = function(context, action) {
  var listener;

  listeners = listeners.filter(function(li) {
    if (li.action === action) {
      listener = li;
      return false;
    }
    return true;
  });

  if (listener == null) {
    throw new Error('action not a known listener');
  }

  var canon = cli.getMapping(context).requisition.canon;
  canon.onCanonChange.remove(listener.caller);
};

/**
 * These functions are designed to be remoted via RDP/XHR/websocket, etc
 */
exports.exposed = {
  /**
   * Execute a system command
   * @param data An object containing the following properties:
   * - cmd: The executable to call
   * - args: Arguments to the executable
   * - cwd: The working directory
   * - env: A map of environment variables
   * @return a promise of a string containing the output of the command
   */
  system: function(context, data) {
    return host.exec({
      cmd: data.cmd,
      args: data.args,
      cwd: data.cwd,
      env: data.env
    });
  },

  /**
   * Execute a GCLI command
   * @param data An object containing the following properties:
   * - typed: The command string
   * @return a promise of an object with the following properties:
   * - data: The output of the command
   * - type: The type of the data to allow selection of a converter
   * - error: True if the output was considered an error
   */
  execute: function(context, data) {
    var requisition = cli.getMapping(context).requisition;
    return requisition.updateExec(data.typed).then(function(output) {
      return {
        data: output.data,
        type: output.type,
        error: output.error
      };
    });
  },

  /**
   * Call type.parse to check validity. Used by the remote type
   * @param data An object containing the following properties:
   * - typed: The command string
   * - param: The name of the parameter to get the status of
   * @return a promise of an object with the following properties:
   * - status: Of of the following strings: VALID|INCOMPLETE|ERROR
   * - message: The message to display to the user
   * - predictions: An array of suggested values for the given parameter
   */
  typeparse: function(context, data) {
    var requisition = cli.getMapping(context).requisition;
    return requisition.update(data.typed).then(function() {
      var assignment = requisition.getAssignment(data.param);

      return promise.resolve(assignment.predictions).then(function(predictions) {
        return {
          status: assignment.getStatus().toString(),
          message: assignment.message,
          predictions: predictions
        };
      });
    });
  },

  /**
   * Get the incremented value of some type
   * @param data An object containing the following properties:
   * - typed: The command string
   * - param: The name of the parameter to get the status of
   * @return a promise of an object with the following properties:
   * - status: Of of the following strings: VALID|INCOMPLETE|ERROR
   * - message: The message to display to the user
   * - predictions: An array of suggested values for the given parameter
   */
  typeincrement: function(context, data) {
    var requisition = cli.getMapping(context).requisition;
    return requisition.update(data.typed).then(function() {
      var assignment = requisition.getAssignment(data.param);
      return requisition.increment(assignment).then(function() {
        var arg = assignment.arg;
        return arg == null ? undefined : arg.text;
      });
    });
  },

  /**
   * See typeincrement
   */
  typedecrement: function(context, data) {
    var requisition = cli.getMapping(context).requisition;
    return requisition.update(data.typed).then(function() {
      var assignment = requisition.getAssignment(data.param);
      return requisition.decrement(assignment).then(function() {
        var arg = assignment.arg;
        return arg == null ? undefined : arg.text;
      });
    });
  },

  /**
   * Perform a lookup on a selection type to get the allowed values
   */
  selectioninfo: function(context, data) {
    var canon = cli.getMapping(context).requisition.canon;
    var command = canon.getCommand(data.commandName);
    if (command == null) {
      throw new Error('No command called \'' + data.commandName + '\'');
    }

    var type;
    command.params.forEach(function(param) {
      if (param.name === data.paramName) {
        type = param.type;
      }
    });
    if (type == null) {
      throw new Error('No parameter called \'' + data.paramName + '\' in \'' +
                      data.commandName + '\'');
    }

    switch (data.action) {
      case 'lookup':
        return type.lookup(context);
      case 'data':
        return type.data(context);
      default:
        throw new Error('Action must be either \'lookup\' or \'data\'');
    }
  },

  /**
   * Retrieve a list of the remotely executable commands
   */
  specs: function(context, data) {
    var requisition = cli.getMapping(context).requisition;
    return requisition.canon.getCommandSpecs();
  },

  /**
   * Examine the filesystem for file matches
   * @param data An object containing the following properties:
   * - typed: The filename as typed by the user
   * - filetype: The expected filetype
   * - existing: Boolean which defines if a file/directory is expected to exist
   * - matches: String of a regular expression which the result should match
   */
  parsefile: function(context, data) {
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
  }
};
