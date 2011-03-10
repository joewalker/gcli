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
 *   Joe Walker (jwalker@mozilla.com)
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


var console = require('pilot/console');
var lang = require('pilot/lang');
var oop = require('pilot/oop');
var EventEmitter = require('pilot/event_emitter').EventEmitter;

//var keyboard = require('keyboard/keyboard');
var types = require('pilot/types');
var Status = require('pilot/types').Status;
var Conversion = require('pilot/types').Conversion;
var canon = require('pilot/canon');

var Argument = require('pilot/argument').Argument;
var ArrayArgument = require('pilot/argument').ArrayArgument;
var NamedArgument = require('pilot/argument').NamedArgument;
var BooleanNamedArgument = require('pilot/argument').BooleanNamedArgument;
var MergedArgument = require('pilot/argument').MergedArgument;

/**
 * Normally type upgrade is done when the owning command is registered, but
 * out commandParam isn't part of a command, so it misses out.
 */
exports.startup = function(data, reason) {
    commandParam = new canon.Parameter(commandParam);
};

/**
 * A link between a parameter and the data for that parameter.
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
 * <pre>{
 *     assignment: ...,
 *     oldValue: ..., newValue: ...,
 *     oldArg: ..., newArg: ...
 * }
 * </pre>
 * @constructor
 */
