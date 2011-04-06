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

var Status = require('cockpit/types').Status;
var types = require('cockpit/types');
var BooleanType = require('cockpit/types').BooleanType;
var Promise = require('cockpit/promise').Promise;


/**
 * A lookup hash of our registered commands
 */
var commands = {};

/**
 * A sorted list of command names, we regularly want them in order, so pre-sort
 */
var commandNames = [];

/**
 *
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
        throw new Error('In ' + this.command.name + ': all params must have a name');
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
            console.error('In ' + this.command.name + '/' + this.name + ': ' + ex);
        }
    }
}

Parameter.prototype = {
    isNamedParam: function(test) {
        return this.regexp && this.regexp.test(test);
    },

    isDataRequired: function() {
        return this.defaultValue === undefined;
    },

    isPositionalAllowed: function() {
        return this.groupName == null;
    }
};

canon.Parameter = Parameter;

/**
 * This registration method isn't like other Ace registration methods because
 * it doesn't return a decorated command because there is no functional
 * decoration to be done.
 * TODO: Are we sure that in the future there will be no such decoration?
 */
function addCommand(command, name) {
    if (typeof command === 'function') {
        if (!command.metadata) {
            throw new Error('Commands registered as functions need metdata');
        }
        if (!command.metadata.name) {
            if (!name) {
                throw new Error('All registered commands must have a name');
            }
            else {
                command.metadata.name = name;
            }
        }
        command.metadata.exec = command;
        command.metadata.functional = true;
        command = command.metadata;
    }
    else {
        command.functional = false;
        command.name = name || command.name;
    }

    commands[command.name] = new Command(command);

    commandNames.push(command.name);
    commandNames.sort();
}

function addCommands(context, name) {
    if (name) {
        if (!context.metadata) {
            throw new Error('name supplied to addCommands (implies command ' +
                'set) but missing metatdata on context');
        }

        addCommand(context.metadata, name);
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
        addCommand(command, name ? name + ' ' + key : key);
    });
}

function removeCommands(context, name) {
    Object.keys(context).forEach(function(key) {
        var command = context[key];
        if (typeof command !== 'function' || !command.metadata) {
            return;
        }
        removeCommand(command.metadata);
    });

    if (name) {
        removeCommand(context.metadata, name);
    }
}

function removeCommand(command) {
    var name = (typeof command === 'string' ? command : command.name);
    delete commands[name];
    lang.arrayRemove(commandNames, name);
}

function getCommand(name) {
    return commands[name];
}

function getCommands() {
    return Object.keys(commands).map(function(name) {
        return commands[name];
    }, this);
}

function getCommandNames() {
    return commandNames;
}

var cacheEnv;
function getEnvironment() {
    return cacheEnv;
}

function createPromise() {
    return new Promise();
}

/**
 * Entry point for keyboard accelerators or anything else that wants to execute
 * a command.
 * @param command Either a command, or the name of one
 * @param env Current environment to execute the command in
 * @param args Arguments for the command
 * @param typed The typed command
 */
function exec(command, env, args, typed) {
    if (typeof command === 'string') {
        command = commands[command];
    }
    if (!command) {
        // TODO: Should we complain more than returning false?
        return false;
    }

    args = args || {};
    cacheEnv = env;

    var request = new Request({
        command: command,
        args: args,
        typed: typed
    });

    var reply;
    try {
        if (command.functional) {
            var argValues = Object.keys(args).map(function(key) {
                return args[key];
            });
            var context = command.context || command;
            reply = command.exec.apply(context, argValues);
        }
        else {
            reply = command.exec(env, args);
        }

        function onComplete(output, error) {
            request.error = error;
            request.output = output;
            request.completed = true;
            request.end = new Date();
            request.duration = request.end.getTime() - request.start.getTime();
        }

        if (reply.isPromise) {
            reply.then(onSuccess, onError);
            // TODO: Add progress to out promise and add a handler for it here
            canon._dispatchEvent('output', {
                requests: requests,
                request: request
            });
        }
        else {
            onComplete(reply, false);
        }
    }
    catch (ex) {
        onComplete(ex, true);
    }

    requests.push(request);
    // This could probably be optimized with some maths, but 99.99% of the
    // time we will only be off by one, and I'm feeling lazy.
    while (requests.length > maxRequestLength) {
        requests.shiftObject();
    }
    canon._dispatchEvent('output', { requests: requests, request: request });

    cacheEnv = null;

    return true;
}

canon.removeCommand = removeCommand;
canon.removeCommands = removeCommands;
canon.addCommand = addCommand;
canon.addCommands = addCommands;
canon.getCommand = getCommand;
canon.getCommands = getCommands;
canon.getCommandNames = getCommandNames;
canon.exec = exec;
canon.createPromise = createPromise;
canon.getEnvironment = getEnvironment;


/**
 * We publish a 'output' event whenever new command begins output
 * TODO: make this more obvious
 */
oop.implement(canon, EventEmitter);


/**
 * Current requirements are around displaying the command line, and provision
 * of a 'history' command and cursor up|down navigation of history.
 * <p>Future requirements could include:
 * <ul>
 * <li>Multiple command lines
 * <li>The ability to recall key presses (i.e. requests with no output) which
 * will likely be needed for macro recording or similar
 * <li>The ability to store the command history either on the server or in the
 * browser local storage.
 * </ul>
 * <p>The execute() command doesn't really live here, except as part of that
 * last future requirement, and because it doesn't really have anywhere else to
 * live.
 */

/**
 * The array of requests that wish to announce their presence
 */
var requests = [];

/**
 * How many requests do we store?
 */
var maxRequestLength = 100;

/**
 * To create an invocation, you need to do something like this (all the ctor
 * args are optional):
 * <pre>
 * var request = new Request({
 *     command: command,
 *     args: args,
 *     typed: typed
 * });
 * </pre>
 * @constructor
 */
function Request(options) {
    options = options || {};

    this.command = options.command;
    this.args = options.args;
    this.typed = options.typed;

    this.start = new Date();
    this.end = null;
    this.completed = false;
    this.error = false;
    this.output = null;
};


});
