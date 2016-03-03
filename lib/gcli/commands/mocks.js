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

const cli = require('../cli');
const mockCommands = require('../test/mockCommands');
const mockFileCommands = require('../test/mockFileCommands');
const mockSettings = require('../test/mockSettings');

const isNode = (typeof process !== 'undefined' &&
               process.title.indexOf('node') !== -1);

exports.items = [
  {
    item: 'command',
    name: 'mocks',
    description: 'Add/remove mock commands',
    params: [
      {
        name: 'included',
        type: {
          name: 'selection',
          data: [ 'on', 'off' ]
        },
        description: 'Turn mock commands on or off',
      }
    ],
    returnType: 'string',

    exec: function(args, context) {
      const requisition = cli.getMapping(context).requisition;
      this[args.included](requisition);
      return 'Mock commands are now ' + args.included;
    },

    on: function(requisition) {
      mockCommands.setup(requisition);
      mockSettings.setup(requisition.system);

      if (isNode) {
        mockFileCommands.setup(requisition);
      }
    },

    off: function(requisition) {
      mockCommands.shutdown(requisition);
      mockSettings.shutdown(requisition.system);

      if (isNode) {
        mockFileCommands.shutdown(requisition);
      }
    }
  }
];
