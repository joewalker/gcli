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

const fileparser = require('../util/fileparser');
const protocol = require('./protocol');
const method = protocol.method;
const Arg = protocol.Arg;
const RetVal = protocol.RetVal;

/**
 * Provide JSON mapping services to remote functionality of a Requisition
 */
const Remoter = exports.Remoter = function(requisition) {
  this.requisition = requisition;
  this._listeners = [];
};

/**
 * Add a new listener
 */
Remoter.prototype.addListener = function(action) {
  const listener = {
    action: action,
    caller: () => {
      action('commands-changed');
    }
  };
  this._listeners.push(listener);

  this.requisition.system.commands.onCommandsChange.add(listener.caller);
};

/**
 * Remove an existing listener
 */
Remoter.prototype.removeListener = function(action) {
  let listener;

  this._listeners = this._listeners.filter(li => {
    if (li.action === action) {
      listener = li;
      return false;
    }
    return true;
  });

  if (listener == null) {
    throw new Error('action not a known listener');
  }

  this.requisition.system.commands.onCommandsChange.remove(listener.caller);
};

/**
 * These functions are designed to be remoted via RDP/XHR/websocket, etc
 */
Remoter.prototype.exposed = {
  /**
   * Retrieve a list of the remotely executable commands
   * @param customProps Array of strings containing additional properties which,
   * if specified in the command spec, will be included in the JSON. Normally we
   * transfer only the properties required for GCLI to function.
   */
  specs: method(function(customProps) {
    return this.requisition.system.commands.getCommandSpecs(customProps);
  }, {
    request: {
      customProps: Arg(0, 'nullable:array:string')
    },
    response: RetVal('json')
  }),

  /**
   * Execute a GCLI command
   * @return a promise of an object with the following properties:
   * - data: The output of the command
   * - type: The type of the data to allow selection of a converter
   * - error: True if the output was considered an error
   */
  execute: method(function(typed) {
    return this.requisition.updateExec(typed).then(output => output.toJson());
  }, {
    request: {
      typed: Arg(0, 'string') // The command string
    },
    response: RetVal('json')
  }),

  /**
   * Get the state of an input string. i.e. requisition.getStateData()
   */
  state: method(function(typed, start, rank) {
    return this.requisition.update(typed)
                           .then(() => this.requisition.getStateData(start, rank));
  }, {
    request: {
      typed: Arg(0, 'string'), // The command string
      start: Arg(1, 'number'), // Cursor start position
      rank: Arg(2, 'number') // The prediction offset (# times UP/DOWN pressed)
    },
    response: RetVal('json')
  }),

  /**
   * Call type.parse to check validity. Used by the remote type
   * @return a promise of an object with the following properties:
   * - status: Of of the following strings: VALID|INCOMPLETE|ERROR
   * - message: The message to display to the user
   * - predictions: An array of suggested values for the given parameter
   */
  parseType: method(function(typed, paramName) {
    return this.requisition.update(typed).then(() => {
      const assignment = this.requisition.getAssignment(paramName);
      const predictions = assignment.conversion.predictions;
      return Promise.resolve(predictions).then(predictions => {
        return {
          status: assignment.conversion.getStatus().toString(),
          message: assignment.conversion.message,
          predictions: predictions
        };
      });
    });
  }, {
    request: {
      typed: Arg(0, 'string'), // The command string
      paramName: Arg(1, 'string') // The name of the parameter to parse
    },
    response: RetVal('json')
  }),

  /**
   * Get the incremented/decremented value of some type
   * @return a promise of a string containing the new argument text
   */
  nudgeType: method(function(typed, by, paramName) {
    return this.requisition.update(typed).then(() => {
      const assignment = this.requisition.getAssignment(paramName);
      return this.requisition.nudge(assignment, by).then(() => {
        const arg = assignment.arg;
        return arg == null ? undefined : arg.text;
      });
    });
  }, {
    request: {
      typed: Arg(0, 'string'),    // The command string
      by: Arg(1, 'number'),       // +1/-1 for increment / decrement
      paramName: Arg(2, 'string') // The name of the parameter to parse
    },
    response: RetVal('string')
  }),

  /**
   * Call type.lookup() on a selection type to get the allowed values
   */
  getSelectionLookup: method(function(commandName, paramName) {
    const command = this.requisition.system.commands.get(commandName);
    if (command == null) {
      throw new Error('No command called \'' + commandName + '\'');
    }

    let type;
    command.params.forEach(param => {
      if (param.name === paramName) {
        type = param.type;
      }
    });

    if (type == null) {
      throw new Error('No parameter called \'' + paramName + '\' in \'' +
                      commandName + '\'');
    }

    const reply = type.getLookup(this.requisition.executionContext);
    return Promise.resolve(reply).then(lookup => {
      // lookup returns an array of objects with name/value properties and
      // the values might not be JSONable, so remove them
      return lookup.map(info => {
        return { name: info.name };
      });
    });
  }, {
    request: {
      commandName: Arg(0, 'string'), // The command containing the parameter in question
      paramName: Arg(1, 'string'),   // The name of the parameter
    },
    response: RetVal('json')
  }),

  /**
   * Examine the filesystem for file matches
   */
  parseFile: method(function(typed, filetype, existing, matches) {
    var options = {
      filetype: filetype,
      existing: existing,
      matches: new RegExp(matches)
    };

    var context = this.requisition.executionContext;
    return fileparser.parse(context, typed, options).then(function(reply) {
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
  }, {
    request: {
      typed: Arg(0, "string"), // The filename as typed by the user
      filetype: Arg(1, "array:string"), // The expected filetype
      existing: Arg(2, "string"), // Boolean which defines if a file/directory is expected to exist
      matches: Arg(3, "json") // String of a regular expression which the result should match
    },
    response: RetVal("json")
  })
};
