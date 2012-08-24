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
var canon = exports;


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var types = require('gcli/types');
var Status = require('gcli/types').Status;
var BooleanType = require('gcli/types/basic').BooleanType;
var SelectionType = require('gcli/types/selection').SelectionType;

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

  // Track if the user is trying to mix default params and param groups.
  // All the non-grouped parameters must come before all the param groups
  // because non-grouped parameters can be assigned positionally, so their
  // index is important. We don't want 'holes' in the order caused by
  // parameter groups.
  var usingGroups = false;

  if (this.returnType == null) {
    this.returnType = 'string';
  }

  // In theory this could easily be made recursive, so param groups could
  // contain nested param groups. Current thinking is that the added
  // complexity for the UI probably isn't worth it, so this implementation
  // prevents nesting.
  paramSpecs.forEach(function(spec) {
    if (!spec.group) {
      if (usingGroups) {
        throw new Error('Parameters can\'t come after param groups.' +
                        ' Ignoring ' + this.name + '/' + spec.name);
      }
      else {
        var param = new Parameter(spec, this, null);
        this.params.push(param);

        if (!param.isPositionalAllowed) {
          this.hasNamedParameters = true;
        }
      }
    }
    else {
      spec.params.forEach(function(ispec) {
        var param = new Parameter(ispec, this, spec.group);
        this.params.push(param);

        if (!param.isPositionalAllowed) {
          this.hasNamedParameters = true;
        }
      }, this);

      usingGroups = true;
    }
  }, this);
}

canon.Command = Command;


/**
 * A wrapper for a paramSpec so we can sort out shortened versions names for
 * option switches
 */
function Parameter(paramSpec, command, groupName) {
  this.command = command || { name: 'unnamed' };
  this.paramSpec = paramSpec;
  this.name = this.paramSpec.name;
  this.type = this.paramSpec.type;
  this.groupName = groupName;
  this.defaultValue = this.paramSpec.defaultValue;

  if (!this.name) {
    throw new Error('In ' + this.command.name +
                    ': all params must have a name');
  }

  var typeSpec = this.type;
  this.type = types.getType(typeSpec);
  if (this.type == null) {
    console.error('Known types: ' + types.getTypeNames().join(', '));
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': can\'t find type for: ' + JSON.stringify(typeSpec));
  }

  // boolean parameters have an implicit defaultValue:false, which should
  // not be changed. See the docs.
  if (this.type instanceof BooleanType) {
    if (this.defaultValue !== undefined) {
      throw new Error('In ' + this.command.name + '/' + this.name +
                      ': boolean parameters can not have a defaultValue.' +
                      ' Ignoring');
    }
    this.defaultValue = false;
  }

  // Check the defaultValue for validity.
  // Both undefined and null get a pass on this test. undefined is used when
  // there is no defaultValue, and null is used when the parameter is
  // optional, neither are required to parse and stringify.
  if (this.defaultValue != null) {
    try {
      var defaultText = this.type.stringify(this.defaultValue);
      var defaultConversion = this.type.parseString(defaultText);
      if (defaultConversion.getStatus() !== Status.VALID) {
        throw new Error('In ' + this.command.name + '/' + this.name +
                        ': Error round tripping defaultValue. status = ' +
                        defaultConversion.getStatus());
      }
    }
    catch (ex) {
      throw new Error('In ' + this.command.name + '/' + this.name +
                      ': ' + ex);
    }
  }

  // Some types (boolean, array) have a non 'undefined' blank value. Give the
  // type a chance to override the default defaultValue of undefined
  if (this.defaultValue === undefined) {
    this.defaultValue = this.type.getBlank().value;
  }

  // All parameters that can only be set via a named parameter must have a
  // non-undefined default value
  if (!this.isPositionalAllowed && this.defaultValue === undefined) {
    throw new Error('In ' + this.command.name + '/' + this.name +
                    ': Missing defaultValue for optional parameter.');
  }
}

