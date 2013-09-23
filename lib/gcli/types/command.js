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

'use strict';

var promise = require('gcli/util/promise');
var l10n = require('gcli/util/l10n');
var spell = require('gcli/util/spell');
var canon = require('gcli/canon');
var SelectionType = require('gcli/types/selection').SelectionType;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;

exports.items = [
  {
    // Select from the available parameters to a command
    item: 'type',
    name: 'param',
    parent: 'selection',
    stringifyProperty: 'name',
    neverForceAsync: true,
    requisition: undefined,
    isIncompleteName: undefined,

    lookup: function() {
      var displayedParams = [];
      var command = this.requisition.commandAssignment.value;
      if (command != null) {
        command.params.forEach(function(param) {
          var arg = this.requisition.getAssignment(param.name).arg;
          if (!param.isPositionalAllowed && arg.type === 'BlankArgument') {
            displayedParams.push({ name: '--' + param.name, value: param });
          }
        }, this);
      }
      return displayedParams;
    },

    parse: function(arg, context) {
      if (this.isIncompleteName) {
        return SelectionType.prototype.parse.call(this, arg, context);
      }
      else {
        var message = l10n.lookup('cliUnusedArg');
        return promise.resolve(new Conversion(undefined, arg, Status.ERROR, message));
      }
    }
  },
  {
    // Select from the available commands
    // This is very similar to a SelectionType, however the level of hackery in
    // SelectionType to make it handle Commands correctly was to high, so we
    // simplified.
    // If you are making changes to this code, you should check there too.
    item: 'type',
    name: 'command',
    parent: 'selection',
    stringifyProperty: 'name',
    neverForceAsync: true,
    allowNonExec: true,

    lookup: function() {
      var commands = canon.getCommands();
      commands.sort(function(c1, c2) {
        return c1.name.localeCompare(c2.name);
      });
      return commands.map(function(command) {
        return { name: command.name, value: command };
      }, this);
    },

    parse: function(arg, context) {
      // Helper function - Commands like 'context' work best with parent
      // commands which are not executable. However obviously to execute a
      // command, it needs an exec function.
      var execWhereNeeded = function(command) {
        return this.allowNonExec || typeof command.exec === 'function';
      }.bind(this);

      var command = canon.getCommand(arg.text);

      // Predictions live over the time that things change so we provide a
      // completion function rather than completion values
      var predictFunc = function() {
        return this._findPredictions(arg).then(function(predictions) {
          // If it's an exact match of an executable command (rather than just
          // the only possibility) then we don't want alternatives
          if (command && command.name === arg.text &&
              execWhereNeeded(command) && predictions.length === 1) {
            return [];
          }

          return predictions;
        }.bind(this));
      }.bind(this);

      if (command) {
        var status = execWhereNeeded(command) ? Status.VALID : Status.INCOMPLETE;
        var conversion = new Conversion(command, arg, status, '', predictFunc);
        return promise.resolve(conversion);
      }

      return this._findPredictions(arg).then(function(predictions) {
        if (predictions.length === 0) {
          var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
          return new Conversion(undefined, arg, Status.ERROR, msg, predictFunc);
        }

        command = predictions[0].value;

        if (predictions.length === 1) {
          // Is it an exact match of an executable command,
          // or just the only possibility?
          if (command.name === arg.text && execWhereNeeded(command)) {
            return new Conversion(command, arg, Status.VALID, '');
          }

          return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
        }

        // It's valid if the text matches, even if there are several options
        if (predictions[0].name === arg.text) {
          return new Conversion(command, arg, Status.VALID, '', predictFunc);
        }

        return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictFunc);
      }.bind(this));
    },

    _findPredictions: function(arg, context) {
      return promise.resolve(this.getLookup(context)).then(function(lookup) {
        var predictions = [];
        var i, option;
        var maxPredictions = Conversion.maxPredictions;
        var match = arg.text.toLowerCase();

        // Add an option to our list of predicted options
        var addToPredictions = function(option) {
          if (arg.text.length === 0) {
            // If someone hasn't typed anything, we only show top level commands in
            // the menu. i.e. sub-commands (those with a space in their name) are
            // excluded. We do this to keep the list at an overview level.
            if (option.name.indexOf(' ') === -1) {
              predictions.push(option);
            }
          }
          else {
            // If someone has typed something, then we exclude parent commands
            // (those without an exec). We do this because the user is drilling
            // down and doesn't need the summary level.
            if (option.value.exec != null) {
              predictions.push(option);
            }
          }
        };

        // If the arg has a suffix then we're kind of 'done'. Only an exact
        // match will do.
        if (arg.suffix.match(/ +/)) {
          for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
            option = lookup[i];
            if (option.name === arg.text ||
                option.name.indexOf(arg.text + ' ') === 0) {
              addToPredictions(option);
            }
          }

          return predictions;
        }

        // Cache lower case versions of all the option names
        for (i = 0; i < lookup.length; i++) {
          option = lookup[i];
          if (option._gcliLowerName == null) {
            option._gcliLowerName = option.name.toLowerCase();
          }
        }

        // Exact hidden matches. If 'hidden: true' then we only allow exact matches
        // All the tests after here check that !option.value.hidden
        for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
          option = lookup[i];
          if (option.name === arg.text) {
            addToPredictions(option);
          }
        }

        // Start with prefix matching
        for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
          option = lookup[i];
          if (option._gcliLowerName.indexOf(match) === 0 && !option.value.hidden) {
            if (predictions.indexOf(option) === -1) {
              addToPredictions(option);
            }
          }
        }

        // Try infix matching if we get less half max matched
        if (predictions.length < (maxPredictions / 2)) {
          for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
            option = lookup[i];
            if (option._gcliLowerName.indexOf(match) !== -1 && !option.value.hidden) {
              if (predictions.indexOf(option) === -1) {
                addToPredictions(option);
              }
            }
          }
        }

        // Try fuzzy matching if we don't get a prefix match
        if (predictions.length === 0) {
          var names = [];
          lookup.forEach(function(opt) {
            if (!opt.value.hidden) {
              names.push(opt.name);
            }
          });
          var corrected = spell.correct(match, names);
          if (corrected) {
            lookup.forEach(function(opt) {
              if (opt.name === corrected) {
                predictions.push(opt);
              }
            }, this);
          }
        }

        return predictions;
      }.bind(this));
    }
  }
];

});
