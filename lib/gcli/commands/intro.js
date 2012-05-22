/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var gcli = require('gcli/index');
  var l10n = require('gcli/l10n');
  var util = require('gcli/util');

  /**
   * 'intro' command
   */
  var introCmdSpec = {
    name: 'intro',
    description: l10n.lookup('introDesc'),
    manual: l10n.lookup('introManual'),
    returnType: 'html',
    exec: function echo(args, context) {
      return context.createView({
        html: require('text!gcli/ui/intro.html'),
        options: { stack: 'intro.html' },
        data: {
          onclick: function(ev) {
            util.updateCommand(ev.currentTarget, context);
          },
          ondblclick: function(ev) {
            util.executeCommand(ev.currentTarget, context);
          }
        }
      });
    }
  };


  /**
   * Registration and de-registration.
   */
  exports.startup = function() {
    gcli.addCommand(introCmdSpec);
  };

  exports.shutdown = function() {
    gcli.removeCommand(introCmdSpec);
  };

});
