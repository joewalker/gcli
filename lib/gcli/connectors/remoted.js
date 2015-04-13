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

/* jshint quotmark:false, newcap:false */

'use strict';

var Promise = require('../util/promise').Promise;
var host = require('../util/host');
var fileparser = require('../util/fileparser');

var protocol = require('./protocol');
var method = protocol.method;
var Arg = protocol.Arg;
var RetVal = protocol.RetVal;

/**
 * Provide JSON mapping services to remote functionality of a Requisition
 */
var Remoter = exports.Remoter = function(requisition) {
  this.requisition = requisition;
  this._listeners = [];
};

/**
 * Add a new listener
 */
Remoter.prototype.addListener = function(action) {
  var listener = {
    action: action,
    caller: function() {
      action('commands-changed');
    }.bind(this)
  };
  this._listeners.push(listener);

  this.requisition.system.commands.onCommandsChange.add(listener.caller);
};

/**
 * Remove an existing listener
 */
Remoter.prototype.removeListener = function(action) {
  var listener;

  this._listeners = this._listeners.filter(function(li) {
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
      customProps: Arg(0, "nullable:array:string")
    },
    response: RetVal("json")
  }),

  /**
   * Execute a GCLI command
   * @return a promise of an object with the following properties:
   * - data: The output of the command
   * - type: The type of the data to allow selection of a converter
   * - error: True if the output was considered an error
   */
  execute: method(function(typed) {
    return this.requisition.updateExec(typed).then(function(output) {
      return output.toJson();
    });
  }, {
    request: {
      typed: Arg(0, "string") // The command string
    },
    response: RetVal("json")
  }),

  /**
   * Get the state of an input string. i.e. requisition.getStateData()
   */
  state: method(function(typed, start, rank) {
    return this.requisition.update(typed).then(function() {
      return this.requisition.getStateData(start, rank);
    }.bind(this));
  }, {
    request: {
      typed: Arg(0, "string"), // The command string
      start: Arg(1, "number"), // Cursor start position
      rank: Arg(2, "number") // The prediction offset (# times UP/DOWN pressed)
    },
    response: RetVal("json")
  }),

  /**
   * Call type.parse to check validity. Used by the remote type
   * @return a promise of an object with the following properties:
   * - status: Of of the following strings: VALID|INCOMPLETE|ERROR
   * - message: The message to display to the user
   * - predictions: An array of suggested values for the given parameter
   */
  parseType: method(function(typed, paramName) {
    return this.requisition.update(typed).then(function() {
      var assignment = this.requisition.getAssignment(paramName);

      return Promise.resolve(assignment.predictions).then(function(predictions) {
        return {
          status: assignment.getStatus().toString(),
          message: assignment.message,
          predictions: predictions
        };
      });
    }.bind(this));
  }, {
    request: {
      typed: Arg(0, "string"), // The command string
      paramName: Arg(1, "string") // The name of the parameter to parse
    },
    response: RetVal("json")
  }),

  /**
   * Get the incremented/decremented value of some type
   * @return a promise of a string containing the new argument text
   */
  nudgeType: method(function(typed, by, paramName) {
    return this.requisition.update(typed).then(function() {
      var assignment = this.requisition.getAssignment(paramName);
      return this.requisition.nudge(assignment, by).then(function() {
        var arg = assignment.arg;
        return arg == null ? undefined : arg.text;
      });
    }.bind(this));
  }, {
    request: {
      typed: Arg(0, "string"),    // The command string
      by: Arg(1, "number"),       // +1/-1 for increment / decrement
      paramName: Arg(2, "string") // The name of the parameter to parse
    },
    response: RetVal("string")
  }),

  /**
   * Call type.lookup() on a selection type to get the allowed values
   */
  getSelectionLookup: method(function(commandName, paramName) {
    var command = this.requisition.system.commands.get(commandName);
    if (command == null) {
      throw new Error('No command called \'' + commandName + '\'');
    }

    var type;
    command.params.forEach(function(param) {
      if (param.name === paramName) {
        type = param.type;
      }
    });

    if (type == null) {
      throw new Error('No parameter called \'' + paramName + '\' in \'' +
                      commandName + '\'');
    }

    var reply = type.getLookup(this.requisition.executionContext);
    return Promise.resolve(reply).then(function(lookup) {
      // lookup returns an array of objects with name/value properties and
      // the values might not be JSONable, so remove them
      return lookup.map(function(info) {
        return { name: info.name };
      });
    });
  }, {
    request: {
      commandName: Arg(0, "string"), // The command containing the parameter in question
      paramName: Arg(1, "string"),   // The name of the parameter
    },
    response: RetVal("json")
  }),

  /**
   * Execute a system command
   * @return a promise of a string containing the output of the command
   */
  system: method(function(cmd, args, cwd, env) {
    var context = this.requisition.executionContext;
    return host.spawn(context, { cmd: cmd, args: args, cwd: cwd, env: env });
  }, {
    request: {
      cmd: Arg(0, "string"), // The executable to call
      args: Arg(1, "array:string"), // Arguments to the executable
      cwd: Arg(2, "string"), // The working directory
      env: Arg(3, "json") // A map of environment variables
    },
    response: RetVal("json")
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


/**
 * Asynchronous construction. Use GcliFront();
 * @private
 */
function GcliFront() {
  throw new Error('Use GcliFront.create().then(front => ...)');
}

/**
 *
 */
GcliFront.create = function(connector, url) {
  return connector.connect(url).then(function(connection) {
    var front = Object.create(GcliFront.prototype);
    return front._init(connection);
  });
};

/**
 * Asynchronous construction. Use GcliFront();
 * @private
 */
GcliFront.prototype._init = function(connection) {
  this.connection = connection;
  return this;
};

GcliFront.prototype.on = function(eventName, action) {
  this.connection.on(eventName, action);
};

GcliFront.prototype.off = function(eventName, action) {
  this.connection.off(eventName, action);
};


GcliFront.prototype.specs = function() {
  var data = {
  };
  return this.connection.call('specs', data);
};

GcliFront.prototype.execute = function(typed) {
  var data = {
    typed: typed
  };
  return this.connection.call('execute', data);
};

GcliFront.prototype.parseFile = function(typed, filetype, existing, matches) {
  var data = {
    typed: typed,
    filetype: filetype,
    existing: existing,
    matches: matches
  };
  return this.connection.call('parseFile', data);
};

GcliFront.prototype.parseType = function(typed, paramName) {
  var data = {
    typed: typed,
    paramName: paramName
  };
  return this.connection.call('parseType', data);
};

GcliFront.prototype.nudgeType = function(typed, by, paramName) {
  var data = {
    typed: typed,
    by: by,
    paramName: paramName
  };
  return this.connection.call('nudgeType', by, data);
};

GcliFront.prototype.getSelectionLookup = function(commandName, paramName) {
  var data = {
    commandName: commandName,
    paramName: paramName
  };
  return this.connection.call('getSelectionLookup', data);
};

GcliFront.prototype.system = function(cmd, args, cwd, env) {
  var data = {
    cmd: cmd,
    args: args,
    cwd: cwd,
    env: env
  };
  return this.connection.call('system', data);
};

exports.GcliFront = GcliFront;
