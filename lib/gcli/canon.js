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

var util = require('./util/util');
var l10n = require('./util/l10n');
var remote = require('./types/remote');

var types = require('./types');
var Status = require('./types').Status;

/**
 * Implement the localization algorithm for any documentation objects (i.e.
 * description and manual) in a command.
 * @param data The data assigned to a description or manual property
 * @param onUndefined If data == null, should we return the data untouched or
 * lookup a 'we don't know' key in it's place.
 */
function lookup(data, onUndefined) {
  if (data == null) {
    if (onUndefined) {
      return l10n.lookup(onUndefined);
    }

    return data;
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'object') {
    if (data.key) {
      return l10n.lookup(data.key);
    }

    var locales = l10n.getPreferredLocales();
    var translated;
    locales.some(function(locale) {
      translated = data[locale];
      return translated != null;
    });
    if (translated != null) {
      return translated;
    }

    console.error('Can\'t find locale in descriptions: ' +
            'locales=' + JSON.stringify(locales) + ', ' +
            'description=' + JSON.stringify(data));
    return '(No description)';
  }

  return l10n.lookup(onUndefined);
}


/**
 * The command object is mostly just setup around a commandSpec (as passed to
 * #addCommand()).
 */
function Command(commandSpec) {
  Object.keys(commandSpec).forEach(function(key) {
    this[key] = commandSpec[key];
  }, this);

  if (!this.name) {
    throw new Error('All registered commands must have a name');
  }

  if (this.params == null) {
    this.params = [];
  }
  if (!Array.isArray(this.params)) {
    throw new Error('command.params must be an array in ' + this.name);
  }

  this.hasNamedParameters = false;
  this.description = 'description' in this ? this.description : undefined;
  this.description = lookup(this.description, 'canonDescNone');
  this.manual = 'manual' in this ? this.manual : undefined;
  this.manual = lookup(this.manual);

  // At this point this.params has nested param groups. We want to flatten it
  // out and replace the param object literals with Parameter objects
  var paramSpecs = this.params;
  this.params = [];
  this.paramGroups = {};
  this._shortParams = {};

  var addParam = function(param) {
    var groupName = param.groupName || Parameter.DEFAULT_GROUP_NAME;
    this.params.push(param);
    if (!this.paramGroups.hasOwnProperty(groupName)) {
      this.paramGroups[groupName] = [];
    }
    this.paramGroups[groupName].push(param);
  }.bind(this);

  // Track if the user is trying to mix default params and param groups.
  // All the non-grouped parameters must come before all the param groups
  // because non-grouped parameters can be assigned positionally, so their
  // index is important. We don't want 'holes' in the order caused by
  // parameter groups.
  var usingGroups = false;

  // In theory this could easily be made recursive, so param groups could
  // contain nested param groups. Current thinking is that the added
  // complexity for the UI probably isn't worth it, so this implementation
  // prevents nesting.
  paramSpecs.forEach(function(spec) {
    if (!spec.group) {
      var param = new Parameter(spec, this, null);
      addParam(param);

      if (!param.isPositionalAllowed) {
        this.hasNamedParameters = true;
      }

      if (usingGroups && param.groupName == null) {
        throw new Error('Parameters can\'t come after param groups.' +
                        ' Ignoring ' + this.name + '/' + spec.name);
      }

      if (param.groupName != null) {
        usingGroups = true;
      }
    }
    else {
      spec.params.forEach(function(ispec) {
        var param = new Parameter(ispec, this, spec.group);
        addParam(param);

        if (!param.isPositionalAllowed) {
          this.hasNamedParameters = true;
        }
      }, this);

      usingGroups = true;
    }
  }, this);

  this.params.forEach(function(param) {
    if (param.short != null) {
      if (this._shortParams[param.short] != null) {
        throw new Error('Multiple params using short name ' + param.short);
      }
      this._shortParams[param.short] = param;
    }
  }, this);
}

/**
 * JSON serializer that avoids non-serializable data
 */
