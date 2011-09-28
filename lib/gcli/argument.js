/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var argument = exports;


/**
 * We record where in the input string an argument comes so we can report
 * errors against those string positions.
 * @param text The string (trimmed) that contains the argument
 * @param prefix Knowledge of quotation marks and whitespace used prior to the
 * text in the input string allows us to re-generate the original input from
 * the arguments.
 * @param suffix Any quotation marks and whitespace used after the text.
 * Whitespace is normally placed in the prefix to the succeeding argument, but
 * can be used here when this is the last argument.
 * @constructor
 */
function Argument(text, prefix, suffix) {
  if (text === undefined) {
    this.text = '';
    this.prefix = '';
    this.suffix = '';
  }
  else {
    this.text = text;
    this.prefix = prefix !== undefined ? prefix : '';
    this.suffix = suffix !== undefined ? suffix : '';
  }
}

/**
 * Return the result of merging these arguments.
 * case and some of the arguments are in quotation marks?
 */
Argument.prototype.merge = function(following) {
  // Is it possible that this gets called when we're merging arguments
  // for the single string?
  return new Argument(
    this.text + this.suffix + following.prefix + following.text,
    this.prefix, following.suffix);
};

/**
 * Returns a new Argument like this one but with the text set to
 * <tt>replText</tt> and the end adjusted to fit.
 * @param replText Text to replace the old text value
 */
Argument.prototype.beget = function(replText, options) {
  var prefix = this.prefix;
  var suffix = this.suffix;

  var quote = (replText.indexOf(' ') >= 0 || replText.length == 0) ?
      '\'' : '';

  if (options) {
    prefix = (options.prefixSpace ? ' ' : '') + quote;
    suffix = quote;
  }

  return new Argument(replText, prefix, suffix);
};

/**
 * Is there any visible content to this argument?
 */
Argument.prototype.isBlank = function() {
  return this.text === '' &&
      this.prefix.trim() === '' &&
      this.suffix.trim() === '';
};

/**
 * We need to keep track of which assignment we've been assigned to
 */
Argument.prototype.assign = function(assignment) {
  this.assignment = assignment;
};

/**
 * Sub-classes of Argument are collections of arguments, getArgs() gets access
 * to the members of the collection in order to do things like re-create input
 * command lines. For the simple Argument case it's just an array containing
 * only this.
 */
Argument.prototype.getArgs = function() {
  return [ this ];
};

/**
 * We define equals to mean all arg properties are strict equals.
 * Used by Conversion.argEquals and Conversion.equals and ultimately
 * Assignment.equals to avoid reporting a change event when a new conversion
 * is assigned.
 */
Argument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof Argument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

/**
 * Helper when we're putting arguments back together
 */
Argument.prototype.toString = function() {
  // BUG 664207: We should re-escape escaped characters
  // But can we do that reliably?
  return this.prefix + this.text + this.suffix;
};

/**
 * Merge an array of arguments into a single argument.
 * All Arguments in the array are expected to have the same emitter
 */
Argument.merge = function(argArray, start, end) {
  start = (start === undefined) ? 0 : start;
  end = (end === undefined) ? argArray.length : end;

  var joined;
  for (var i = start; i < end; i++) {
    var arg = argArray[i];
    if (!joined) {
      joined = arg;
    }
    else {
      joined = joined.merge(arg);
    }
  }
  return joined;
};

argument.Argument = Argument;


/**
 * ScriptArgument is a marker that the argument is designed to be Javascript.
 * It also implements the special rules that spaces after the { or before the
 * } are part of the pre/suffix rather than the content.
 */
function ScriptArgument(text, prefix, suffix) {
  this.text = text;
  this.prefix = prefix !== undefined ? prefix : '';
  this.suffix = suffix !== undefined ? suffix : '';

  while (this.text.charAt(0) === ' ') {
    this.prefix = this.prefix + ' ';
    this.text = this.text.substring(1);
  }

  while (this.text.charAt(this.text.length - 1) === ' ') {
    this.suffix = ' ' + this.suffix;
    this.text = this.text.slice(0, -1);
  }
}

ScriptArgument.prototype = Object.create(Argument.prototype);

/**
 * Returns a new Argument like this one but with the text set to
 * <tt>replText</tt> and the end adjusted to fit.
 * @param replText Text to replace the old text value
 */
ScriptArgument.prototype.beget = function(replText, options) {
  var prefix = this.prefix;
  var suffix = this.suffix;

  var quote = (replText.indexOf(' ') >= 0 || replText.length == 0) ?
      '\'' : '';

  if (options && options.normalize) {
    prefix = '{ ';
    suffix = ' }';
  }

  return new ScriptArgument(replText, prefix, suffix);
};

argument.ScriptArgument = ScriptArgument;


/**
 * Commands like 'echo' with a single string argument, and used with the
 * special format like: 'echo a b c' effectively have a number of arguments
 * merged together.
 */
function MergedArgument(args, start, end) {
  if (!Array.isArray(args)) {
    throw new Error('args is not an array of Arguments');
  }

  if (start === undefined) {
    this.args = args;
  }
  else {
    this.args = args.slice(start, end);
  }

  var arg = Argument.merge(this.args);
  this.text = arg.text;
  this.prefix = arg.prefix;
  this.suffix = arg.suffix;
}

