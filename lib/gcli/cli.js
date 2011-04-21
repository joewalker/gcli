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
 * The Original Code is Skywriter.
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
var cli = exports;


var console = require('pilot/console');
var lang = require('pilot/lang');
var oop = require('pilot/oop');
var EventEmitter = require('pilot/event_emitter').EventEmitter;

var canon = require('gcli/canon');

var types = require('gcli/types');
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var ArrayType = require('gcli/types').ArrayType;
var StringType = require('gcli/types').StringType;
var BooleanType = require('gcli/types').BooleanType;
var SelectionType = require('gcli/types').SelectionType;

var Argument = require('gcli/argument').Argument;
var ArrayArgument = require('gcli/argument').ArrayArgument;
var NamedArgument = require('gcli/argument').NamedArgument;
var TrueNamedArgument = require('gcli/argument').TrueNamedArgument;
var MergedArgument = require('gcli/argument').MergedArgument;


/**
 * Assignment is a link between a parameter and the data for that parameter.
 * The data for the parameter is available as in the preferred type and as
 * an Argument for the CLI.
 * <p>We also record validity information where applicable.
 * <p>For values, null and undefined have distinct definitions. null means
 * that a value has been provided, undefined means that it has not.
 * Thus, null is a valid default value, and common because it identifies an
 * parameter that is optional. undefined means there is no value from
 * the command line.
 *
 * <h2>Events<h2>
 * Assignment publishes the following event:<ul>
 * <li>assignmentChange: Either the value or the text has changed. It is likely
 * that any UI component displaying this argument will need to be updated.
 * The event object looks like:
 * <tt>{ assignment: ..., conversion: ..., oldConversion: ... }</tt>
 * @constructor
 */
function Assignment(param, paramIndex) {
    this.param = param;
    this.paramIndex = paramIndex;

    this.setDefault();
};

cli.Assignment = Assignment;

oop.implement(Assignment.prototype, EventEmitter);

/**
 * The parameter that we are assigning to
 * @readonly
 */
Assignment.prototype.param = undefined;

Assignment.prototype.conversion = undefined;

/**
 * The index of this parameter in the parent Requisition. paramIndex === -1
 * is the command assignment although this should not be relied upon, it is
 * better to test param instanceof CommandAssignment
 */
Assignment.prototype.paramIndex = undefined;

/**
 * Easy accessor for conversion.arg
 */
Assignment.prototype.getArg = function() {
    return this.conversion.arg;
};

/**
 * Easy accessor for conversion.value
 */
Assignment.prototype.getValue = function() {
    return this.conversion.value;
};

/**
 * Easy (and safe) accessor for conversion.message
 */
Assignment.prototype.getMessage = function() {
    return this.conversion.message ? this.conversion.message : '';
};

/**
 * Easy (and safe) accessor for conversion.predictions
 */
Assignment.prototype.getPredictions = function() {
    return this.conversion.predictions ? this.conversion.predictions : [];
};

/**
 * Report on the status of the last parse() conversion.
 * We force mutations to happen through this method rather than have
 * setValue and setArgument functions to help maintain integrity when we
 * have ArrayArguments and don't want to get confused. This way assignments
 * are just containers for a conversion rather than things that store
 * a connection between an arg/value.
 * @see types.Conversion
 */
Assignment.prototype.setConversion = function(conversion) {
    var oldConversion = this.conversion;

    this.conversion = conversion;
    this.conversion.assign(this);

    if (this.conversion.equals(oldConversion)) {
        return;
    }

    this._dispatchEvent('assignmentChange', {
        assignment: this,
        conversion: this.conversion,
        oldConversion: oldConversion
    });
};

/**
 * Find a default value for the conversion either from the parameter, or from
 * the type, or failing that by parsing an empty argument.
 */
Assignment.prototype.setDefault = function() {
    var conversion;
    if (this.param.getDefault) {
        conversion = this.param.getDefault();
    }
    else if (this.param.type.getDefault) {
        conversion = this.param.type.getDefault();
    }
    else {
        conversion = this.param.type.parse(new Argument());
    }

    this.setConversion(conversion);
};