Object.defineProperty(Command.prototype, 'json', {
  get: function() {
    return {
      name: this.name,
      description: this.description,
      manual: this.manual,
      params: this.params.map(function(param) { return param.json; }),
      returnType: this.returnType,
      isParent: (this.exec == null)
    };
  },
  enumerable: true
});

/**
 * Easy way to lookup parameters by short name
 */
Command.prototype.getParameterByShortName = function(short) {
  return this._shortParams[short];
};

exports.Command = Command;


/**
 * A wrapper for a paramSpec so we can sort out shortened versions names for
 * option switches
 */
function Parameter(paramSpec, command, groupName) {
  this.command = command || { name: 'unnamed' };
  this.paramSpec = paramSpec;
  this.name = this.paramSpec.name;
  this.type = this.paramSpec.type;
  this.short = this.paramSpec.short;

  if (this.short != null && !/[0-9A-Za-z]/.test(this.short)) {
    throw new Error('\'short\' value must be a single alphanumeric digit.');
  }

  this.groupName = groupName;
  if (this.groupName != null) {
    if (this.paramSpec.option != null) {
      throw new Error('Can\'t have a "option" property in a nested parameter');
    }
  }
  else {
    if (this.paramSpec.option != null) {
      this.groupName = this.paramSpec.option === true ?
              Parameter.DEFAULT_GROUP_NAME :
              '' + this.paramSpec.option;
    }
  }

  if (!this.name) {
    throw new Error('In ' + this.command.name +
                    ': all params must have a name');
  }

  var typeSpec = this.type;
  this.type = types.createType(typeSpec);
  if (this.type == null) {
    console.error('Known types: ' + types.getTypeNames().join(', '));
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': can\'t find type for: ' + JSON.stringify(typeSpec));
  }

  // boolean parameters have an implicit defaultValue:false, which should
  // not be changed. See the docs.
  if (this.type.name === 'boolean' &&
      this.paramSpec.defaultValue !== undefined) {
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': boolean parameters can not have a defaultValue.' +
                    ' Ignoring');
  }

  // Check the defaultValue for validity.
  // Both undefined and null get a pass on this test. undefined is used when
  // there is no defaultValue, and null is used when the parameter is
  // optional, neither are required to parse and stringify.
  if (this._defaultValue != null) {
    try {
      // Passing null in for a context is bound to get us into trouble some day
      // in which case we'll need to mock one up in some way
      var context = null;
      var defaultText = this.type.stringify(this.paramSpec.defaultValue, context);
      var parsed = this.type.parseString(defaultText, context);
      parsed.then(function(defaultConversion) {
        if (defaultConversion.getStatus() !== Status.VALID) {
          console.error('In ' + this.command.name + '/' + this.name +
                        ': Error round tripping defaultValue. status = ' +
                        defaultConversion.getStatus());
        }
      }.bind(this), util.errorHandler);
    }
    catch (ex) {
      throw new Error('In ' + this.command.name + '/' + this.name + ': ' + ex);
    }
  }

  // All parameters that can only be set via a named parameter must have a
  // non-undefined default value
  if (!this.isPositionalAllowed && this.paramSpec.defaultValue === undefined &&
      this.type.getBlank == null && this.type.name !== 'boolean') {
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': Missing defaultValue for optional parameter.');
  }
}

/**
 * The default group name, when none is given explicitly
 */
Parameter.DEFAULT_GROUP_NAME = l10n.lookup('canonDefaultGroupName');

/**
 * type.getBlank can be expensive, so we delay execution where we can
 */
Object.defineProperty(Parameter.prototype, 'defaultValue', {
  get: function() {
    if (!('_defaultValue' in this)) {
      this._defaultValue = (this.paramSpec.defaultValue !== undefined) ?
          this.paramSpec.defaultValue :
          this.type.getBlank().value;
    }

    return this._defaultValue;
  },
  enumerable : true
});

/**
 * Does the given name uniquely identify this param (among the other params
 * in this command)
 * @param name The name to check
 */
Parameter.prototype.isKnownAs = function(name) {
  return (name === '--' + this.name) || (name === '-' + this.short);
};

/**
 * Resolve the manual for this parameter, by looking in the paramSpec
 * and doing a l10n lookup
 */
