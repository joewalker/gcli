/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var Speller = require('gcli/types/spell').Speller;
var Argument = require('gcli/argument').Argument;


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
 * One of a known set of options
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
  var name = null;
  var lookup = this.getLookup();
  lookup.some(function(item) {
    var test = (item.value == null) ? item : item.value;
    if (test === value) {
      name = item.name;
      return true;
    }
    return false;
  }, this);
  return name;
};

/**
 * There are several ways to get selection data. This unifies them into one
 * single function.
 * @return An array of objects with name and value properties.
 */
SelectionType.prototype.getLookup = function() {
  if (this.lookup) {
    if (typeof this.lookup === 'function') {
      return this.lookup();
    }
    return this.lookup;
  }

  if (Array.isArray(this.data)) {
    this.lookup = this._dataToLookup(this.data);
    return this.lookup;
  }

  if (typeof(this.data) === 'function') {
    return this._dataToLookup(this.data());
  }

  throw new Error('SelectionType has no data');
};

/**
 * Selection can be provided with either a lookup object (in the 'lookup'
 * property) or an array of strings (in the 'data' property). Internally we
 * always use lookup, so we need a way to convert a 'data' array to a lookup.
 */
SelectionType.prototype._dataToLookup = function(data) {
  return data.map(function(option) {
    return { name: option, value: option };
  }, this);
};

/**
 * Return a list of possible completions for the given arg.
 * This code is very similar to CommandType._findPredictions(). If you are
 * making changes to this code, you should check there too.
 * @param arg The initial input to match
 * @return A trimmed lookup table of string:value pairs
 */
SelectionType.prototype._findPredictions = function(arg) {
  var predictions = [];
  var lookup = this.getLookup();

  // Start with prefix matching
  lookup.forEach(function(item) {
    if (item.name.indexOf(arg.text) === 0) {
      predictions.push(item);
    }
  }, this);

  // Try infix matching if we get less that 5 matched
  if (predictions.length < 5) {
    lookup.forEach(function(item) {
      if (item.name.indexOf(arg.text) !== -1) {
        predictions.push(item);
      }
    }, this);
  }

  // Try fuzzy matching if we don't get a prefix match
  if (predictions.length === 0) {
    var speller = new Speller();
    var names = lookup.map(function(item) {
      return item.name;
    });
    speller.train(names);
    var corrected = speller.correct(arg.text);
    if (corrected) {
      lookup.forEach(function(item) {
        if (item.name === corrected) {
          predictions.push(item);
        }
      }, this);
    }
  }

  return predictions;
};

SelectionType.prototype.parse = function(arg) {
  var predictions = this._findPredictions(arg);

  // This is something of a hack it basically allows us to tell the
  // setting type to forget its last setting hack.
  if (this.noMatch) {
    this.noMatch();
  }

  if (predictions.length === 0) {
    var msg = l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
    return new Conversion(null, arg, Status.ERROR, msg, predictions);
  }

  if (predictions[0].name === arg.text) {
    var value = predictions[0].value != null ?
            predictions[0].value :
            predictions[0];
    return new Conversion(value, arg, Status.VALID, '', predictions);
  }

  return new Conversion(null, arg, Status.INCOMPLETE, '', predictions);
};

/**
 * For selections, up is down and black is white. It's like this, given a list
 * [ a, b, c, d ], it's natural to think that it starts at the top and that
 * going up the list, moves towards 'a'. However 'a' has the lowest index, so
 * for SelectionType, up is down and down is up.
 * Sorry.
 */
SelectionType.prototype.decrement = function(value) {
  var lookup = this.getLookup();
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
  var lookup = this.getLookup();
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

SelectionType.prototype.getDefault = function() {
  var p = this.getLookup()[0];
  return new Conversion(p.value, new Argument(p.name));
};

SelectionType.prototype.name = 'selection';

exports.SelectionType = SelectionType;


});