/**
 * Make sure that there is some content for this argument by using an
 * Argument of '' if needed.
 * <p>TODO: It isn't clear if we should be sending events from this method.
 * It should only be called when structural changes are happening in which
 * case we're going to ignore the event anyway. But on the other hand
 * perhaps this function shouldn't need to know how it is used, and should
 * do the inefficient thing.
 */
Assignment.prototype.ensureVisibleArgument = function() {
    if (!this.conversion.arg.isBlank()) {
        return false;
    }

    var arg = this.conversion.arg.beget('', {
        prefixSpace: this.param instanceof CommandAssignment
    });
    this.conversion = this.param.type.parse(arg);
    this.conversion.assign(this);

    return true;
};

/**
 * Work out what the status of the current conversion is which involves looking
 * not only at the conversion, but also checking if data has been provided
 * where it should.
 * @param arg For assignments with multiple args (e.g. array assignments) we
 * can narrow the search for status to a single argument.
 */
Assignment.prototype.getStatus = function(arg) {
    if (this.param.isDataRequired() && !this.conversion.isDataProvided()) {
        return Status.ERROR;
    }

    // Selection/Boolean types with a defined range of values will say that
    // '' is INCOMPLETE, but the parameter may be optional, so we don't ask
    // if the user doesn't need to enter something and hasn't done so.
    if (!this.param.isDataRequired() && this.getArg().isBlank()) {
        return Status.VALID;
    }

    return this.conversion.getStatus(arg);
};

/**
 * Basically <tt>value = conversion.predictions[0])</tt> done in a safe
 * way.
 */
Assignment.prototype.complete = function() {
    if (this.conversion.predictions &&
            this.conversion.predictions.length > 0) {
        var value = this.conversion.predictions[0];
        var text = this.param.type.stringify(value);
        var arg = this.conversion.arg.beget(text);
        var conversion = new Conversion(value, arg);
        this.setConversion(conversion);
    }
};

/**
 * Replace the current value with the lower value if such a concept
 * exists.
 */
Assignment.prototype.decrement = function() {
    var replacement = this.param.type.decrement(this.conversion.value);
    if (replacement != null) {
        var str = this.param.type.stringify(replacement);
        var arg = this.conversion.arg.beget(str);
        var conversion = new Conversion(replacement, arg);
        this.setConversion(conversion);
    }
};

/**
 * Replace the current value with the higher value if such a concept
 * exists.
 */
Assignment.prototype.increment = function() {
    var replacement = this.param.type.increment(this.conversion.value);
    if (replacement != null) {
        var str = this.param.type.stringify(replacement);
        var arg = this.conversion.arg.beget(str);
        var conversion = new Conversion(replacement, arg);
        this.setConversion(conversion);
    }
};

/**
 * Helper when we're rebuilding command lines.
 */
Assignment.prototype.toString = function() {
    return this.conversion.toString();
};


/**
 * Select from the available commands
 */
var command = new SelectionType({
    name: 'command',
    data: function() {
        return canon.getCommands();
    },
    stringify: function(command) {
        return command.name;
    },
    fromString: function(str) {
        return canon.getCommand(str);
    }
});


/**
 * Registration and de-registration.
 */
cli.startup = function() {
    types.registerType(command);

    CommandAssignment.prototype = new Assignment(new canon.Parameter({
        name: '__command',
        type: 'command',
        description: 'The command to execute'
    }), -1);

    CommandAssignment.prototype.getStatus = function(arg) {
        return Status.combine(
            Assignment.prototype.getStatus.call(this, arg),
            this.conversion.value && !this.conversion.value.exec ?
                Status.INCOMPLETE : Status.VALID
        );
    };

    UnassignedAssignment.prototype = new Assignment(new canon.Parameter({
        name: '__unassigned',
        type: 'string'
    }), -1);

    UnassignedAssignment.prototype.getStatus = function(arg) {
        return Status.ERROR;
    };

    UnassignedAssignment.prototype.setUnassigned = function(args) {
        if (!args || args.length === 0) {
            this.setDefault();
        }
        else {
            var conversion = this.param.type.parse(new MergedArgument(args));
            this.setConversion(conversion);
        }
    };
};

cli.shutdown = function() {
    types.unregisterType(command);
};


