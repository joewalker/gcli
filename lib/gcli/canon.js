/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Joe Walker (jwalker@mozilla.com) (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
var canon = exports;


var console = require('gcli/util').console;
var createEvent = require('gcli/util').createEvent;

var Status = require('gcli/types').Status;
var types = require('gcli/types');
var BooleanType = require('gcli/types').BooleanType;


/**
 * A lookup hash of our registered commands
 */
var commands = {};

/**
 * A sorted list of command names, we regularly want them in order, so pre-sort
 */
var commandNames = [];

/**
 * The command object is mostly just setup around a commandSpec (as passed to
 * #addCommand()). It provides some helpers like #getDescription() which is a
 * safe .description.
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

    // Parameters work out a short name for themselves, but to do this they
    // need a complete list of the paramNames
    var paramNames = [];
    var paramSpecs = this.params;
    this.params = [];

    paramSpecs.forEach(function(spec) {
        if (spec.group) {
            spec.params.forEach(function(paramSpec) {
                paramNames.push(paramSpec.name);
            }, this);
        }
        else {
            paramNames.push(spec.name);
        }
    }, this);

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
            if (usingGroups) {
                console.error('Parameters can\'t come after param groups.' +
                        ' Ignoring ' + this.name + '/' + spec.name);
            }
            else {
                var param = new Parameter(spec, this, paramNames, null);
                this.params.push(param);
            }
        }
        else {
            spec.params.forEach(function(ispec) {
                var param = new Parameter(ispec, this, paramNames, spec.group);
                this.params.push(param);
            }, this);

            usingGroups = true;
        }
    }, this);
};

/**
 * A safe version of '.description' returning '(No description)' when there
 * is no description available.
 */
Command.prototype.getDescription = function() {
    return this.description ? this.description : '(No description)';
};


/**
 * A wrapper for a paramSpec so we can sort out shortened versions names for
 * option switches
 */
function Parameter(paramSpec, command, paramNames, groupName) {
    this.command = command || { name: 'unnamed' };

    Object.keys(paramSpec).forEach(function(key) {
        this[key] = paramSpec[key];
    }, this);
    this.description = this.description || '';
    this.groupName = groupName;

    if (!this.name) {
        throw new Error('In ' + this.command.name +
            ': all params must have a name');
    }

    // Find the shortest unique prefix of this name
    if (paramNames) {
        var uniquePrefix = this.name[0];
        for (var i = 0; i < paramNames.length; i++) {
            // Lengthen while unique is a prefix of testParam.name
            while (paramNames[i].indexOf(uniquePrefix) === 0 &&
                    uniquePrefix !== this.name) {
                uniquePrefix = this.name.substr(0, uniquePrefix.length + 1);
            }
            if (uniquePrefix === this.name) {
                break;
            }
        }
        this.uniquePrefix = uniquePrefix;
        this.regexp = new RegExp('^--?' + this.uniquePrefix);
    }

    var lookup = this.type;
    this.type = types.getType(lookup);
    if (this.type == null) {
        console.error('Known types: ' + types.getTypeNames().join(', '));
        throw new Error('In ' + this.command.name + '/' + this.name +
            ': can\'t find type for: ' + JSON.stringify(lookup));
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

    // Check the defaultValue for validity. Unnecessary?
    if (this.defaultValue !== undefined) {
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
    return this.regexp && this.regexp.test(name);
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
 */
canon.addCommand = function addCommand(commandSpec) {
    commandSpec.functional = false;

    commands[commandSpec.name] = new Command(commandSpec);
    commandNames.push(commandSpec.name);
    commandNames.sort();

    canon.canonChange();
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
    return commands[name];
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
canon.canonChange = createEvent('canon.canonChange');

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
    this._event = createEvent('CommandOutputManager');
}

/**
 * Call this method to notify the manager (and therefor all listeners) of a new
 * or updated command output.
 * @param output The command output object that has been created or updated.
 */
CommandOutputManager.prototype.sendCommandOutput = function(output) {
    this._event({ output: output });
};

/**
 * Register a function to be called whenever there is a new command output
 * object.
 */
CommandOutputManager.prototype.addListener = function (fn, ctx) {
    this._event.add(fn, ctx);
};

canon.CommandOutputManager = CommandOutputManager;

/**
 * We maintain a global command output manager for the majority case where there
 * is only one important set of outputs.
 */
canon.commandOutputManager = new CommandOutputManager();


});