function Assignment(param, paramIndex) {
    this.param = param;
    this.paramIndex = paramIndex;

    this.conversion = this.param.getDefault ?
            this.param.getDefault() :
            this.param.type.getDefault();
    this.value = this.param.defaultValue;
    this.arg = new Argument();
};
Assignment.prototype = {
    /**
     * The parameter that we are assigning to
     * @readonly
     */
    param: undefined,

    /**
     * The index of this parameter in the parent Requisition. paramIndex === -1
     * is the command assignment although this should not be relied upon, it is
     * better to test param.isCommand
     */
    paramIndex: undefined,

    /**
     * The current value in a type as specified by param.type (i.e. not the
     * string representation)
     * Use setValue() to mutate
     */
    value: undefined,
    setValue: function(value) {
        var oldArg = this.arg;
        var oldValue = this.value;

        if (this.value === value) {
            return;
        }

        if (value === undefined) {
            this.value = this.param.defaultValue;
            // Predictions are useful when we're using the default value
            this.conversion = this.param.getDefault ?
                    this.param.getDefault() :
                    this.param.type.getDefault();
        } else {
            this.value = value;
            // Fake a conversion
            this.conversion = new Conversion(this.value,
                new Argument(this.param.type.stringify(this.value)));
        }

        var text = (value == null) ? '' : this.param.type.stringify(value);

        // This tweaks the prefix/suffix of the argument to fit
        this.arg = this.arg.beget(text, {
            prefixSpace: this.paramIndex !== -1
        });

        this._dispatchEvent('assignmentChange', {
            assignment: this,
            conversion: this.conversion,
            oldValue: oldValue,
            oldArg: oldArg,
            newValue: this.value,
            newArg: this.arg
        });
    },

    /**
     * The textual representation of the current value
     * Use setArgument() to mutate
     */
    arg: undefined,
    setArgument: function(newArg) {
        var oldArg = this.arg;
        var oldValue = this.value;

        if (Argument.equals(oldArg, newArg)) {
            return;
        }

        this.arg = newArg;

        if (oldArg && oldArg.text === newArg.text) {
            return;
        }

        this.conversion = this.param.type.parse(newArg);
        this.value = this.conversion.value;

        this._dispatchEvent('assignmentChange', {
            assignment: this,
            conversion: this.conversion,
            oldValue: oldValue,
            oldArg: oldArg,
            newValue: this.value,
            newArg: this.arg
        });
    },

    /**
     * Report on the status of the last parse() conversion.
     * @see types.Conversion
     */
    conversion: undefined,
    setConversion: function(conversion) {
        var oldArg = this.arg;
        var oldValue = this.value;

        if (this.conversion === conversion) {
            return;
        }

        this.arg = conversion.arg;
        this.value = conversion.value;
        this.conversion = conversion;

        // All arguments (except the command) must have a space prefix
        if (this.paramIndex !== -1 && this.arg.prefix === '') {
            this.arg.prefix = ' ';
        }

        this._dispatchEvent('assignmentChange', {
            assignment: this,
            conversion: this.conversion,
            oldValue: oldValue,
            oldArg: oldArg,
            newValue: this.value,
            newArg: this.arg
        });
    },

    /**
     * Make sure that there is some content for this argument by using an
     * Argument of '' if needed.
     * <p>TODO: It isn't clear if we should be sending events from this method.
     * It should only be called when structural changes are happening in which
     * case we're going to ignore the event anyway. But on the other hand
     * perhaps this function shouldn't need to know how it is used, and should
     * do the inefficient thing.
     */
    ensureArgument: function() {
        if (this.arg.isBlank()) {
            /*
            var oldArg = this.arg;
            var oldValue = this.value;
            */

            this.arg = this.arg.beget('', {
                prefixSpace: this.paramIndex !== -1
            });

            this.conversion = this.param.type.parse(this.arg);
            this.value = this.conversion.value;

            /*
            this._dispatchEvent('assignmentChange', {
                assignment: this,
                conversion: this.conversion,
                oldArg: oldArg,
                oldValue: oldValue,
                newArg: this.arg,
                newValue: this.value
            });
            */
        }
    },

    getStatus: function() {
        // Error if the param is required, but not provided
        var argProvided = this.arg && this.arg.text !== '';
        var dataProvided = this.value !== undefined || argProvided;
        var dataRequired = this.param.defaultValue === undefined;
        if (dataRequired && !dataProvided) {
            return Status.ERROR;
        }

        // Incomplete if this is a commandParam with an un-executable command
        if (this.param.isCommand && this.value && !this.value.exec) {
            return Status.INCOMPLETE;
        }

        // Use conversion status or default to valid
        return this.conversion ? this.conversion.status : Status.VALID;
    },

    getMessage: function() {
        if (this.conversion && this.conversion.message) {
            return this.conversion.message;
        }
        return '';
    },

    getPredictions: function() {
        if (this.conversion && this.conversion.predictions) {
            return this.conversion.predictions;
        }
        return [];
    },

    /**
     * Basically <tt>setValue(conversion.predictions[0])</tt> done in a safe
     * way.
     */
    complete: function() {
        if (this.conversion && this.conversion.predictions &&
                this.conversion.predictions.length > 0) {
            this.setValue(this.conversion.predictions[0]);
        }
    },

    /**
     * If the cursor is at 'position', do we have sufficient data to start
     * displaying the next message? This is both complex and important.
     *
     * <p>For example, if the user has just typed:<ul>
     * <li>'set tabstop ' then they clearly want to know about the valid
     *     values for the tabstop setting, so the message is based on the next
     *     parameter.
     * <li>'set tabstop' (without trailing space) - they will probably still
     *     want to know about the valid values for the tabstop setting because
     *     there is no confusion about the setting in question.
     * <li>'set tabsto' they've not finished typing a setting name so the
     *     message should be based on the current parameter.
     * <li>'set tabstop' (when there is an additional tabstopstyle setting) we
     *     can't make assumptions about the setting - we're not finished.
     * </ul>
     * <p>Note that the input for 2 and 4 is identical, only the configuration
     * has changed, so which message we display depends on the environment.
     *
     * <p>This function works out if the cursor is before the end of this
     * assignment (assuming that we've asked the same thing of the previous
     * assignment) and then attempts to work out if we should use the message
     * from the next assignment even though technically the cursor is still
     * inside this one due to the rules above.
     *
     * <p>Also, the logic above is good for hints. If we're taking about what
     * to do when the user presses up/down, then we always 'capture' if the
     * cursor is at the end position.
     *
     * @param {number} cursor The cursor position to query
     * @param {boolean} endIsPrev If the cursor is at the end of a parameter and
     * cursor up/down is pressed, then we work on the existing parameter,
     * however for hint purposes we may say were on the next parameter.
     */
    _isPositionCaptured: function(cursor, endIsPrev) {
        if (!this.arg) {
            return false;
        }

        // Note we don't check if position >= this.arg.start because that's
        // implied by the fact that we're asking the assignments in turn, and
        // we want to avoid thing falling between the cracks

        // If the arg is at the cursor we're clearly captured
        if (this.arg.start === Argument.AT_CURSOR) {
            return true;
        }

        // We're clearly done if the position is past the end of the text
        if (cursor > this.arg.end) {
            return false;
        }

        // If we're AT the end, the position is captured if either the status
        // is not valid or if there are other valid options including current
        if (cursor === this.arg.end) {
            if (endIsPrev) {
                return true;
            }

            return this.conversion.status !== Status.VALID ||
                    this.conversion.predictions.length !== 0;
        }

        // Otherwise we're clearly inside
        return true;
    },

    /**
     * Replace the current value with the lower value if such a concept
     * exists.
     */
    decrement: function() {
        var replacement = this.param.type.decrement(this.value);
        if (replacement != null) {
            this.setValue(replacement);
        }
    },

    /**
     * Replace the current value with the higher value if such a concept
     * exists.
     */
    increment: function() {
        var replacement = this.param.type.increment(this.value);
        if (replacement != null) {
            this.setValue(replacement);
        }
    },

    /**
     * Helper when we're rebuilding command lines.
     */
    toString: function() {
        return this.arg.toString();
    }
};
oop.implement(Assignment.prototype, EventEmitter);
exports.Assignment = Assignment;