/**
 * This is a special assignment to reflect the command itself.
 */
function CommandAssignment() { }

/**
 * Special assignment used when ignoring parameters that don't have a home
 */
function UnassignedAssignment() { }


/**
 * A Requisition collects the information needed to execute a command.
 * There is no point in a requisition for parameter-less commands because there
 * is no information to collect. A Requisition is a collection of assignments
 * of values to parameters, each handled by an instance of Assignment.
 *
 * <h2>Events<h2>
 * <p>Requisition publishes the following events:
 * <ul>
 * <li>commandChange: The command has changed. It is likely that a UI
 * structure will need updating to match the parameters of the new command.
 * The event object looks like { command: A }
 * <li>assignmentChange: This is a forward of the Assignment.assignmentChange
 * event. It is fired when any assignment (except the commandAssignment)
 * changes.
 * <li>inputChange: The text to be mirrored in a command line has changed.
 * The event object looks like { newText: X }.
 * </ul>
 * @constructor
 */
function Requisition(env) {
    this.env = env;

    // The command that we are about to execute.
    // @see setCommandConversion()
    this.commandAssignment = new CommandAssignment();

    // The object that stores of Assignment objects that we are filling out.
    // The Assignment objects are stored under their param.name for named
    // lookup. Note: We make use of the property of Javascript objects that
    // they are not just hashmaps, but linked-list hashmaps which iterate in
    // insertion order.
    // _assignments excludes the commandAssignment.
    this._assignments = {};

    // The count of assignments. Excludes the commandAssignment
    this.assignmentCount = 0;

    // Used to store cli arguments in the order entered on the cli
    this._args = null;

    // Used to store cli arguments that were not assigned to parameters
    this._unassigned = new UnassignedAssignment();

    // Temporarily set this to true to prevent _onAssignmentChange resetting
    // argument positions
    this._structuralChangeInProgress = false;

    // Pre-bind the event listeners
    var listener = this._onCommandAssignmentChange.bind(this);
    this.commandAssignment.addEventListener('assignmentChange', listener);

    // We're going to register and un-register this a few times ...
    this._onAssignmentChange = this._onAssignmentChange.bind(this);

    this.reportList = canon.globalReportList;
}

cli.Requisition = Requisition;

oop.implement(Requisition.prototype, EventEmitter);

/**
 * Some number that is higher than the most args we'll ever have. Would use
 * MAX_INTEGER if that made sense
 */
var MORE_THAN_THE_MOST_ARGS = 1000000;

/**
 * When any assignment changes,
 */
Requisition.prototype._onAssignmentChange = function(ev) {
    // Don't report an event if the value is unchanged
    if (ev.oldConversion != null &&
            ev.conversion.valueEquals(ev.oldConversion)) {
        return;
    }

    if (this._structuralChangeInProgress) {
        return;
    }

    this._dispatchEvent('assignmentChange', ev);

    // Both for argument position and the inputChange event, we only care
    // about changes to the argument.
    if (ev.conversion.argEquals(ev.oldConversion)) {
        return;
    }

    this._structuralChangeInProgress = true;

    // Do preceding arguments need to have dummy values applied so we don't
    // get a hole in the command line?
    if (ev.assignment.param.isPositionalAllowed()) {
        for (var i = 0; i < ev.assignment.paramIndex; i++) {
            var assignment = this.getAssignment(i);
            if (assignment.param.isPositionalAllowed()) {
                if (assignment.ensureVisibleArgument()) {
                    this._args.push(assignment.getArg());
                }
            }
        }
    }

    // Remember where we found the first match
    var index = MORE_THAN_THE_MOST_ARGS;
    for (var i = 0; i < this._args.length; i++) {
        if (this._args[i].assignment === ev.assignment) {
            if (i < index) {
                index = i;
            }
            this._args.splice(i, 1);
            i--;
        }
    }

    if (index === MORE_THAN_THE_MOST_ARGS) {
        this._args.push(ev.assignment.getArg());
    }
    else {
        // TODO: is there a way to do this that doesn't involve a loop?
        var newArgs = ev.conversion.arg.getArgs();
        for (var i = 0; i < newArgs.length; i++) {
            this._args.splice(index + i, 0, newArgs[i]);
        }
    }
    this._structuralChangeInProgress = false;

    this._dispatchEvent('inputChange', { });
};