/**
 * Does the given name uniquely identify this param (among the other params
 * in this command)
 * @param name The name to check
 */
Parameter.prototype.isKnownAs = function(name) {
  if (name === '--' + this.name) {
    return true;
  }
  return false;
};

/**
 * Read the default value for this parameter either from the parameter itself
 * (if this function has been over-ridden) or from the type, or from calling
 * parseString on an empty string
 */
Parameter.prototype.getBlank = function() {
  if (this.type.getBlank) {
    return this.type.getBlank();
  }

  return this.type.parseString('');
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

canon.Parameter = Parameter;


/**
 * A lookup hash of our registered commands
 */
var commands = {};

/**
 * A sorted list of command names, we regularly want them in order, so pre-sort
 */
var commandNames = [];

/**
 * A lookup of the original commandSpecs by command name
 */
var commandSpecs = {};

/**
 * Add a command to the canon of known commands.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * @param commandSpec The command and its metadata.
 * @return The new command
 */
canon.addCommand = function addCommand(commandSpec) {
  if (commands[commandSpec.name] != null) {
    // Roughly canon.removeCommand() without the event call, which we do later
    delete commands[commandSpec.name];
    commandNames = commandNames.filter(function(test) {
      return test !== commandSpec.name;
    });
  }

  var command = new Command(commandSpec);
  commands[commandSpec.name] = command;
  commandNames.push(commandSpec.name);
  commandNames.sort();

  commandSpecs[commandSpec.name] = commandSpec;

  canon.onCanonChange();
  return command;
};

/**
 * Remove an individual command. The opposite of #addCommand().
 * Removing a non-existent command is a no-op.
 * @param commandOrName Either a command name or the command itself.
 * @return true if a command was removed, false otherwise.
 */
canon.removeCommand = function removeCommand(commandOrName) {
  var name = typeof commandOrName === 'string' ?
          commandOrName :
          commandOrName.name;

  if (!commands[name]) {
    return false;
  }

  // See start of canon.addCommand if changing this code
  delete commands[name];
  delete commandSpecs[name];
  commandNames = commandNames.filter(function(test) {
    return test !== name;
  });

  canon.onCanonChange();
  return true;
};

/**
 * Retrieve a command by name
 * @param name The name of the command to retrieve
 */
canon.getCommand = function getCommand(name) {
  // '|| undefined' is to silence 'reference to undefined property' warnings
  return commands[name] || undefined;
};

/**
 * Get an array of all the registered commands.
 */
canon.getCommands = function getCommands() {
  // return Object.values(commands);
  return Object.keys(commands).map(function(name) {
    return commands[name];
  }, this);
};

/**
 * Get an array containing the names of the registered commands.
 */
canon.getCommandNames = function getCommandNames() {
  return commandNames.slice(0);
};

/**
 * Get access to the stored commandMetaDatas (i.e. before they were made into
 * instances of Command/Parameters) so we can remote them.
 */
canon.getCommandSpecs = function getCommandSpecs() {
  return commandSpecs;
};

/**
 * Enable people to be notified of changes to the list of commands
 */
canon.onCanonChange = util.createEvent('canon.onCanonChange');

/**
 * CommandOutputManager stores the output objects generated by executed
 * commands.
 *
 * CommandOutputManager is exposed (via canon.commandOutputManager) to the the
 * outside world and could (but shouldn't) be used before gcli.startup() has
 * been called. This could should be defensive to that where possible, and we
 * should certainly document if the use of it or similar will fail if used too
 * soon.
 */
function CommandOutputManager() {
  this.onOutput = util.createEvent('CommandOutputManager.onOutput');
}

canon.CommandOutputManager = CommandOutputManager;

/**
 * We maintain a global command output manager for the majority case where
 * there is only one important set of outputs.
 */
canon.commandOutputManager = new CommandOutputManager();


});
