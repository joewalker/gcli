/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var l10n = require('gcli/l10n');
var types = require('gcli/types');

var Conversion = types.Conversion;
var Type = types.Type;
var Status = types.Status;


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(JavascriptType);
};

exports.shutdown = function() {
  types.unregisterType(JavascriptType);
};

/**
 * The object against which we complete, which is usually 'window' if it exists
 * but could be something else in non-web-content environments.
 */
var globalObject;
if (typeof window !== 'undefined') {
  globalObject = window;
}

/**
 * Setter for the object against which JavaScript completions happen
 */
exports.setGlobalObject = function(obj) {
  globalObject = obj;
};

/**
 * Remove registration of object against which JavaScript completions happen
 */
exports.unsetGlobalObject = function() {
  globalObject = undefined;
};


/**
 * 'javascript' handles scripted input
 */
function JavascriptType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('JavascriptType can not be customized');
  }
}

JavascriptType.prototype = Object.create(Type.prototype);

JavascriptType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value;
};

JavascriptType.prototype.parse = function(arg) {
  var typed = arg.text;
  var scope = globalObject;

  // Analyze the input text and find the beginning of the last part that
  // should be completed.
  var beginning = this._findCompletionBeginning(typed);

  // There was an error analyzing the string.
  if (beginning.err) {
    return new Conversion(typed, arg, Status.ERROR, beginning.err);
  }

  // If the current state is not ParseState.NORMAL, then we are inside of a
  // string which means that no completion is possible.
  if (beginning.state !== ParseState.NORMAL) {
    return new Conversion(typed, arg, Status.INCOMPLETE, '');
  }

  var completionPart = typed.substring(beginning.startPos);
  var properties = completionPart.split('.');
  var matchProp;
  var prop;

  if (properties.length > 1) {
    matchProp = properties.pop().trimLeft();
    for (var i = 0; i < properties.length; i++) {
      prop = properties[i].trim();

      // We can't complete on null.foo, so bail out
      if (scope == null) {
        return new Conversion(typed, arg, Status.ERROR,
                l10n.lookup('jstypeParseScope'));
      }

      // TODO: Re-enable this test
      // Check if prop is a getter function on obj. Functions can change other
      // stuff so we can't execute them to get the next object. Stop here.
      // if (isNonNativeGetter(scope, prop)) {
      //   return new Conversion(typed, arg);
      // }

      try {
        scope = scope[prop];
      }
      catch (ex) {
        return new Conversion(typed, arg, Status.ERROR, '' + ex);
      }
    }
  }
  else {
    matchProp = properties[0].trimLeft();
  }

  // If the reason we just stopped adjusting the scope was a non-simple string,
  // then we're not sure if the input is valid or invalid, so accept it
  if (prop && !prop.match(/^[0-9A-Za-z]*$/)) {
    return new Conversion(typed, arg);
  }

  // However if the prop was a simple string, it is an error
  if (scope == null) {
    return new Conversion(typed, arg, Status.ERROR,
        l10n.lookupFormat('jstypeParseMissing', [ prop ]));
  }

  // If the thing we're looking for isn't a simple string, then we're not going
  // to find it, but we're not sure if it's valid or invalid, so accept it
  if (!matchProp.match(/^[0-9A-Za-z]*$/)) {
    return new Conversion(typed, arg);
  }

  // Skip Iterators and Generators.
  if (this._isIteratorOrGenerator(scope)) {
    return null;
  }

  var matchLen = matchProp.length;
  var prefix = matchLen === 0 ? typed : typed.slice(0, -matchLen);
  var status = Status.INCOMPLETE;
  var message;
  var matches = [];

  for (var prop in scope) {
    if (prop.indexOf(matchProp) === 0) {
      var value;
      try {
        value = scope[prop];
      }
      catch (ex) {
        break;
      }
      var description;
      var incomplete = true;
      if (typeof value === 'function') {
        description = '(function)';
      }
      if (typeof value === 'boolean' || typeof value === 'number') {
        description = '= ' + value;
        incomplete = false;
      }
      else if (typeof value === 'string') {
        if (value.length > 40) {
          value = value.substring(0, 37) + '...';
        }
        description = '= \'' + value + '\'';
        incomplete = false;
      }
      else {
        description = '(' + typeof value + ')';
      }
      matches.push({
        name: prefix + prop,
        value: {
          name: prefix + prop,
          description: description
        },
        incomplete: incomplete
      });
    }
    if (prop === matchProp) {
      status = Status.VALID;
      message = '';
    }
  }

  // Error message if this isn't valid
  if (status !== Status.VALID) {
    message = l10n.lookupFormat('jstypeParseMissing', [ matchProp ]);
  }

  // If the match is the only one possible, and its VALID, predict nothing
  if (matches.length === 1 && status === Status.VALID) {
    matches = undefined;
  }
  else {
    // Can we think of a better sort order than alpha? There are certainly some
    // properties that are far more commonly used ...
    matches.sort(function(p1, p2) {
      return p1.name.localeCompare(p2.name);
    });
  }

  // More than 10 matches are generally not helpful. We should really do a
  // better job of finding matches (bug 682694), but in the mean time there is
  // a performance problem associated with creating a large number of DOM nodes
  // that few people will ever read, so trim the list of matches
  if (matches && matches.length > 10) {
    matches = matches.slice(0, 9);
  }

  return new Conversion(typed, arg, status, message, matches);
};

