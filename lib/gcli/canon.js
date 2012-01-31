/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var canon = exports;


var util = require('gcli/util');
var l10n = require('gcli/l10n');

var types = require('gcli/types');
var Status = require('gcli/types').Status;
var BooleanType = require('gcli/types/basic').BooleanType;


/**
 * A lookup hash of our registered commands
 */
var commands = {};

/**
 * A sorted list of command names, we regularly want them in order, so pre-sort
 */
var commandNames = [];

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
        console.error('Parameters can\'t come after param groups.' +
            ' Ignoring ' + this.name + '/' + spec.name);
      }
      else {
        var param = new Parameter(spec, this, null);
        this.params.push(param);
      }
    }
    else {
      spec.params.forEach(function(ispec) {
        var param = new Parameter(ispec, this, spec.group);
        this.params.push(param);
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

  Object.keys(paramSpec).forEach(function(key) {
    this[key] = paramSpec[key];
  }, this);

  this.description = 'description' in this ? this.description : undefined;
  this.description = lookup(this.description, 'canonDescNone');
  this.manual = 'manual' in this ? this.manual : undefined;
  this.manual = lookup(this.manual);
  this.groupName = groupName;

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
    if ('defaultValue' in this) {
      console.error('In ' + this.command.name + '/' + this.name +
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
        console.error('In ' + this.command.name + '/' + this.name +
            ': Error round tripping defaultValue. status = ' +
            defaultConversion.getStatus());
      }
    }
    catch (ex) {
      console.error('In ' + this.command.name + '/' + this.name +
        ': ' + ex);
    }
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
 * Is the user required to enter data for this parameter? (i.e. has
 * defaultValue been set to something other than undefined)
 */
Parameter.prototype.isDataRequired = function() {
  return this.defaultValue === undefined;
};

/**
 * Are we allowed to assign data to this parameter using positional
 * parameters?
 */
Parameter.prototype.isPositionalAllowed = function() {
  return this.groupName == null;
};

canon.Parameter = Parameter;


/**
 * Add a command to the canon of known commands.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * @param commandSpec The command and its metadata.
 * @return The new command
 */
canon.addCommand = function addCommand(commandSpec) {
  var command = new Command(commandSpec);
  commands[commandSpec.name] = command;
  commandNames.push(commandSpec.name);
  commandNames.sort();

  canon.canonChange();
  return command;
};

/**
 * Remove an individual command. The opposite of #addCommand().
 * @param commandOrName Either a command name or the command itself.
 */
canon.removeCommand = function removeCommand(commandOrName) {
  var name = typeof commandOrName === 'string' ?
          commandOrName :
          commandOrName.name;
  delete commands[name];
  commandNames = commandNames.filter(function(test) {
    return test !== name;
  });

  canon.canonChange();
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
 * Enable people to be notified of changes to the list of commands
 */
canon.canonChange = util.createEvent('canon.canonChange');

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
  this._event = util.createEvent('CommandOutputManager');
}

/**
 * Call this method to notify the manager (and therefore all listeners) of a
 * new or updated command output.
 * @param output The command output object that has been created or updated.
 */
CommandOutputManager.prototype.sendCommandOutput = function(output) {
  this._event({ output: output });
};

/**
 * Register a function to be called whenever there is a new command output
 * object.
 */
CommandOutputManager.prototype.addListener = function(fn, ctx) {
  this._event.add(fn, ctx);
};

/**
 * Undo the effects of CommandOutputManager.addListener()
 */
CommandOutputManager.prototype.removeListener = function(fn, ctx) {
  this._event.remove(fn, ctx);
};

canon.CommandOutputManager = CommandOutputManager;

/**
 * We maintain a global command output manager for the majority case where
 * there is only one important set of outputs.
 */
canon.commandOutputManager = new CommandOutputManager();


});
