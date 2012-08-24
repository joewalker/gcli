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


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var types = require('gcli/types');
var SelectionType = require('gcli/types/selection').SelectionType;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(CommandType);
  types.registerType(ParamType);
};

exports.shutdown = function() {
  types.unregisterType(CommandType);
  types.unregisterType(ParamType);
};


/**
 * Select from the available commands.
 * This is very similar to a SelectionType, however the level of hackery in
 * SelectionType to make it handle Commands correctly was to high, so we
 * simplified.
 * If you are making changes to this code, you should check there too.
 */
function ParamType(typeSpec) {
  this.requisition = typeSpec.requisition;
  this.isIncompleteName = typeSpec.isIncompleteName;
  this.stringifyProperty = 'name';
}

ParamType.prototype = Object.create(SelectionType.prototype);

ParamType.prototype.name = 'param';

ParamType.prototype.lookup = function() {
  var displayedParams = [];
  var command = this.requisition.commandAssignment.value;
  command.params.forEach(function(param) {
    var arg = this.requisition.getAssignment(param.name).arg;
    if (!param.isPositionalAllowed && arg.type === "BlankArgument") {
      displayedParams.push({ name: '--' + param.name, value: param });
    }
  }, this);
  return displayedParams;
};

ParamType.prototype.parse = function(arg) {
  return this.isIncompleteName ?
      SelectionType.prototype.parse.call(this, arg) :
      new Conversion(undefined, arg, Status.ERROR, l10n.lookup('cliUnusedArg'));
};


/**
 * Select from the available commands.
 * This is very similar to a SelectionType, however the level of hackery in
 * SelectionType to make it handle Commands correctly was to high, so we
 * simplified.
 * If you are making changes to this code, you should check there too.
 */
function CommandType() {
  this.stringifyProperty = 'name';
}

CommandType.prototype = Object.create(SelectionType.prototype);

CommandType.prototype.name = 'command';

CommandType.prototype.lookup = function() {
  var commands = canon.getCommands();
  commands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });
  return commands.map(function(command) {
    return { name: command.name, value: command };
  }, this);
};

/**
 * Add an option to our list of predicted options
 */
CommandType.prototype._addToPredictions = function(predictions, option, arg) {
  // The command type needs to exclude sub-commands when the CLI
  // is blank, but include them when we're filtering. This hack
  // excludes matches when the filter text is '' and when the
  // name includes a space.
  if (arg.text.length !== 0 || option.name.indexOf(' ') === -1) {
    predictions.push(option);
  }
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
    return new Conversion(undefined, arg, Status.ERROR, msg, predictFunc);
  }

  var command = predictions[0].value;

  if (predictions.length === 1) {
    // Is it an exact match of an executable command,
    // or just the only possibility?
    if (command.name === arg.text && typeof command.exec === 'function') {
      return new Conversion(command, arg, Status.VALID, '');
    }
    return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
  }

  // It's valid if the text matches, even if there are several options
  if (predictions[0].name === arg.text) {
    return new Conversion(command, arg, Status.VALID, '', predictFunc);
  }

  return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
};


});