var ParseState = {
  NORMAL: 0,
  QUOTE: 2,
  DQUOTE: 3
};

var OPEN_BODY = '{[('.split('');
var CLOSE_BODY = '}])'.split('');
var OPEN_CLOSE_BODY = {
  '{': '}',
  '[': ']',
  '(': ')'
};

/**
 * Analyzes a given string to find the last statement that is interesting for
 * later completion.
 * @param text A string to analyze
 * @return If there was an error in the string detected, then a object like
 *   { err: 'ErrorMesssage' }
 * is returned, otherwise a object like
 *   {
 *     state: ParseState.NORMAL|ParseState.QUOTE|ParseState.DQUOTE,
 *     startPos: index of where the last statement begins
 *   }
 */
JavascriptType.prototype._findCompletionBeginning = function(text) {
  var bodyStack = [];

  var state = ParseState.NORMAL;
  var start = 0;
  var c;
  for (var i = 0; i < text.length; i++) {
    c = text[i];

    switch (state) {
      // Normal JS state.
      case ParseState.NORMAL:
        if (c === '"') {
          state = ParseState.DQUOTE;
        }
        else if (c === '\'') {
          state = ParseState.QUOTE;
        }
        else if (c === ';') {
          start = i + 1;
        }
        else if (c === ' ') {
          start = i + 1;
        }
        else if (OPEN_BODY.indexOf(c) != -1) {
          bodyStack.push({
            token: c,
            start: start
          });
          start = i + 1;
        }
        else if (CLOSE_BODY.indexOf(c) != -1) {
          var last = bodyStack.pop();
          if (!last || OPEN_CLOSE_BODY[last.token] != c) {
            return { err: l10n.lookup('jstypeBeginSyntax') };
          }
          if (c === '}') {
            start = i + 1;
          }
          else {
            start = last.start;
          }
        }
        break;

      // Double quote state > " <
      case ParseState.DQUOTE:
        if (c === '\\') {
          i ++;
        }
        else if (c === '\n') {
          return { err: l10n.lookup('jstypeBeginUnterm') };
        }
        else if (c === '"') {
          state = ParseState.NORMAL;
        }
        break;

      // Single quote state > ' <
      case ParseState.QUOTE:
        if (c === '\\') {
          i ++;
        }
        else if (c === '\n') {
          return { err: l10n.lookup('jstypeBeginUnterm') };
        }
        else if (c === '\'') {
          state = ParseState.NORMAL;
        }
        break;
    }
  }

  return {
    state: state,
    startPos: start
  };
};

/**
 * Return true if the passed object is either an iterator or a generator, and
 * false otherwise.
 * @param obj The object to check
 */
JavascriptType.prototype._isIteratorOrGenerator = function(obj) {
  if (obj === null) {
    return false;
  }

  if (typeof aObject === 'object') {
    if (typeof obj.__iterator__ === 'function' ||
        obj.constructor && obj.constructor.name === 'Iterator') {
      return true;
    }

    try {
      var str = obj.toString();
      if (typeof obj.next === 'function' &&
          str.indexOf('[object Generator') === 0) {
        return true;
      }
    }
    catch (ex) {
      // window.history.next throws in the typeof check above.
      return false;
    }
  }

  return false;
};

JavascriptType.prototype.name = 'javascript';

exports.JavascriptType = JavascriptType;


});
