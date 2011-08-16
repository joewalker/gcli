/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var types = require('gcli/types');
var Conversion = types.Conversion;
var Type = types.Type;
var Status = types.Status;

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
  return value.name;
};

JavascriptType.prototype.parse = function(arg) {
  var typed = arg.text;
  if (typed == null || typed === '') {
    return new Conversion(null, arg, Status.INCOMPLETE, '');
  }

  var scope = window;

  // In FX-land we need to unwrap. TODO: Enable in the browser.
  // scope = unwrap(scope);

  // Analyze the input text and find the beginning of the last part that
  // should be completed.
  var beginning = this._findCompletionBeginning(typed);

  // There was an error analyzing the string.
  if (beginning.err) {
    return new Conversion(typed, arg, Status.ERROR, beginning.err);
  }

  // If the current state is not ParseState.NORMAL, then we are inside of an string
  // which means that no completion is possible.
  if (beginning.state !== ParseState.NORMAL) {
    return new Conversion(typed, arg, Status.INCOMPLETE, '');
  }

  var completionPart = typed.substring(beginning.startPos);

  // Don't complete on just an empty string.
  if (completionPart.trim() === "") {
    return new Conversion(typed, arg, Status.INCOMPLETE, '');
  }

  var properties = completionPart.split('.');
  var matchProp;
  if (properties.length > 1) {
    matchProp = properties.pop().trimLeft();
    for (var i = 0; i < properties.length; i++) {
      var prop = properties[i].trim();

      // We can't complete on null.foo, so bail out
      if (scope == null) {
        return new Conversion(typed, arg, Status.ERROR, beginning.err);
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

  if (scope == null) {
    return new Conversion(typed, arg, Status.ERROR, beginning.err);
  }

  // Skip Iterators and Generators.
  if (this._isIteratorOrGenerator(scope)) {
    return null;
  }

  var prefix = typed.slice(0, -matchProp.length);
  var status = Status.INCOMPLETE;
  var matches = [];
  for (var prop in scope) {
    if (prop.indexOf(matchProp) === 0) {
      var description = '(' + typeof scope[prop] + ')';
      var incomplete = true;
      if (description === '(number)') {
        description = scope[prop] + ' (number)';
        incomplete = false;
      }
      else if (description === '(string)') {
        description = scope[prop] + ' (string)';
        incomplete = false;
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
    }
  }

  // Can we think of a better sort order than alpha? There are certainly some
  // properties that are far more commonly used ...
  matches.sort(function(p1, p2) {
    return p1.name.localeCompare(p2.name);
  });

  return new Conversion(typed, arg, status, '', matches);
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
 *   { err: "ErrorMesssage" }
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
            return {
              err: "syntax error"
            };
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
          return {
            err: "unterminated string literal"
          };
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
          return {
            err: "unterminated string literal"
          };
          return;
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

  if (typeof aObject === "object") {
    if (typeof obj.__iterator__ === "function" ||
        obj.constructor && obj.constructor.name === "Iterator") {
      return true;
    }

    try {
      var str = obj.toString();
      if (typeof obj.next === "function" &&
          str.indexOf("[object Generator") === 0) {
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


/**
 * Registration and de-registration.
 */
exports.startup = function() {
  types.registerType(JavascriptType);
};

exports.shutdown = function() {
  types.unregisterType(JavascriptType);
};


});
