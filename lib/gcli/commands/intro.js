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

  var canon = require('gcli/canon');
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
    canon.addCommand(introCmdSpec);
  };

  exports.shutdown = function() {
    canon.removeCommand(introCmdSpec);
  };

});