/**
 * This is a special parameter to reflect the command itself.
 */
var commandParam = {
    name: '__command',
    type: 'command',
    description: 'The command to execute',
    isCommand: true
};

/**
 * A Requisition collects the information needed to execute a command.
 * There is no point in a requisition for parameter-less commands because there
 * is no information to collect. A Requisition is a collection of assignments
 * of values to parameters, each handled by an instance of Assignment.
 * CliRequisition adds functions for parsing input from a command line to this
 * class.
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
 * TODO: It could be argued that this should be part of the CliRequisition since
 * it's all about CLI stuff, but then we'd have to have some way to inform
 * subclasses, which probably means more events
 * </ul>
 * @constructor
 */
function Requisition(env) {
    this.env = env;
    this.commandAssignment = new Assignment(commandParam, -1);

    var listener = this._onCommandAssignmentChange.bind(this);
    this.commandAssignment.addEventListener('assignmentChange', listener);

    // We're going to register and un-register this a few times ...
    this._onAssignmentChange = this._onAssignmentChange.bind(this);

    this._assignments = {};
    this.assignmentCount = 0;

    // Temporarily set this to true to prevent _onAssignmentChange resetting
    // argument positions
    this._structuralChangeInProgress = false;
}
Requisition.prototype = {
    /**
     * The command that we are about to execute.
     * @see setCommandConversion()
     * @readonly
     */
    commandAssignment: undefined,

    /**
     * The count of assignments. Excludes the commandAssignment
     * @readonly
     */
    assignmentCount: undefined,

    /**
     * The object that stores of Assignment objects that we are filling out.
     * The Assignment objects are stored under their param.name for named
     * lookup. Note: We make use of the property of Javascript objects that
     * they are not just hashmaps, but linked-list hashmaps which iterate in
     * insertion order.
     * <p>_assignments excludes the commandAssignment.
     */
    _assignments: undefined,

    /**
     * When any assignment changes,
     */
    _onAssignmentChange: function(ev) {
        if (this._structuralChangeInProgress) {
            return;
        }

        this._dispatchEvent('assignmentChange', ev);

        // Both for argument position and the inputChange event, we only care
        // about changes to the argument.
        if (Argument.equals(ev.oldArg, ev.newArg)) {
            return;
        }

        this._structuralChangeInProgress = true;

        // Do preceding arguments need to have dummy values applied so we don't
        // get a hole in the command line?
        for (var i = 0; i < ev.assignment.paramIndex; i++) {
            var assignment = this.getAssignment(i);
            assignment.ensureArgument();
        }

        var change = ev.newArg.toString().length - ev.oldArg.toString().length;
        if (change !== 0) {
            // Do following assignments need to be shifted out to cope?
            var start = ev.assignment.paramIndex + 1;
            for (var i = start; i < this.assignmentCount; i++) {
                var assignment = this.getAssignment(i);
                if (assignment.arg != null) {
                    var arg = assignment.arg.begetShifted(change);
                    assignment.setArgument(arg);
                    // TODO: prevent events for this?
                }
            }
        }
        this._structuralChangeInProgress = false;

        this._dispatchEvent('inputChange', { });
    },

    /**
     * When the command changes, we need to keep a bunch of stuff in sync
     */
    _onCommandAssignmentChange: function(ev) {
        this._assignments = {};

        var command = this.commandAssignment.value;
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

        var ccev = {
            requisition: this,
            oldValue: ev.oldValue,
            newValue: command
        };

        this._dispatchEvent('commandChange', ccev);
        this._dispatchEvent('inputChange', { });
    },

    /**
     * Assignments have an order, so we need to store them in an array.
     * But we also need named access ...
     */
    getAssignment: function(nameOrNumber) {
        var name = (typeof nameOrNumber === 'string') ?
            nameOrNumber :
            Object.keys(this._assignments)[nameOrNumber];
        return this._assignments[name];
    },

    /**
     * Where parameter name == assignment names - they are the same.
     */
    getParameterNames: function() {
        return Object.keys(this._assignments);
    },

    /**
     * A *shallow* clone of the assignments.
     * This is useful for systems that wish to go over all the assignments
     * finding values one way or another and wish to trim an array as they go.
     */
    cloneAssignments: function() {
        return Object.keys(this._assignments).map(function(name) {
            return this._assignments[name];
        }, this);
    },

    /**
     * Returns the most severe status
     */
    getStatus: function() {
        var status = Status.VALID;
        this.getAssignments(true).forEach(function(assignment) {
            var assignStatus = assignment.getStatus();
            if (assignment.getStatus() > status) {
                status = assignStatus;
            }
        }, this);
        return status;
    },

    /**
     * Extract the names and values of all the assignments, and return as
     * an object.
     */
    getArgsObject: function() {
        var args = {};
        this.getAssignments().forEach(function(assignment) {
            args[assignment.param.name] = assignment.value;
        }, this);
        return args;
    },

    /**
     * Access the arguments as an array.
     * @param includeCommand By default only the parameter arguments are
     * returned unless (includeCommand === true), in which case the list is
     * prepended with commandAssignment.arg
     */
    getAssignments: function(includeCommand) {
        var assignments = [];
        if (includeCommand === true) {
            assignments.push(this.commandAssignment);
        }
        Object.keys(this._assignments).forEach(function(name) {
            assignments.push(this.getAssignment(name));
        }, this);
        return assignments;
    },

    /**
     * Reset all the assignments to their default values
     */
    setDefaultArguments: function() {
        this.getAssignments().forEach(function(assignment) {
            assignment.setArgument(new Argument());
        }, this);
    },

    /**
     * Helper to call canon.exec
     */
    exec: function() {
        canon.exec(this.commandAssignment.value,
              this.env,
              this.getArgsObject(),
              this.toCanonicalString());
    },

    /**
     * Extract a canonical version of the input
     */
    toCanonicalString: function() {
        var line = [];
        line.push(this.commandAssignment.value.name);
        Object.keys(this._assignments).forEach(function(name) {
            var assignment = this._assignments[name];
            var type = assignment.param.type;
            // TODO: This will cause problems if there is a non-default value
            // after a default value. Also we need to decide when to use
            // named parameters in place of positional params. Both can wait.
            if (assignment.value !== assignment.param.defaultValue) {
                line.push(' ');
                line.push(type.stringify(assignment.value));
            }
        }, this);
        return line.join('');
    }
};

