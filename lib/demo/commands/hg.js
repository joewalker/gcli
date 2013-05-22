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

'use strict';

var gcli = require('gcli/index');
var host = require('util/host');

var patchesHtml = require('text!demo/commands/patches.html');

/**
 * Top level 'hg' command
 */
var hg = {
  name: 'hg',
  description: 'Mercurial is a free, distributed source control management tool',
  manual: 'Mercurial is a free, distributed source control management tool. It efficiently handles projects of any size and offers an easy and intuitive interface.'
};

/**
 * Convert a list of patches to a DOM view
 */
var patchesToView = {
  from: 'patches',
  to: 'view',
  exec: function(patches, conversionContext) {
    return context.createView({
      html: patchesHtml,
      data: {
        patches: patches,
        onclick: context.update,
        ondblclick: context.updateExec
      }
    });
  }
};

/**
 * 'hg qseries' command
 */
var hgQseries = {
  name: 'hg qseries',
  description: 'Print the entire series file',
  params: [ ],
  returnType: 'patches',
  exec: function(args, context) {
    var execSpec = {
      cmd: '/usr/local/bin/hg',
      args: [ 'qseries' ],
      cwd: context.shell.cwd,
      env: context.shell.env
    };

    return host.exec(execSpec).then(function(output) {
      return output.split('\n').map(function(line) {
        return {
          name: line.split(':', 1)[0],
          comment: line.substring(name.length + 2)
        };
      });
    });
  }
};


/**
 * Registration and de-registration.
 */
exports.startup = function(data, reason) {
  gcli.addConverter(patchesToView);

  gcli.addCommand(hg);
  gcli.addCommand(hgQseries);
};

exports.shutdown = function(data, reason) {
  gcli.removeCommand(hg);
  gcli.removeCommand(hgQseries);

  gcli.removeConverter(patchesToView);
};


});