Object.defineProperty(Parameter.prototype, 'manual', {
  get: function() {
    return lookup(this.paramSpec.manual || undefined);
  },
  enumerable: true
});

/**
 * Resolve the description for this parameter, by looking in the paramSpec
 * and doing a l10n lookup
 */
Object.defineProperty(Parameter.prototype, 'description', {
  get: function() {
    return lookup(this.paramSpec.description || undefined, 'canonDescNone');
  },
  enumerable: true
});

/**
 * Is the user required to enter data for this parameter? (i.e. has
 * defaultValue been set to something other than undefined)
 */
Object.defineProperty(Parameter.prototype, 'isDataRequired', {
  get: function() {
    return this.defaultValue === undefined;
  },
  enumerable: true
});

/**
 * Reflect the paramSpec 'hidden' property (dynamically so it can change)
 */
Object.defineProperty(Parameter.prototype, 'hidden', {
  get: function() {
    return this.paramSpec.hidden;
  },
  enumerable: true
});

/**
 * Are we allowed to assign data to this parameter using positional
 * parameters?
 */
Object.defineProperty(Parameter.prototype, 'isPositionalAllowed', {
  get: function() {
    return this.groupName == null;
  },
  enumerable: true
});

/**
 * JSON serializer that avoids non-serializable data
 */
Object.defineProperty(Parameter.prototype, 'json', {
  get: function() {
    var typeSpec = this.type.remote ?
                   remote.getProxySpecFor(this.type) :
                   this.paramSpec.type;

    var json = {
      name: this.name,
      type: typeSpec,
      description: this.description
    };

    if ('defaultValue' in this.paramSpec && json.type !== 'boolean') {
      json.defaultValue = this.paramSpec.defaultValue;
    }
    if (this.option !== undefined) {
      json.option = this.option;
    }
    if (this.short !== undefined) {
      json.short = this.short;
    }

    return json;
  },
  enumerable: true
});

exports.Parameter = Parameter;


/**
 * A canon is a store for a list of commands
 */
function Canon() {
  // A lookup hash of our registered commands
  this._commands = {};
  // A sorted list of command names, we regularly want them in order, so pre-sort
  this._commandNames = [];
  // A lookup of the original commandSpecs by command name
  this._commandSpecs = {};

  // Enable people to be notified of changes to the list of commands
  this.onCanonChange = util.createEvent('canon.onCanonChange');
}

/**
 * Add a command to the canon of known commands.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * @param commandSpec The command and its metadata.
 * @return The new command
 */
Canon.prototype.addCommand = function(commandSpec) {
  if (this._commands[commandSpec.name] != null) {
    // Roughly canon.removeCommand() without the event call, which we do later
    delete this._commands[commandSpec.name];
    this._commandNames = this._commandNames.filter(function(test) {
      return test !== commandSpec.name;
    });
  }

  var command = new Command(commandSpec);
  this._commands[commandSpec.name] = command;
  this._commandNames.push(commandSpec.name);
  this._commandNames.sort();

  this._commandSpecs[commandSpec.name] = commandSpec;

  this.onCanonChange();
  return command;
};

/**
 * Remove an individual command. The opposite of #addCommand().
 * Removing a non-existent command is a no-op.
 * @param commandOrName Either a command name or the command itself.
 * @return true if a command was removed, false otherwise.
 */
Canon.prototype.removeCommand = function(commandOrName) {
  var name = typeof commandOrName === 'string' ?
          commandOrName :
          commandOrName.name;

  if (!this._commands[name]) {
    return false;
  }

  // See start of canon.addCommand if changing this code
  delete this._commands[name];
  delete this._commandSpecs[name];
  this._commandNames = this._commandNames.filter(function(test) {
    return test !== name;
  });

  this.onCanonChange();
  return true;
};

/**
 * Retrieve a command by name
 * @param name The name of the command to retrieve
 */
Canon.prototype.getCommand = function(name) {
  // '|| undefined' is to silence 'reference to undefined property' warnings
  return this._commands[name] || undefined;
};

/**
 * Get an array of all the registered commands.
 */
