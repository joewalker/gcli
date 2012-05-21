/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  var canon = require('gcli/canon');
  var l10n = require('gcli/l10n');

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
        html: require('text!gcli/ui/intro.html')
      });
    }
  };


  /**
   * Registration and de-registration.
   */
  exports.startup = function() {
    canon.addCommand(introCmdSpec);
  };

  exports.shutdown = function() {
    canon.removeCommand(introCmdSpec);
  };

});
