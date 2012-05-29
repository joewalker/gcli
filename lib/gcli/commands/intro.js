/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var gcli = require('gcli/index');
  var l10n = require('gcli/l10n');
  var intro = require('gcli/ui/intro');

  /**
   * 'intro' command
   */
  var introCmdSpec = {
    name: 'intro',
    description: l10n.lookup('introDesc'),
    manual: l10n.lookup('introManual'),
    returnType: 'html',
    exec: function echo(args, context) {
      return intro.createView(context);
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