oop.implement(Requisition.prototype, EventEmitter);

exports.Requisition = Requisition;


/**
 * An object used during command line parsing to hold the various intermediate
 * data steps.
 *
 * <p>The majority of the functions in this class are called in sequence by the
 * constructor.
 * <p>The general sequence is:
 * <ul>
 * <li>_tokenize(): convert _typed into _parts
 * <li>_split(): convert _parts into _command and _unparsedArgs
 * <li>_assign(): convert _unparsedArgs into requisition
 * </ul>
 *
 * @param typed {string} The instruction as typed by the user so far
 * @param options {object} A list of optional named parameters. Can be any of:
 * <b>flags</b>: Flags for us to check against the predicates specified with the
 * commands. Defaulted to <tt>keyboard.buildFlags({ });</tt>
 * if not specified.
 * @constructor
 */
function CliRequisition(env, options) {
    Requisition.call(this, env);

    // Used to store cli arguments that were not assigned to parameters
    this._unassigned = null;
}

oop.inherits(CliRequisition, Requisition);

/**
 * Called by the UI when ever the user interacts with a command line input
 * @param input A structure that details the state of the input field.
 * It should look something like: { typed:a, cursor: { start:b, end:c } }
 * Where a is the contents of the input field, and b and c are the start
 * and end of the cursor/selection respectively.
 */
