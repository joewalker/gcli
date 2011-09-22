

/**
 * Expose a Node object. This allows us to use the Node constants without
 * resorting to hardcoded numbers
 */
var Node = Components.interfaces.nsIDOMNode;


Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * Define setTimeout and clearTimeout to match the browser functions
 */
var setTimeout;
var clearTimeout;

(function() {
  /**
   * The next value to be returned by setTimeout
   */
  var nextID = 1;

  /**
   * The map of outstanding timeouts
   */
  var timers = {};

  /**
   * Object to be passed to Timer.initWithCallback()
   */
  function TimerCallback(callback) {
    this._callback = callback;
    var interfaces = [ Components.interfaces.nsITimerCallback ];
    this.QueryInterface = XPCOMUtils.generateQI(interfaces);
  }

  TimerCallback.prototype.notify = function(timer) {
    try {
      for (var timerID in timers) {
        if (timers[timerID] === timer) {
          delete timers[timerID];
          break;
        }
      }
      this._callback.apply(null, []);
    }
    catch (ex) {
      console.error(ex);
    }
  };

  /**
   * Executes a code snippet or a function after specified delay.
   * This is designed to have the same interface contract as the browser
   * function.
   * @param callback is the function you want to execute after the delay.
   * @param delay is the number of milliseconds that the function call should
   * be delayed by. Note that the actual delay may be longer, see Notes below.
   * @return the ID of the timeout, which can be used later with
   * window.clearTimeout.
   */
  setTimeout = function setTimeout(callback, delay) {
    var timer = Components.classes["@mozilla.org/timer;1"]
                          .createInstance(Components.interfaces.nsITimer);

    var timerID = nextID++;
    timers[timerID] = timer;

    timer.initWithCallback(new TimerCallback(callback), delay, timer.TYPE_ONE_SHOT);
    return timerID;
  };

  /**
   * Clears the delay set by window.setTimeout() and prevents the callback from
   * being executed (if it hasn't been executed already)
   * @param timerID the ID of the timeout you wish to clear, as returned by
   * window.setTimeout().
   */
  clearTimeout = function clearTimeout(timerID) {
    var timer = timers[timerID];
    if (timer) {
      timer.cancel();
      delete timers[timerID];
    }
  };
})();


/**
 * This creates a console object that somewhat replicates Firebug's console
 * object. It currently writes to dump(), but should write to the web
 * console's chrome error section (when it has one)
 */
