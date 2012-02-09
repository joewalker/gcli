/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var host = require('gcli/host');
var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var SelectionType = require('gcli/types/selection').SelectionType;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var Speller = require('gcli/types/spell').Speller;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(CommandType);
};

exports.shutdown = function() {
  types.unregisterType(CommandType);
};


/**
 * Select from the available commands.
 * This is very similar to a SelectionType, however the level of hackery in
 * SelectionType to make it handle Commands correctly was to high, so we
 * simplified.
 * If you are making changes to this code, you should check there too.
 */
function CommandType() {
}

CommandType.prototype = Object.create(Type.prototype);

CommandType.prototype.name = 'command';

CommandType.prototype.decrement = SelectionType.prototype.decrement;
CommandType.prototype.increment = SelectionType.prototype.increment;
CommandType.prototype._findValue = SelectionType.prototype._findValue;

CommandType.prototype.stringify = function(command) {
  return command.name;
};

/**
 * Trim a list of commands (as from canon.getCommands()) according to those
 * that match the provided arg.
 */
CommandType.prototype._findPredictions = function(arg) {
  var predictions = [];

  var commands = canon.getCommands();
  commands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  commands.forEach(function(command) {
    if (command.name.indexOf(arg.text) === 0) {
      // The command type needs to exclude sub-commands when the CLI
      // is blank, but include them when we're filtering. This hack
      // excludes matches when the filter text is '' and when the
      // name includes a space.
      if (arg.text.length !== 0 || command.name.indexOf(' ') === -1) {
        predictions.push(command);
      }
    }
  }, this);

  // Try infix matching if we get less that 5 matched
  if (predictions.length < 5) {
    commands.forEach(function(command) {
      if (command.name.indexOf(arg.text) !== -1) {
        if (arg.text.length !== 0 || command.name.indexOf(' ') === -1) {
          if (predictions.indexOf(command) === -1) {
            predictions.push(command);
          }
        }
      }
    }, this);
  }

  // Try fuzzy matching if we don't get a prefix match
  if (predictions.length === 0) {
    var speller = new Speller();
    speller.train(canon.getCommandNames());
    var corrected = speller.correct(arg.text);
    if (corrected) {
      predictions.push(canon.getCommand(corrected));
    }
  }

  return predictions;
};

CommandType.prototype.parse = function(arg) {
  // Especially at startup, predictions live over the time that things change
  // so we provide a completion function rather than completion values
  var predictFunc = function() {
    return this._findPredictions(arg);
  }.bind(this);

  var predictions = this._findPredictions(arg);

  if (predictions.length === 0) {
    var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
    return new Conversion(null, arg, Status.ERROR, msg, predictFunc);
  }

  var command = predictions[0];

  if (predictions.length === 1) {
    // Is it an exact match of an executable command,
    // or just the only possibility?
    if (command.name === arg.text && typeof command.exec === 'function') {
      return new Conversion(command, arg, Status.VALID, '');
    }
    return new Conversion(null, arg, Status.INCOMPLETE, '', predictFunc);
  }

  // It's valid if the text matches, even if there are several options
  if (command.name === arg.text) {
    return new Conversion(command, arg, Status.VALID, '', predictFunc);
  }

  return new Conversion(null, arg, Status.INCOMPLETE, '', predictFunc);
};


});