CliRequisition.prototype.update = function(input) {
    this.input = input;
    this._structuralChangeInProgress = true;

    var args = this._tokenize(input.typed);
    this._split(args);
    this._assign(args);

    this._structuralChangeInProgress = false;
};

/**
 * Incomplete statuses are errors unless selection/argument overlap.
 * The exception is sub-commands, where the parent command is made
 * complete by the addition of a sub-command. In this case we should
 * leave the status as INCOMPLETE. We don't have an easy way to
 * detect if the status is from a parent command, so we just skip
 * the escalation when start == 0
 */
function updateStatuses(statuses, status, cursor, arg) {
    var start = arg ? arg.start : Argument.AT_CURSOR;
    var end = arg ? arg.end : Argument.AT_CURSOR;

    var startInArg = cursor.start >= start && cursor.start <= end;
    var endInArg = cursor.end >= start && cursor.end <= end;
    var inArg = startInArg || endInArg;

    if (!inArg && start !== 0 && status === Status.INCOMPLETE) {
        status = Status.ERROR;
    }

    for (var i = start; i < end; i++) {
        if (status > statuses[i]) {
            statuses[i] = status;
        }
    }
}

/**
 * Return an array of Status scores so we can create a marked up
 * version of the command line input.
 */
CliRequisition.prototype.getInputStatusMarkup = function() {
    // 'scores' is an array which tells us what chars are errors
    // Initialize with everything VALID
    var statuses = this.toString().split('').map(function(ch) {
        return Status.VALID;
    });
    var c = this.input.cursor;

    this.getAssignments(true).forEach(function(assignment) {
        updateStatuses(statuses,
                assignment.getStatus(),
                this.input.cursor,
                assignment.arg);
    }, this);

    if (this._unassigned) {
        updateStatuses(statuses,
                Status.ERROR,
                this.input.cursor,
                this._unassigned);
    }

    return statuses;
};

/**
 * Reconstitute the input from the args
 */
CliRequisition.prototype.toString = function() {
    var reply = this.getAssignments(true).map(function(assignment) {
        return assignment.toString();
    }, this).join('');

    if (this._unassigned) {
        reply += this._unassigned;
    }
    return reply;
};

/**
 * Look through the arguments attached to our assignments for the assignment
 * at the given position.
 * TODO: Currently endIsPrev is always true. Cleanup needed.
 * @param {number} cursor The cursor position to query
 * @param {boolean} endIsPrev If the cursor is at the end of a parameter and
 * cursor up/down is pressed, then we work on the existing parameter,
 * however for message purposes we may say were on the next parameter.
 * @see Assignment.prototype._isPositionCaptured
 */
CliRequisition.prototype.getAssignmentAt = function(cursor, endIsPrev) {
    var assignments = this.getAssignments(true);
    for (var i = 0; i < assignments.length; i++) {
        var assignment = assignments[i];
        // If there is no typed argument in this assignment, we've fallen
        // off the end of the obvious answers - it must be this one.
        if (assignment.arg.start === Argument.AT_CURSOR) {
            return assignment;
        }
        if (assignment._isPositionCaptured(cursor, endIsPrev)) {
            return assignment;
        }
    }

    return assignment;
};

/**
 * Split up the input taking into account ' and "
 */
