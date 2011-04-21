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
 * The Original Code is GCLI.
 *
 * The Initial Developer of the Original Code is
 * Mozilla
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Joe Walker (jwalker@mozilla.com)
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

/**
 * This is where define stores the modules for access in GCLI.create()
 */
var moduleDefs = {};

/**
 * The function is a clone of the RequireJS style module definition wrapper.
 * @param module a name for the payload
 * @param deps
 * @param payload a function to call with (require, exports, module) params
 */
function define(moduleName, deps, payload)
{
  if (typeof moduleName != "string") {
    dump("dropping module because moduleName wasn't a string.\n");
    return;
  }

  moduleDefs[moduleName] = payload;
}






var console = {};

function fmt(str, maxLen, minLen) {
  if (minLen === undefined) {
    minLen = maxLen;
  }
  if (str.length > maxLen) return str.substring(0, maxLen - 1) + "_";
  if (str.length < minLen) return Array(minLen - str.length + 1).join(" ") + str;
  return str;
}

/**
 * Object.toString gives: "[object ?????]"; we want the "?????".
 */
function getCtorName(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

function stringify(thing) {
  if (thing === undefined) {
    return "undefined";
  }

  if (thing === null) {
    return "null";
  }

  if (typeof thing === "object") {
    try {
      return getCtorName(thing) + " " + fmt(JSON.stringify(thing), 50, 0);
    }
    catch (ex) {
      return "[stringify error]";
    }
  }

  return thing.toString();
}

function log(thing) {
  if (thing === null) {
    return "null";
  }

  if (thing === undefined) {
    return "undefined";
  }

  if (typeof thing === "object") {
    var reply = '';
    var type = getCtorName(thing);
    if (type === 'Error') {
      reply += '  ' + thing.message + "\n";
      reply += logProperty('stack', thing.stack);
    }
    else {
      var keys = Object.getOwnPropertyNames(thing);
      if (keys.length > 0) {
        reply += type + "\n";
        keys.forEach(function(prop) {
          reply += logProperty(prop, thing[prop]);
        }, this);
      }
      else {
        reply += type + " (enumerated with var in)\n";
        for (var prop in thing) {
          reply += logProperty(prop, thing[prop]);
        }
      }
    }

    return reply;
  }

  return "  " + thing.toString() + "\n";
}

function logProperty(prop, value) {
  var reply = '';
  if (prop == "stack" && typeof value == "string") {
    var trace = parseStack(value);
    reply += formatTrace(trace);
  }
  else {
    reply += '    - ' + prop + ' = ' + stringify(value) + "\n";
  }
  return reply;
}

function parseStack(stack) {
  var trace = [];
  stack.split("\n").forEach(function(line) {
    if (!line) {
      return;
    }
    var at = line.lastIndexOf("@");
    var posn = line.substring(at + 1);
    posn = posn.replace(/resource:\/\/\/modules\//, "");
    posn = posn.replace(/chrome:\/\/browser\/content\//, "");
    trace.push({
      file: posn.split(":")[0],
      line: posn.split(":")[1],
      call: line.substring(0, at)
    });
  }, this);
  return trace;
}

function formatTrace(trace) {
  var reply = '';
  trace.forEach(function(frame) {
    reply += fmt(frame.file, 15) + " " +
             fmt(frame.line, 5) + " " +
             fmt(frame.call, 75) + "\n";
  }, this);
  return reply;
}

function createDumper(level) {
  return function() {
    var args = Array.prototype.slice.call(arguments, 0);
    var data = args.map(function(arg) {
      return stringify(arg);
    });
    dump(level + ": " + data.join(", ") + "\n");
  };
}

function createMultiLineDumper(level) {
  return function() {
    dump(level + "\n");
    var args = Array.prototype.slice.call(arguments, 0);
    args.forEach(function(arg) {
      dump(log(arg));
    });
  };
}

console.debug = createDumper("debug");
console.log = createDumper("log");
console.info = createDumper("info");
console.warn = createDumper("warn");
console.error = createMultiLineDumper("error");

console.trace = function() {
  try {
    null.trace;
  }
  catch (ex) {
    var trace = parseStack(ex.stack);
    dump(formatTrace(trace) + "\n");
  }
};

console.clear = function() {};