/**
 * When the command changes, we need to keep a bunch of stuff in sync
 */
Requisition.prototype._onCommandAssignmentChange = function(ev) {
    this._assignments = {};

    var command = this.commandAssignment.getValue();
    if (command) {
        for (var i = 0; i < command.params.length; i++) {
            var param = command.params[i];
            var assignment = new Assignment(param, i);
            assignment.addEventListener('assignmentChange',
                    this._onAssignmentChange);
            this._assignments[param.name] = assignment;
        }
    }
    this.assignmentCount = Object.keys(this._assignments).length;

    this._dispatchEvent('commandChange', {
        requisition: this,
        oldValue: ev.oldValue,
        newValue: command
    });
};

/**
 * Assignments have an order, so we need to store them in an array.
 * But we also need named access ...
 */
Requisition.prototype.getAssignment = function(nameOrNumber) {
    var name = (typeof nameOrNumber === 'string') ?
        nameOrNumber :
        Object.keys(this._assignments)[nameOrNumber];
    return this._assignments[name];
},

/**
 * Where parameter name == assignment names - they are the same.
 */
Requisition.prototype.getParameterNames = function() {
    return Object.keys(this._assignments);
},

/**
 * A *shallow* clone of the assignments.
 * This is useful for systems that wish to go over all the assignments
 * finding values one way or another and wish to trim an array as they go.
 */
Requisition.prototype.cloneAssignments = function() {
    return Object.keys(this._assignments).map(function(name) {
        return this._assignments[name];
    }, this);
};

/**
 * Returns the most severe status
 */
Requisition.prototype.getStatus = function() {
    var status = Status.VALID;
    this.getAssignments(true).forEach(function(assignment) {
        var assignStatus = assignment.getStatus();
        if (assignment.getStatus() > status) {
            status = assignStatus;
        }
    }, this);
    return status;
};

/**
 * Extract the names and values of all the assignments, and return as
 * an object.
 */
Requisition.prototype.getArgsObject = function() {
    var args = {};
    this.getAssignments().forEach(function(assignment) {
        args[assignment.param.name] = assignment.getValue();
    }, this);
    return args;
};

/**
 * Access the arguments as an array.
 * @param includeCommand By default only the parameter arguments are
 * returned unless (includeCommand === true), in which case the list is
 * prepended with commandAssignment.getArg()
 */
Requisition.prototype.getAssignments = function(includeCommand) {
    var assignments = [];
    if (includeCommand === true) {
        assignments.push(this.commandAssignment);
    }
    Object.keys(this._assignments).forEach(function(name) {
        assignments.push(this.getAssignment(name));
    }, this);
    return assignments;
};

/**
 * Reset all the assignments to their default values
 */
Requisition.prototype.setDefaultArguments = function() {
    this.getAssignments().forEach(function(assignment) {
        assignment.setDefault();
    }, this);
};

/**
 * Extract a canonical version of the input
 */
Requisition.prototype.toCanonicalString = function() {
    var line = [];

    var cmd = this.commandAssignment.getValue() ?
            this.commandAssignment.getValue().name :
            this.commandAssignment.getArg().text;
    line.push(cmd);

    Object.keys(this._assignments).forEach(function(name) {
        var assignment = this._assignments[name];
        var type = assignment.param.type;
        // TODO: This will cause problems if there is a non-default value
        // after a default value. Also we need to decide when to use
        // named parameters in place of positional params. Both can wait.
        if (assignment.getValue() !== assignment.param.defaultValue) {
            line.push(' ');
            line.push(type.stringify(assignment.getValue()));
        }
    }, this);
    return line.join('');
};