CliRequisition.prototype._tokenize = function(typed) {
    // For blank input, place a dummy empty argument into the list
    if (typed == null || typed.length === 0) {
        return [ new Argument('', 0, 0, '', '') ];
    }

    var OUTSIDE = 1;     // The last character was whitespace
    var IN_SIMPLE = 2;   // The last character was part of a parameter
    var IN_SINGLE_Q = 3; // We're inside a single quote: '
    var IN_DOUBLE_Q = 4; // We're inside double quotes: "

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
                args.push(new Argument(str, start, i, prefix, ''));
            }
            else {
                if (i !== start) {
                    // There's a bunch of whitespace at the end of the
                    // command add it to the last argument's suffix,
                    // creating an empty argument if needed.
                    var extra = typed.substring(start, i);
                    var lastArg = args[args.length - 1];
                    if (!lastArg) {
                        args.push(new Argument('', i, i, extra, ''));
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
                    args.push(new Argument(str, start, i, prefix, ''));
                    mode = OUTSIDE;
                    start = i;
                    prefix = '';
                }
                break;

            case IN_SINGLE_Q:
                if (c === '\'') {
                    var str = unescape2(typed.substring(start, i));
                    args.push(new Argument(str,
                            start - 1, i + 1, prefix, c));
                    mode = OUTSIDE;
                    start = i + 1;
                    prefix = '';
                }
                break;

            case IN_DOUBLE_Q:
                if (c === '"') {
                    var str = unescape2(typed.substring(start, i));
                    args.push(new Argument(str,
                            start - 1, i + 1, prefix, c));
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
CliRequisition.prototype._split = function(args) {
    var argsUsed = 1;
    var arg;

    while (argsUsed <= args.length) {
        arg = Argument.merge(args, 0, argsUsed);
        var conversion = this.commandAssignment.param.type.parse(arg);

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

    this.commandAssignment.setArgument(arg);

    for (var i = 0; i < argsUsed; i++) {
        args.shift();
    }

    // TODO: This could probably be re-written to consume args as we go
};

/**
 * Work out which arguments are applicable to which parameters.
 * <p>This takes #_command.params and #_unparsedArgs and creates a map of
 * param names to 'assignment' objects, which have the following properties:
 * <ul>
 * <li>param - The matching parameter.
 * <li>index - Zero based index into where the match came from on the input
 * <li>value - The matching input
 * </ul>
 */
CliRequisition.prototype._assign = function(args) {
    if (!this.commandAssignment.value) {
        this._unassigned = Argument.merge(args);
        return;
    }

    this._unassigned = null;
    if (args.length === 0) {
        this.setDefaultArguments();
        return;
    }

    // Create an error if the command does not take parameters, but we have
    // been given them ...
    if (this.assignmentCount === 0) {
        this._unassigned = Argument.merge(args);
        return;
    }

    // Special case: if there is only 1 parameter, and that's of type
    // text we put all the params into the first param
    if (this.assignmentCount === 1) {
        var assignment = this.getAssignment(0);
        if (assignment.param.type.name === 'text') {
            assignment.setArgument(new MergedArgument(args));
            return;
        }
    }

    // To work out which we're doing positionally
    var names = this.getParameterNames();

    // We collect the arguments used in arrays here before assigning
    var arrayArgs = {};

    // Extract all the named parameters
    this.getAssignments(false).forEach(function(assignment) {
        // Loop over the arguments - not a for loop because we remove
        // processed arguments as we go
        var i = 0;
        while (i >= args.length) {
            if (assignment.param.isNamedParam(args[i].text)) {
                var arg = args.splice(i, 1);
                lang.arrayRemove(names, assignment.param.name);

                // boolean parameters don't have values, default to false
                if (assignment.param.type.name === 'boolean') {
                    arg = new BooleanNamedArgument(arg);
                }
                else {
                    var valueArg = null;
                    if (i + 1 >= args.length) {
                        // TODO: We need a setNamedArgument() because the
                        // assignment needs to know both the value and the
                        // extent of both the arguments so replacement can
                        // work. Same for the boolean case above
                        valueArg = args.splice(i, 1);
                    }
                    arg = new NamedArgument(arg, valueArg);
                }

                assignment.setArgument(arg);
            }
            else {
                // Skip this parameter and handle as a positional parameter
                i++;
            }
        }
    }, this);

    // What's left are positional parameters assign in order
    names.forEach(function(name) {
        var arg = (args.length > 0) ? args.splice(0, 1)[0] : new Argument();
        this.getAssignment(name).setArgument(arg);
    }, this);

    if (args.length > 0) {
        this._unassigned = Argument.merge(args);
    }
};

exports.CliRequisition = CliRequisition;


});