Canon.prototype.getCommands = function() {
  return Object.keys(this._commands).map(function(name) {
    return this._commands[name];
  }, this);
};

/**
 * Get an array containing the names of the registered commands.
 */
Canon.prototype.getCommandNames = function() {
  return this._commandNames.slice(0);
};

/**
 * Get access to the stored commandMetaDatas (i.e. before they were made into
 * instances of Command/Parameters) so we can remote them.
 */
Canon.prototype.getCommandSpecs = function() {
  var specs = {};

  Object.keys(this._commands).forEach(function(name) {
    var command = this._commands[name];
    if (!command.noRemote) {
      specs[name] = command.json;
    }
  }.bind(this));

  return specs;
};

/**
 * Add a set of commands that are executed somewhere else.
 * @param prefix The name prefix that we assign to all command names
 * @param commandSpecs Presumably as obtained from getCommandSpecs on remote
 * @param remoter Function to call on exec of a new remote command. This is
 * defined just like an exec function (i.e. that takes args/context as params
 * and returns a promise) with one extra feature, that the context includes a
 * 'commandName' property that contains the original command name.
 * @param to URL-like string that describes where the commands are executed.
 * This is to complete the parent command description.
 */
Canon.prototype.addProxyCommands = function(prefix, commandSpecs, remoter, to) {
  var names = Object.keys(commandSpecs);

  if (this._commands[prefix] != null) {
    throw new Error(l10n.lookupFormat('canonProxyExists', [ prefix ]));
  }

  // We need to add the parent command so all the commands from the other
  // system have a parent
  this.addCommand({
    name: prefix,
    isProxy: true,
    description: l10n.lookupFormat('canonProxyDesc', [ to ]),
    manual: l10n.lookupFormat('canonProxyManual', [ to ])
  });

  names.forEach(function(name) {
    var commandSpec = commandSpecs[name];

    if (commandSpec.noRemote) {
      return;
    }

    if (!commandSpec.isParent) {
      commandSpec.exec = function(args, context) {
        context.commandName = name;
        return remoter(args, context);
      }.bind(this);
    }

    commandSpec.name = prefix + ' ' + commandSpec.name;
    commandSpec.isProxy = true;
    this.addCommand(commandSpec);
  }.bind(this));
};

/**
 * Remove a set of commands added with addProxyCommands.
 * @param prefix The name prefix that we assign to all command names
 */
Canon.prototype.removeProxyCommands = function(prefix) {
  var toRemove = [];
  Object.keys(this._commandSpecs).forEach(function(name) {
    if (name.indexOf(prefix) === 0) {
      toRemove.push(name);
    }
  }.bind(this));

  var removed = [];
  toRemove.forEach(function(name) {
    var command = this.getCommand(name);
    if (command.isProxy) {
      this.removeCommand(name);
      removed.push(name);
    }
    else {
      console.error('Skipping removal of \'' + name +
                    '\' because it is not a proxy command.');
    }
  }.bind(this));

  return removed;
};

var canon = new Canon();

exports.Canon = Canon;
exports.addCommand = canon.addCommand.bind(canon);
exports.removeCommand = canon.removeCommand.bind(canon);
exports.onCanonChange = canon.onCanonChange;
exports.getCommands = canon.getCommands.bind(canon);
exports.getCommand = canon.getCommand.bind(canon);
exports.getCommandNames = canon.getCommandNames.bind(canon);
exports.getCommandSpecs = canon.getCommandSpecs.bind(canon);
exports.addProxyCommands = canon.addProxyCommands.bind(canon);
exports.removeProxyCommands = canon.removeProxyCommands.bind(canon);

/**
 * CommandOutputManager stores the output objects generated by executed
 * commands.
 *
 * CommandOutputManager is exposed to the the outside world and could (but
 * shouldn't) be used before gcli.startup() has been called.
 * This could should be defensive to that where possible, and we should
 * certainly document if the use of it or similar will fail if used too soon.
 */
function CommandOutputManager() {
  this.onOutput = util.createEvent('CommandOutputManager.onOutput');
}

exports.CommandOutputManager = CommandOutputManager;
