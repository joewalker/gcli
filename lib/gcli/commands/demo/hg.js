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

'use strict';

var host = require('../../util/host');

exports.items = [
  {
    // Top level 'hg' command
    item: 'command',
    name: 'hg',
    description: 'Mercurial is a free, distributed source control management tool',
    manual: 'Mercurial is a free, distributed source control management tool. It efficiently handles projects of any size and offers an easy and intuitive interface.'
  },
  {
    // Convert a list of patches to a DOM view
    item: 'converter',
    from: 'patches',
    to: 'view',
    exec: function(patches, context) {
      return {
        html:
          '<table>\n' +
          '  <tr foreach="patch in ${patches}">\n' +
          '    <td>${patch.name}</td>\n' +
          '    <td><div style="font-size: 90%;">${patch.comment}</div></td>\n' +
          '    <td>\n' +
          '      <span\n' +
          '          class="gcli-out-shortcut"\n' +
          '          data-command="hg qgoto ${patch.name}"\n' +
          '          onclick="${onclick}" ondblclick="${ondblclick}">goto</span>\n' +
          '    </td>\n' +
          '  </tr>\n' +
          '</table>\n',
        data: {
          patches: patches,
          onclick: context.update,
          ondblclick: context.updateExec
        }
      };
    }
  },
  {
    // 'hg qseries' command
    name: 'hg qseries',
    description: 'Print the entire series file',
    params: [ ],
    returnType: 'patches',
    exec: function(args, context) {
      var spawnSpec = {
        cmd: '/usr/local/bin/hg',
        args: [ 'qseries' ],
        cwd: context.shell.cwd,
        env: context.shell.env
      };

      return host.spawn(context, spawnSpec).then(function(output) {
        return output.split('\n').map(function(line) {
          return {
            name: line.split(':', 1)[0],
            comment: line.substring(name.length + 2)
          };
        });
      });
    }
  }
];