MergedArgument.prototype = Object.create(Argument.prototype);

/**
 * Keep track of which assignment we've been assigned to, and allow the
 * original args to do the same.
 */
MergedArgument.prototype.assign = function(assignment) {
  this.args.forEach(function(arg) {
    arg.assign(assignment);
  }, this);

  this.assignment = assignment;
};

MergedArgument.prototype.getArgs = function() {
  return this.args;
};

MergedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof MergedArgument)) {
    return false;
  }

  // We might need to add a check that args is the same here

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.MergedArgument = MergedArgument;


/**
 * TrueNamedArguments are for when we have an argument like --verbose which
 * has a boolean value, and thus the opposite of '--verbose' is ''.
 */
function TrueNamedArgument(name, arg) {
  this.arg = arg;
  this.text = arg ? arg.text : '--' + name;
  this.prefix = arg ? arg.prefix : ' ';
  this.suffix = arg ? arg.suffix : '';
}

TrueNamedArgument.prototype = Object.create(Argument.prototype);

TrueNamedArgument.prototype.assign = function(assignment) {
  if (this.arg) {
    this.arg.assign(assignment);
  }
  this.assignment = assignment;
};

TrueNamedArgument.prototype.getArgs = function() {
  // NASTY! getArgs has a fairly specific use: in removing used arguments
  // from a command line. Unlike other arguments which are EITHER used
  // in assignments directly OR grouped in things like MergedArguments,
  // TrueNamedArgument is used raw from the UI, or composed of another arg
  // from the CLI, so we return both here so they can both be removed.
  return this.arg ? [ this, this.arg ] : [ this ];
};

TrueNamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof TrueNamedArgument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.TrueNamedArgument = TrueNamedArgument;


/**
 * FalseNamedArguments are for when we don't have an argument like --verbose
 * which has a boolean value, and thus the opposite of '' is '--verbose'.
 */
function FalseNamedArgument() {
  this.text = '';
  this.prefix = '';
  this.suffix = '';
}

FalseNamedArgument.prototype = Object.create(Argument.prototype);

FalseNamedArgument.prototype.getArgs = function() {
  return [ ];
};

FalseNamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null || !(that instanceof FalseNamedArgument)) {
    return false;
  }

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.FalseNamedArgument = FalseNamedArgument;


/**
 * A named argument is for cases where we have input in one of the following
 * formats:
 * <ul>
 * <li>--param value
 * <li>-p value
 * <li>--pa value
 * <li>-p:value
 * <li>--param=value
 * <li>etc
 * </ul>
 * The general format is:
 * /--?{unique-param-name-prefix}[ :=]{value}/
 * We model this as a normal argument but with a long prefix.
 */
function NamedArgument(nameArg, valueArg) {
  this.nameArg = nameArg;
  this.valueArg = valueArg;

  this.text = valueArg.text;
  this.prefix = nameArg.toString() + valueArg.prefix;
  this.suffix = valueArg.suffix;
}

NamedArgument.prototype = Object.create(Argument.prototype);

NamedArgument.prototype.assign = function(assignment) {
  this.nameArg.assign(assignment);
  this.valueArg.assign(assignment);
  this.assignment = assignment;
};

NamedArgument.prototype.getArgs = function() {
  return [ this.nameArg, this.valueArg ];
};

NamedArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }

  if (!(that instanceof NamedArgument)) {
    return false;
  }

  // We might need to add a check that nameArg and valueArg are the same

  return this.text === that.text &&
       this.prefix === that.prefix && this.suffix === that.suffix;
};

argument.NamedArgument = NamedArgument;


/**
 * An argument the groups together a number of plain arguments together so they
 * can be jointly assigned to a single array parameter
 */
function ArrayArgument() {
  this.args = [];
}

ArrayArgument.prototype = Object.create(Argument.prototype);

ArrayArgument.prototype.addArgument = function(arg) {
  this.args.push(arg);
};

ArrayArgument.prototype.addArguments = function(args) {
  Array.prototype.push.apply(this.args, args);
};

ArrayArgument.prototype.getArguments = function() {
  return this.args;
};

ArrayArgument.prototype.assign = function(assignment) {
  this.args.forEach(function(arg) {
    arg.assign(assignment);
  }, this);

  this.assignment = assignment;
};

ArrayArgument.prototype.getArgs = function() {
  return this.args;
};

ArrayArgument.prototype.equals = function(that) {
  if (this === that) {
    return true;
  }
  if (that == null) {
    return false;
  }

  if (!(that instanceof ArrayArgument)) {
    return false;
  }

  if (this.args.length !== that.args.length) {
    return false;
  }

  for (var i = 0; i < this.args.length; i++) {
    if (!this.args[i].equals(that.args[i])) {
      return false;
    }
  }

  return true;
};

/**
 * Helper when we're putting arguments back together
 */
ArrayArgument.prototype.toString = function() {
  return '{' + this.args.map(function(arg) {
    return arg.toString();
  }, this).join(',') + '}';
};

argument.ArrayArgument = ArrayArgument;


});
