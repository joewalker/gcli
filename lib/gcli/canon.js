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


var console = require('pilot/console');
var oop = require('pilot/oop');
var EventEmitter = require('pilot/event_emitter').EventEmitter;
var lang = require('pilot/lang');

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
        paramNames.push(spec.name);
    }, this);

    // Track if the user is trying to mix default params and param groups.
    // All the default parameters must come before all the param groups.
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
        } else {
            spec.params.forEach(function(ispec) {
                var param = new Parameter(ispec, this, paramNames, spec.group);
                this.params.push(param);
            }, this);

            usingGroups = true;
        }
    }, this);
};

Command.prototype = {
    /**
     * A safe version of '.description' returning '(No description)' when there
     * is no description available.
     */
    getDescription: function() {
        return this.description ? this.description : '(No description)';
    }
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

Parameter.prototype = {
    /**
     * Does the given name uniquely identify this param (among the other params
     * in this command)
     * @param name The name to check
     */
    isKnownAs: function(name) {
        return this.regexp && this.regexp.test(name);
    },

    /**
     * Is the user required to enter data for this parameter? (i.e. has
     * defaultValue been set to something other than undefined)
     */
    isDataRequired: function() {
        return this.defaultValue === undefined;
    },

    /**
     * Are we allowed to assign data to this parameter using positional
     * parameters?
     */
    isPositionalAllowed: function() {
        return this.groupName == null;
    }
};

canon.Parameter = Parameter;

/**
 * Add a command to the canon of known commands.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * TODO: ensure this command works as documented
 * @param commandSpec The command and its metadata.
 * @param name When commands are added via addCommands() their names are
 * exposed only via the properties to which the functions are attached. This
 * allows addCommands() to inform the command what its name is.
 */
canon.addCommand = function addCommand(commandSpec, name) {
    if (typeof commandSpec === 'function') {
        if (!commandSpec.metadata) {
            throw new Error('Commands registered as functions need metdata');
        }

        if (!commandSpec.metadata.name) {
            if (!name) {
                throw new Error('All registered commands must have a name');
            }
            else {
                commandSpec.metadata.name = name;
            }
        }

        commandSpec.metadata.exec = commandSpec;
        commandSpec.metadata.functional = true;
        commandSpec = commandSpec.metadata;
    }
    else {
        commandSpec.functional = false;
        commandSpec.name = name || commandSpec.name;
    }

    commands[commandSpec.name] = new Command(commandSpec);
    commandNames.push(commandSpec.name);
    commandNames.sort();
};

/**
 * Remove an individual command. The opposite of #addCommand().
 * @param commandOrName Either a command name or the command itself.
 */
canon.removeCommand = function removeCommand(commandOrName) {
    var name = typeof command === 'string' ?
        commandOrName :
        commandOrName.name;
    delete commands[name];
    lang.arrayRemove(commandNames, name);
};

/**
 * Take a command object and register all the commands that it contains.
 * This function is exposed to the outside world (via gcli/index). It is
 * documented in docs/index.md for all the world to see.
 * TODO: ensure this command works as documented
 * @param context The command object which contains the commands to be
 * registered.
 * @param name The name of the base command (for a command set)
 */
canon.addCommands = function addCommands(context, name) {
    if (name) {
        if (!context.metadata) {
            throw new Error('name supplied to addCommands (implies command ' +
                'set) but missing metatdata on context');
        }

        canon.addCommand(context.metadata, name);
    }

    Object.keys(context).forEach(function(key) {
        var command = context[key];
        if (typeof command !== 'function') {
            return;
        }
        command.metadata = command.metadata || context[key + 'Metadata'];
        if (!command.metadata) {
            return;
        }
        command.metadata.context = command.metadata.context || context;
        canon.addCommand(command, name ? name + ' ' + key : key);
    });
};

/**
 * Remove a group of commands. The opposite of #addCommands().
 * @param context The command object which contains the commands to be
 * registered.
 * @param name The name of the base command (for a command set)
 */
canon.removeCommands = function removeCommands(context, name) {
    Object.keys(context).forEach(function(key) {
        var command = context[key];
        if (typeof command !== 'function' || !command.metadata) {
            return;
        }
        canon.removeCommand(command.metadata);
    });

    if (name) {
        canon.removeCommand(context.metadata, name);
    }
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
    return Object.keys(commands).map(function(name) {
        return commands[name];
    }, this);
};

/**
 * Get an array containing the names of the registered commands.
 * WARNING: This returns live data. Do not mutate the returned array.
 */
canon.getCommandNames = function getCommandNames() {
    return commandNames;
};

/**
 * ReportList stores the reports generated by executed commands.
 * It manages the correct length of reports, and informs listeners of new
 * reports.
 */
function ReportList() {
    // The array of requests that wish to announce their presence
    this._reports = [];
}

canon.ReportList = ReportList;

/**
 * We publish a 'output' event whenever new command begins output
 * TODO: make this more obvious
 */
oop.implement(ReportList.prototype, EventEmitter);

/**
 * How many requests do we store?
 */
ReportList.prototype.maxRequestLength = 100;

/**
 * Add a list to the set of known reports.
 * @param report The report to add to the list.
 */
ReportList.prototype.addReport = function(report) {
    this._reports.push(report);
    // This could probably be optimized with some maths, but 99.99% of
    // the time we will only be off by one, and I'm feeling lazy.
    while (this._reports.length > this.maxRequestLength) {
        this._reports.shiftObject();
    }
    this._dispatchEvent('output', { request: report });
};

/**
 * We maintain a global report list for the majority case where there is only
 * one important set of reports.
 */
canon.globalReportList = new ReportList();


});