/**
 * Input trace gives us an array of Argument tracing objects, one for each
 * character in the typed input, from which we can derive information about how
 * to display this typed input. It's a bit like toString on steroids.
 * <p>
 * The returned object has the following members:<ul>
 * <li>char: The character to which this arg trace refers.
 * <li>arg: The Argument to which this character is assigned.
 * <li>part: One of ['prefix'|'text'|suffix'] - how was this char understood
 * </ul>
 * <p>
 * The Argument objects are as output from #_tokenize() rather than as applied
 * to Assignments by #_assign() (i.e. they are not instances of NamedArgument,
 * ArrayArgument, etc).
 * <p>
 * To get at the arguments applied to the assignments simply call
 * <tt>arg.assignment.arg</tt>. If <tt>arg.assignment.arg !== arg</tt> then
 * the arg applied to the assignment will contain the original arg.
 * See #_assign() for details.
 */
Requisition.prototype.createInputArgTrace = function() {
    if (!this._args) {
        throw new Error('createInputMap requires a command line. See source.');
        // If this is a problem then we can fake command line input using
        // something like the code in #toCanonicalString().
    }

    var args = [];
    this._args.forEach(function(arg) {
        for (var i = 0; i < arg.prefix.length; i++) {
            args.push({ arg: arg, char: arg.prefix[i], part: 'prefix' });
        }
        for (var i = 0; i < arg.text.length; i++) {
            args.push({ arg: arg, char: arg.text[i], part: 'text' });
        }
        for (var i = 0; i < arg.suffix.length; i++) {
            args.push({ arg: arg, char: arg.suffix[i], part: 'suffix' });
        }
    });

    return args;
};

/**
 * Reconstitute the input from the args
 */
Requisition.prototype.toString = function() {
    if (this._args) {
        return this._args.map(function(arg) {
            return arg.toString();
        }).join('');
    }

    return this.toCanonicalString();
};

/**
 * Return an array of Status scores so we can create a marked up
 * version of the command line input.
 */
Requisition.prototype.getInputStatusMarkup = function() {
    var argTraces = this.createInputArgTrace();
    // We only take a status of INCOMPLETE to be INCOMPLETE when the cursor is
    // actually in the argument. Otherwise it's an error.
    // Generally the 'argument at the cursor' is the argument before the cursor
    // unless it is before the first char, in which case we take the first.
    var cursor = this.input.cursor.start === 0 ?
            0 :
            this.input.cursor.start - 1;
    var cTrace = argTraces[cursor];

    var statuses = [];
    for (var i = 0; i < argTraces.length; i++) {
        var argTrace = argTraces[i];
        var arg = argTrace.arg;
        var status = Status.VALID;
        if (argTrace.part === 'text') {
            status = arg.assignment.getStatus(arg);
            // Promote INCOMPLETE to ERROR  ...
            if (status === Status.INCOMPLETE) {
                // If the cursor is not in a position to be able to complete it
                if (arg !== cTrace.arg || cTrace.part !== 'text') {
                    // And if we're not in the command
                    if (!(arg.assignment instanceof CommandAssignment)) {
                        status = Status.ERROR;
                    }
                }
            }
        }

        statuses.push(status);
    }

    return statuses;
};

/**
 * Look through the arguments attached to our assignments for the assignment
 * at the given position.
 * @param {number} cursor The cursor position to query
 */
Requisition.prototype.getAssignmentAt = function(cursor) {
    if (!this._args) {
        throw new Error('Missing args');
    }

    // We short circuit this one because we may have no args, or no args with
    // any size and the alg below only finds arguments with size.
    if (cursor === 0) {
        return this.commandAssignment;
    }

    var assignForPos = [];
    var i, j;
    for (i = 0; i < this._args.length; i++) {
        var arg = this._args[i];
        var assignment = arg.assignment;

        // prefix and text are clearly part of the argument
        for (j = 0; j < arg.prefix.length; j++) {
            assignForPos.push(assignment);
        }
        for (j = 0; j < arg.text.length; j++) {
            assignForPos.push(assignment);
        }

        // suffix looks forwards
        if (this._args.length > i + 1) {
            // first to the next argument
            assignment = this._args[i + 1].assignment;
        }
        else if (assignment &&
                assignment.paramIndex + 1 < this.assignmentCount) {
            // then to the next assignment
            assignment = this.getAssignment(assignment.paramIndex + 1);
        }

        for (j = 0; j < arg.suffix.length; j++) {
            assignForPos.push(assignment);
        }
    }

    // TODO: Possible shortcut, we don't really need to go through all the args
    // to work out the solution to this

    return assignForPos[cursor - 1];
};