var console = {};
(function() {
  /**
   * String utility to ensure that strings are a specified length. Strings
   * that are too long are truncated to the max length and the last char is
   * set to "_". Strings that are too short are left padded with spaces.
   *
   * @param {string} aStr
   *        The string to format to the correct length
   * @param {number} aMaxLen
   *        The maximum allowed length of the returned string
   * @param {number} aMinLen (optional)
   *        The minimum allowed length of the returned string. If undefined,
   *        then aMaxLen will be used
   * @param {object} aOptions (optional)
   *        An object allowing format customization. The only customization
   *        allowed currently is 'truncate' which can take the value "start" to
   *        truncate strings from the start as opposed to the end.
   * @return {string}
   *        The original string formatted to fit the specified lengths
   */
  function fmt(aStr, aMaxLen, aMinLen, aOptions) {
    if (aMinLen == undefined) {
      aMinLen = aMaxLen;
    }
    if (aStr == null) {
      aStr = "";
    }
    if (aStr.length > aMaxLen) {
      if (aOptions && aOptions.truncate == "start") {
        return "_" + aStr.substring(aStr.length - aMaxLen + 1);
      }
      else {
        return aStr.substring(0, aMaxLen - 1) + "_";
      }
    }
    if (aStr.length < aMinLen) {
      return Array(aMinLen - aStr.length + 1).join(" ") + aStr;
    }
    return aStr;
  }

  /**
   * Utility to extract the constructor name of an object.
   * Object.toString gives: "[object ?????]"; we want the "?????".
   *
   * @param {object} aObj
   *        The object from which to extract the constructor name
   * @return {string}
   *        The constructor name
   */
  function getCtorName(aObj) {
    return Object.prototype.toString.call(aObj).slice(8, -1);
  }

  /**
   * A single line stringification of an object designed for use by humans
   *
   * @param {any} aThing
   *        The object to be stringified
   * @return {string}
   *        A single line representation of aThing, which will generally be at
   *        most 60 chars long
   */
  function stringify(aThing) {
    if (aThing === undefined) {
      return "undefined";
    }

    if (aThing === null) {
      return "null";
    }

    if (typeof aThing == "object") {
      var type = getCtorName(aThing);
      if (type == "XULElement") {
        return debugElement(aThing);
      }
      type = (type == "Object" ? "" : type + " ");
      var json;
      try {
        json = JSON.stringify(aThing);
      }
      catch (ex) {
        // Can't use a real ellipsis here, because cmd.exe isn't unicode-enabled
        json = "{" + Object.keys(aThing).join(":..,") + ":.., " + "}";
      }
      return type + fmt(json, 50, 0);
    }

    var str = aThing.toString().replace(/\s+/g, " ");
    return fmt(str, 60, 0);
  }

  /**
   * Create a simple debug representation of a given element.
   *
   * @param {nsIDOMElement} aElement
   *        The element to debug
   * @return {string}
   *        A simple single line representation of aElement
   */
  function debugElement(aElement) {
    return "<" + aElement.tagName +
        (aElement.id ? "#" + aElement.id : "") +
        (aElement.className ?
            "." + aElement.className.split(" ").join(" .") :
            "") +
        ">";
  }

  /**
   * A multi line stringification of an object, designed for use by humans
   *
   * @param {any} aThing
   *        The object to be stringified
   * @return {string}
   *        A multi line representation of aThing
   */
  function log(aThing) {
    if (aThing == null) {
      return "null\n";
    }

    if (aThing == undefined) {
      return "undefined\n";
    }

    if (typeof aThing == "object") {
      var reply = "";
      var type = getCtorName(aThing);
      if (type == "Error") {
        reply += "  " + aThing.message + "\n";
        reply += logProperty("stack", aThing.stack);
      }
      else if (type == "XULElement") {
        reply += "  " + debugElement(aThing) + " (XUL)\n";
      }
      else {
        var keys = Object.getOwnPropertyNames(aThing);
        if (keys.length > 0) {
          reply += type + "\n";
          keys.forEach(function(aProp) {
            reply += logProperty(aProp, aThing[aProp]);
          }, this);
        }
        else {
          reply += type + " (enumerated with for-in)\n";
          var prop;
          for (prop in aThing) {
            reply += logProperty(prop, aThing[prop]);
          }
        }
      }

      return reply;
    }

    return "  " + aThing.toString() + "\n";
  }

  /**
   * Helper for log() which converts a property/value pair into an output
   * string
   *
   * @param {string} aProp
   *        The name of the property to include in the output string
   * @param {object} aValue
   *        Value assigned to aProp to be converted to a single line string
   * @return {string}
   *        Multi line output string describing the property/value pair
   */
  function logProperty(aProp, aValue) {
    var reply = "";
    if (aProp == "stack" && typeof value == "string") {
      var trace = parseStack(aValue);
      reply += formatTrace(trace);
    }
    else {
      reply += "    - " + aProp + " = " + stringify(aValue) + "\n";
    }
    return reply;
  }

  /**
   * Parse a stack trace, returning an array of stack frame objects, where
   * each has file/line/call members
   *
   * @param {string} aStack
   *        The serialized stack trace
   * @return {object[]}
   *        Array of { file: "...", line: NNN, call: "..." } objects
   */
  function parseStack(aStack) {
    var trace = [];
    aStack.split("\n").forEach(function(line) {
      if (!line) {
        return;
      }
      var at = line.lastIndexOf("@");
      var posn = line.substring(at + 1);
      trace.push({
        file: posn.split(":")[0],
        line: posn.split(":")[1],
        call: line.substring(0, at)
      });
    }, this);
    return trace;
  }

  /**
   * parseStack() takes output from an exception from which it creates the an
   * array of stack frame objects, this has the same output but using data from
   * Components.stack
   *
   * @param {string} aFrame
   *        The stack frame from which to begin the walk
   * @return {object[]}
   *        Array of { file: "...", line: NNN, call: "..." } objects
   */
  function getStack(aFrame) {
    if (!aFrame) {
      aFrame = Components.stack.caller;
    }
    var trace = [];
    while (aFrame) {
      trace.push({
        file: aFrame.filename,
        line: aFrame.lineNumber,
        call: aFrame.name
      });
      aFrame = aFrame.caller;
    }
    return trace;
  }

  /**
   * Take the output from parseStack() and convert it to nice readable
   * output
   *
   * @param {object[]} aTrace
   *        Array of trace objects as created by parseStack()
   * @return {string} Multi line report of the stack trace
   */
  function formatTrace(aTrace) {
    var reply = "";
    aTrace.forEach(function(frame) {
      reply += fmt(frame.file, 20, 20, { truncate: "start" }) + " " +
               fmt(frame.line, 5, 5) + " " +
               fmt(frame.call, 75, 75) + "\n";
    });
    return reply;
  }

  /**
   * Create a function which will output a concise level of output when used
   * as a logging function
   *
   * @param {string} aLevel
   *        A prefix to all output generated from this function detailing the
   *        level at which output occurred
   * @return {function}
   *        A logging function
   * @see createMultiLineDumper()
   */
  function createDumper(aLevel) {
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      var data = args.map(function(arg) {
        return stringify(arg);
      });
      dump(aLevel + ": " + data.join(", ") + "\n");
    };
  }

  /**
   * Create a function which will output more detailed level of output when
   * used as a logging function
   *
   * @param {string} aLevel
   *        A prefix to all output generated from this function detailing the
   *        level at which output occurred
   * @return {function}
   *        A logging function
   * @see createDumper()
   */
  function createMultiLineDumper(aLevel) {
    return function() {
      dump(aLevel + "\n");
      var args = Array.prototype.slice.call(arguments, 0);
      args.forEach(function(arg) {
        dump(log(arg));
      });
    };
  }

  /**
   * Build out the console object
   */
  console.debug = createMultiLineDumper("debug");
  console.log = createDumper("log");
  console.info = createDumper("info");
  console.warn = createDumper("warn");
  console.error = createMultiLineDumper("error");
  console.trace = function Console_trace() {
    var trace = getStack(Components.stack.caller);
    dump(formatTrace(trace) + "\n");
  },
  console.clear = function Console_clear() {};

  console.dir = createMultiLineDumper("dir");
  console.dirxml = createMultiLineDumper("dirxml");
  console.group = createDumper("group");
  console.groupEnd = createDumper("groupEnd");

})();
