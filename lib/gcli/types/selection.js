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

var Promise = require('util/promise');
var util = require('util/util');
var l10n = require('util/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var spell = require('gcli/types/spell');
var BlankArgument = require('gcli/argument').BlankArgument;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(SelectionType);
};

exports.shutdown = function() {
  types.unregisterType(SelectionType);
};


/**
 * A selection allows the user to pick a value from known set of options.
 * An option is made up of a name (which is what the user types) and a value
 * (which is passed to exec)
 * @param typeSpec Object containing properties that describe how this
 * selection functions. Properties include:
 * - lookup: An array of objects, one for each option, which contain name and
 *   value properties. lookup can be a function which returns this array
 * - data: An array of strings - alternative to 'lookup' where the valid values
 *   are strings. i.e. there is no mapping between what is typed and the value
 *   that is used by the program
 * - stringifyProperty: Conversion from value to string is generally a process
 *   of looking through all the valid options for a matching value, and using
 *   the associated name. However the name maybe available directly from the
 *   value using a property lookup. Setting 'stringifyProperty' allows
 *   SelectionType to take this shortcut.
 * - cacheable: If lookup is a function, then we normally assume that
 *   the values fetched can change. Setting 'cacheable:true' enables internal
 *   caching.
 * - neverForceAsync: It's useful for testing purposes to be able to force all
 *   selection types to be asynchronous. This flag prevents that happening for
 *   types that are fundamentally synchronous.
 */
function SelectionType(typeSpec) {
  if (typeSpec) {
    Object.keys(typeSpec).forEach(function(key) {
      this[key] = typeSpec[key];
    }, this);
  }
}

SelectionType.prototype = Object.create(Type.prototype);

SelectionType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  if (this.stringifyProperty != null) {
    return value[this.stringifyProperty];
  }

  try {
    var name = null;
    var lookup = util.synchronize(this.getLookup());
    lookup.some(function(item) {
      if (item.value === value) {
        name = item.name;
        return true;
      }
      return false;
    }, this);
    return name;
  }
  catch (ex) {
    // Types really need to ensure stringify can happen synchronously
    // which means using stringifyProperty if getLookup is asynchronous, but
    // if this fails we need a bailout ...
    return value.toString();
  }
};

/**
 * If typeSpec contained cacheable:true then calls to parse() work on cached
 * data. clearCache() enables the cache to be cleared.
 */
SelectionType.prototype.clearCache = function() {
  delete this._cachedLookup;
};

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 * @return An array of objects with name and value properties.
 */
SelectionType.prototype.getLookup = function() {
  if (this._cachedLookup != null) {
    return this._cachedLookup;
  }

  var reply;
  if (this.lookup == null) {
    reply = resolve(this.data, this.neverForceAsync).then(dataToLookup);
  }
  else {
    var lookup = (typeof this.lookup === 'function') ?
            this.lookup.bind(this) :
            this.lookup;

    reply = resolve(lookup, this.neverForceAsync);
  }

  if (this.cacheable && !forceAsync) {
    this._cachedLookup = reply;
  }

  return reply;
};

var forceAsync = false;

/**
 * Both 'lookup' and 'data' properties (see docs on SelectionType constructor)
 * in addition to being real data can be a function or a promise, or even a
 * function which returns a promise of real data, etc. This takes a thing and
 * returns a promise of actual values.
 */
function resolve(thing, neverForceAsync) {
  if (forceAsync && !neverForceAsync) {
    var deferred = Promise.defer();
    setTimeout(function() {
      Promise.resolve(thing).then(function(resolved) {
        if (typeof resolved === 'function') {
          resolved = resolve(resolved(), neverForceAsync);
        }

        deferred.resolve(resolved);
      });
    }, 500);
    return deferred.promise;
  }

  return Promise.resolve(thing).then(function(resolved) {
    if (typeof resolved === 'function') {
      return resolve(resolved(), neverForceAsync);
    }
    return resolved;
  });
}

/**
 * Selection can be provided with either a lookup object (in the 'lookup'
 * property) or an array of strings (in the 'data' property). Internally we
 * always use lookup, so we need a way to convert a 'data' array to a lookup.
 */
function dataToLookup(data) {
  if (!Array.isArray(data)) {
    throw new Error('SelectionType has no lookup or data');
  }

  return data.map(function(option) {
    return { name: option, value: option };
  }, this);
};

/**
 * Return a list of possible completions for the given arg.
 * @param arg The initial input to match
 * @return A trimmed array of string:value pairs
 */