/**
 * Entry point for keyboard accelerators or anything else that wants to execute
 * a command.
 * @param command Either a command, or the name of one
 * @param env Current environment to execute the command in
 * @param args Arguments for the command
 * @param typed The typed command. This indicates that the user has taken some
 * time to craft input, in which case feedback will be given, probably using
 * the output part of the command line. If undefined, we will assume that this
 * is computer generated, and skip altering the output.
 */
Requisition.prototype.exec = function(input) {
    var command;
    var args;
    var visible = true;

    if (input) {
        if (input.args != null) {
            // Fast track by looking up the command directly since passed args
            // means there is no command line to parse.
            command = canon.getCommand(input.typed);
            if (!command) {
                console.error('Command not found: ' + command);
            }
            args = input.args;

            // Default visible to false since this is exec is probably the
            // result of a keyboard shortcut
            visible = 'visible' in input ? input.visible : false;
        }
        else {
            this.update(input);
        }
    }

    if (!command) {
        command = this.commandAssignment.getValue();
        args = this.getArgsObject();
    }

    if (!command) {
        return false;
    }

    var start = new Date();
    var reply;
    var report;

    var onComplete = function(output, error) {
        if (visible) {
            var end = new Date();
            report = {
                command: command,
                args: args,
                typed: this.toCanonicalString(),
                error: error,
                output: output,
                completed: true,
                start: start,
                end: end,
                duration: end.getTime() - start.getTime()
            };

            this.reportList.addReport(report);
        }
    }.bind(this);

    try {
        cachedEnv = this.env;

        if (command.functional) {
            var argValues = Object.keys(args).map(function(key) {
                return args[key];
            });
            var context = command.context || command;
            reply = command.exec.apply(context, argValues);
        }
        else {
            reply = command.exec(this.env, args);
        }

        if (reply != null && reply.isPromise) {
            reply.then(
                function(reply) { onComplete(reply, false); },
                function(error) { onComplete(error, true); });

            // TODO: Add progress to our promise and add a handler for it here
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

    cachedEnv = undefined;
    return true;
};

/**
 * Hack to allow us to offer an API to get at the environment while we are
 * executing a command, but not at other times.
 */
var cachedEnv = undefined;

cli.getEnvironment = function() {
    return cachedEnv;
};

/**
 * Called by the UI when ever the user interacts with a command line input
 * @param input A structure that details the state of the input field.
 * It should look something like: { typed:a, cursor: { start:b, end:c } }
 * Where a is the contents of the input field, and b and c are the start
 * and end of the cursor/selection respectively.
 * <p>The general sequence is:
 * <ul>
 * <li>_tokenize(): convert _typed into _parts
 * <li>_split(): convert _parts into _command and _unparsedArgs
 * <li>_assign(): convert _unparsedArgs into requisition
 * </ul>
 */
Requisition.prototype.update = function(input) {
    this.input = input;
    if (this.input.cursor == null) {
        this.input.cursor = { start: input.length, end: input.length };
    }

    this._structuralChangeInProgress = true;

    this._args = this._tokenize(input.typed);

    var args = this._args.slice(0); // i.e. clone
    this._split(args);
    this._assign(args);

    this._structuralChangeInProgress = false;

    this._dispatchEvent('inputChange', { });
};

var OUTSIDE = 1;     // The last character was whitespace
var IN_SIMPLE = 2;   // The last character was part of a parameter
var IN_SINGLE_Q = 3; // We're inside a single quote: '
var IN_DOUBLE_Q = 4; // We're inside double quotes: "

/**
 * If the input has no spaces, quotes or escapes, we can take the fast track
 */
function isSimple(typed) {
   for (var i = 0; i < typed.length; i++) {
       var c = typed.charAt(i);
       if (c === ' ' || c === '"' || c === '\'' || c === '\\') {
           return false;
       }
   }
   return true;
}

/**
 * Split up the input taking into account ' and "
 */
Requisition.prototype._tokenize = function(typed) {
    // For blank input, place a dummy empty argument into the list
    if (typed == null || typed.length === 0) {
        return [ new Argument('', '', '') ];
    }

    if (isSimple(typed)) {
        return [ new Argument(typed, '', '') ];
    }

    var mode = OUTSIDE;

    // First we un-escape. This list was taken from:
    // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Core_Language_Features#Unicode
    // We are generally converting to their real values except for \', \"
    // and '\ ' which we are converting to unicode private characters so we
    // can distinguish them from ', " and ' ', which have special meaning.
    // They need swapping back post-split - see unescape2()
    typed = typed
            .replace(/\\\\/g, '\\')
            .replace(/\\b/g, '\b')
            .replace(/\\f/g, '\f')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\v/g, '\v')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\ /g, '\uF000')
            .replace(/\\'/g, '\uF001')
            .replace(/\\"/g, '\uF002');

    function unescape2(str) {
        return str
            .replace(/\uF000/g, ' ')
            .replace(/\uF001/g, '\'')
            .replace(/\uF002/g, '"');
    }

    var i = 0; // The index of the current character
    var start = 0; // Where did this section start?
    var prefix = ''; // Stuff that comes before the current argument
    var args = [];

    while (true) {
        if (i >= typed.length) {
            // There is nothing else to read - tidy up
            if (mode !== OUTSIDE) {
                var str = unescape2(typed.substring(start, i));
                args.push(new Argument(str, prefix, ''));
            }
            else {
                if (i !== start) {
                    // There's a bunch of whitespace at the end of the
                    // command add it to the last argument's suffix,
                    // creating an empty argument if needed.
                    var extra = typed.substring(start, i);
                    var lastArg = args[args.length - 1];
                    if (!lastArg) {
                        args.push(new Argument('', extra, ''));
                    }
                    else {
                        lastArg.suffix += extra;
                    }
                }
            }
            break;
        }

        var c = typed[i];
        switch (mode) {
            case OUTSIDE:
                if (c === '\'') {
                    prefix = typed.substring(start, i + 1);
                    mode = IN_SINGLE_Q;
                    start = i + 1;
                }
                else if (c === '"') {
                    prefix = typed.substring(start, i + 1);
                    mode = IN_DOUBLE_Q;
                    start = i + 1;
                }
                else if (/ /.test(c)) {
                    // Still whitespace, do nothing
                }
                else {
                    prefix = typed.substring(start, i);
                    mode = IN_SIMPLE;
                    start = i;
                }
                break;

            case IN_SIMPLE:
                // There is an edge case of xx'xx which we are assuming to
                // be a single parameter (and same with ")
                if (c === ' ') {
                    var str = unescape2(typed.substring(start, i));
                    args.push(new Argument(str, prefix, ''));
                    mode = OUTSIDE;
                    start = i;
                    prefix = '';
                }
                break;

            case IN_SINGLE_Q:
                if (c === '\'') {
                    var str = unescape2(typed.substring(start, i));
                    args.push(new Argument(str, prefix, c));
                    mode = OUTSIDE;
                    start = i + 1;
                    prefix = '';
                }
                break;

            case IN_DOUBLE_Q:
                if (c === '"') {
                    var str = unescape2(typed.substring(start, i));
                    args.push(new Argument(str, prefix, c));
                    mode = OUTSIDE;
                    start = i + 1;
                    prefix = '';
                }
                break;
        }

        i++;
    }

    return args;
};

/**
 * Looks in the canon for a command extension that matches what has been
 * typed at the command line.
 */
Requisition.prototype._split = function(args) {
    var argsUsed = 1;
    var conversion;

    while (argsUsed <= args.length) {
        var arg = (argsUsed === 1) ?
            args[0] :
            new MergedArgument(args, 0, argsUsed);
        conversion = this.commandAssignment.param.type.parse(arg);

        // We only want to carry on if this command is a parent command,
        // which means that there is a commandAssignment, but not one with
        // an exec function.
        if (!conversion.value || conversion.value.exec) {
            break;
        }

        // Previously we needed a way to hide commands depending context.
        // We have not resurrected that feature yet, but if we do we should
        // insert code here to ignore certain commands depending on the
        // context/environment

        argsUsed++;
    }

    this.commandAssignment.setConversion(conversion);

    for (var i = 0; i < argsUsed; i++) {
        args.shift();
    }

    // TODO: This could probably be re-written to consume args as we go
};

/**
 * Work out which arguments are applicable to which parameters.
 */
Requisition.prototype._assign = function(args) {
    if (!this.commandAssignment.getValue()) {
        this._unassigned.setUnassigned(args);
        return;
    }

    if (args.length === 0) {
        this.setDefaultArguments();
        this._unassigned.setDefault();
        return;
    }

    // Create an error if the command does not take parameters, but we have
    // been given them ...
    if (this.assignmentCount === 0) {
        this._unassigned.setUnassigned(args);
        return;
    }

    // Special case: if there is only 1 parameter, and that's of type
    // text, then we put all the params into the first param
    if (this.assignmentCount === 1) {
        var assignment = this.getAssignment(0);
        if (assignment.param.type instanceof StringType) {
            var arg = (args.length === 1) ?
                args[0] :
                new MergedArgument(args);
            var conversion = assignment.param.type.parse(arg);
            assignment.setConversion(conversion);
            this._unassigned.setDefault();
            return;
        }
    }

    // Positional arguments can still be specified by name, but if they are
    // then we need to ignore them when working them out positionally
    var names = this.getParameterNames();

    // We collect the arguments used in arrays here before assigning
    var arrayArgs = {};

    // Extract all the named parameters
    this.getAssignments(false).forEach(function(assignment) {
        // Loop over the arguments
        // Using while rather than loop because we remove args as we go
        var i = 0;
        while (i < args.length) {
            if (assignment.param.isKnownAs(args[i].text)) {
                var arg = args.splice(i, 1)[0];
                lang.arrayRemove(names, assignment.param.name);

                // boolean parameters don't have values, default to false
                if (assignment.param.type instanceof BooleanType) {
                    arg = new TrueNamedArgument(null, arg);
                }
                else {
                    var valueArg = null;
                    if (i + 1 >= args.length) {
                        // TODO: We need a setNamedArgument() because the
                        // assignment needs to know both the value and the
                        // extent of both the arguments so replacement can
                        // work. Same for the boolean case above
                        valueArg = args.splice(i, 1)[0];
                    }
                    arg = new NamedArgument(arg, valueArg);
                }

                if (assignment.param.type instanceof ArrayType) {
                    var arrayArg = arrayArgs[assignment.param.name];
                    if (!arrayArg) {
                        arrayArg = new ArrayArgument();
                        arrayArgs[assignment.param.name] = arrayArg;
                    }
                    arrayArg.addArgument(arg);
                }
                else {
                    var conversion = assignment.param.type.parse(arg);
                    assignment.setConversion(conversion);
                }
            }
            else {
                // Skip this parameter and handle as a positional parameter
                i++;
            }
        }
    }, this);

    // What's left are positional parameters assign in order
    names.forEach(function(name) {
        var assignment = this.getAssignment(name);

        // If not set positionally, and we can't set it non-positionally,
        // we have to default it to prevent previous values surviving
        if (!assignment.param.isPositionalAllowed()) {
            assignment.setDefault();
            return;
        }

        // If this is a positional array argument, then it swallows the
        // rest of the arguments.
        if (assignment.param.type instanceof ArrayType) {
            var arrayArg = arrayArgs[assignment.param.name];
            if (!arrayArg) {
                arrayArg = new ArrayArgument();
                arrayArgs[assignment.param.name] = arrayArg;
            }
            arrayArg.addArguments(args);
            args = [];
        }
        else {
            var arg = (args.length > 0) ?
                    args.splice(0, 1)[0] :
                    new Argument();

            var conversion = assignment.param.type.parse(arg);
            assignment.setConversion(conversion);
        }
    }, this);

    // Now we need to assign the array argument (if any)
    Object.keys(arrayArgs).forEach(function(name) {
        var assignment = this.getAssignment(name);
        var conversion = assignment.param.type.parse(arrayArgs[name]);
        assignment.setConversion(conversion);
    }, this);

    if (args.length > 0) {
        this._unassigned.setUnassigned(args);
    }
    else {
        this._unassigned.setDefault();
    }
};


});
