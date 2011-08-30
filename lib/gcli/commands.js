/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var Command = require('gcli/canon').Command;

/**
 * hidden 'eval' command
 */
var evalCommandSpec = {
  name: 'eval',
  params: [
    {
      name: 'javascript',
      type: 'javascript',
      description: ''
    }
  ],
  returnType: 'html',
  description: { key: 'commands_eval_javascript' },
  exec: function(args, context) {
    // &#x2192; is right arrow. We use explicit entities to ensure XML validity
    var resultPrefix = '<em>{ ' + args.javascript + ' }</em> &#x2192; ';
    try {
      var result = eval(args.javascript);

      if (result === null) {
        return resultPrefix + 'null.';
      }

      if (result === undefined) {
        return resultPrefix + 'undefined.';
      }

      if (typeof result === 'function') {
        // &#160; is &nbsp;
        return resultPrefix +
          (result + '').replace(/\n/g, '<br>').replace(/ /g, '&#160;');
      }

      return resultPrefix + result;
    }
    catch (e) {
      return resultPrefix + 'Exception: ' + e.message;
    }
  }
};


/**
 * We don't want to register the eval commands using canon.addCommand(...)
 * because we don't want it to pop up in help etc in the normal way, however it
 * depends on types that are dynamically registered/destroyed, so we can't it
 * them be static.
 */
var evalCommand = null;

/**
 * Registration and de-registration.
 */
exports.getEvalCommand = function() {
  if (!evalCommand) {
    evalCommand = new Command(evalCommandSpec);
  }
  return evalCommand;
};

exports.destroyInternalCommands = function() {
  evalCommand = null;
};


});