SelectionType.prototype._findPredictions = function(arg) {
  return Promise.resolve(this.getLookup()).then(function(lookup) {
    var predictions = [];
    var i, option;
    var maxPredictions = Conversion.maxPredictions;
    var match = arg.text.toLowerCase();

    // If the arg has a suffix then we're kind of 'done'. Only an exact match
    // will do.
    if (arg.suffix.length > 0) {
      for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
        option = lookup[i];
        if (option.name === arg.text) {
          this._addToPredictions(predictions, option, arg);
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
        this._addToPredictions(predictions, option, arg);
      }
    }

    // Start with prefix matching
    for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
      option = lookup[i];
      if (option._gcliLowerName.indexOf(match) === 0 && !option.value.hidden) {
        if (predictions.indexOf(option) === -1) {
          this._addToPredictions(predictions, option, arg);
        }
      }
    }

    // Try infix matching if we get less half max matched
    if (predictions.length < (maxPredictions / 2)) {
      for (i = 0; i < lookup.length && predictions.length < maxPredictions; i++) {
        option = lookup[i];
        if (option._gcliLowerName.indexOf(match) !== -1 && !option.value.hidden) {
          if (predictions.indexOf(option) === -1) {
            this._addToPredictions(predictions, option, arg);
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
};

/**
 * Add an option to our list of predicted options.
 * We abstract out this portion of _findPredictions() because CommandType needs
 * to make an extra check before actually adding which SelectionType does not
 * need to make.
 */
SelectionType.prototype._addToPredictions = function(predictions, option, arg) {
  predictions.push(option);
};

SelectionType.prototype.parse = function(arg) {
  return this._findPredictions(arg).then(function(predictions) {
    if (predictions.length === 0) {
      var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
      return new Conversion(undefined, arg, Status.ERROR, msg,
                            Promise.resolve(predictions));
    }

    // This is something of a hack it basically allows us to tell the
    // setting type to forget its last setting hack.
    if (this.noMatch) {
      this.noMatch();
    }

    if (predictions[0].name === arg.text) {
      var value = predictions[0].value;
      return new Conversion(value, arg, Status.VALID, '',
                            Promise.resolve(predictions));
    }

    return new Conversion(undefined, arg, Status.INCOMPLETE, '',
                          Promise.resolve(predictions));
  }.bind(this));
};

SelectionType.prototype.getBlank = function() {
  var predictFunc = function() {
    return Promise.resolve(this.getLookup()).then(function(lookup) {
      return lookup.filter(function(option) {
        return !option.value.hidden;
      }).slice(0, Conversion.maxPredictions - 1);
    }, console.error);
  }.bind(this);

  return new Conversion(undefined, new BlankArgument(), Status.INCOMPLETE, '',
                        predictFunc);
};

/**
 * For selections, up is down and black is white. It's like this, given a list
 * [ a, b, c, d ], it's natural to think that it starts at the top and that
 * going up the list, moves towards 'a'. However 'a' has the lowest index, so
 * for SelectionType, up is down and down is up.
 * Sorry.
 */
SelectionType.prototype.decrement = function(value) {
  var lookup = util.synchronize(this.getLookup());
  var index = this._findValue(lookup, value);
  if (index === -1) {
    index = 0;
  }
  index++;
  if (index >= lookup.length) {
    index = 0;
  }
  return lookup[index].value;
};

/**
 * See note on SelectionType.decrement()
 */
SelectionType.prototype.increment = function(value) {
  var lookup = util.synchronize(this.getLookup());
  var index = this._findValue(lookup, value);
  if (index === -1) {
    // For an increment operation when there is nothing to start from, we
    // want to start from the top, i.e. index 0, so the value before we
    // 'increment' (see note above) must be 1.
    index = 1;
  }
  index--;
  if (index < 0) {
    index = lookup.length - 1;
  }
  return lookup[index].value;
};

/**
 * Walk through an array of { name:.., value:... } objects looking for a
 * matching value (using strict equality), returning the matched index (or -1
 * if not found).
 * @param lookup Array of objects with name/value properties to search through
 * @param value The value to search for
 * @return The index at which the match was found, or -1 if no match was found
 */
SelectionType.prototype._findValue = function(lookup, value) {
  var index = -1;
  for (var i = 0; i < lookup.length; i++) {
    var pair = lookup[i];
    if (pair.value === value) {
      index = i;
      break;
    }
  }
  return index;
};

SelectionType.prototype.name = 'selection';

exports.SelectionType = SelectionType;


});
