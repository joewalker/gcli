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

var mockCommands;
if (typeof exports !== 'undefined') {
  // If we're being loaded via require();
  mockCommands = exports;
}
else {
  // If we're being loaded via loadScript in mochitest
  mockCommands = {};
}

// We use an alias for exports here because this module is used in Firefox
// mochitests where we don't have define/require

/**
 * Registration and de-registration.
 */
mockCommands.setup = function(requisition) {
  requisition.system.addItems(mockCommands.items);
};

mockCommands.shutdown = function(requisition) {
  requisition.system.removeItems(mockCommands.items);
};

function createExec(name) {
  return function(args, context) {
    var promises = [];

    Object.keys(args).map(function(argName) {
      var value = args[argName];
      var type = this.getParameterByName(argName).type;
      var promise = Promise.resolve(type.stringify(value, context));
      promises.push(promise.then(function(str) {
        return { name: argName, value: str };
      }.bind(this)));
    }.bind(this));

    return Promise.all(promises).then(function(data) {
      var argValues = {};
      data.forEach(function(entry) { argValues[entry.name] = entry.value; });

      return context.typedData('testCommandOutput', {
        name: name,
        args: argValues
      });
    }.bind(this));
  };
}

mockCommands.items = [
  {
    item: 'command',
    name: 'tsfile',
    description: 'test file params',
  },
  {
    item: 'command',
    name: 'tsfile open',
    description: 'a file param in open mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'yes'
        }
      }
    ],
    exec: createExec('tsfile open')
  },
  {
    item: 'command',
    name: 'tsfile saveas',
    description: 'a file param in saveas mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'no'
        }
      }
    ],
    exec: createExec('tsfile saveas')
  },
  {
    item: 'command',
    name: 'tsfile save',
    description: 'a file param in save mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'maybe'
        }
      }
    ],
    exec: createExec('tsfile save')
  },
  {
    item: 'command',
    name: 'tsfile cd',
    description: 'a file param in cd mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'directory',
          existing: 'yes'
        }
      }
    ],
    exec: createExec('tsfile cd')
  },
  {
    item: 'command',
    name: 'tsfile mkdir',
    description: 'a file param in mkdir mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'directory',
          existing: 'no'
        }
      }
    ],
    exec: createExec('tsfile mkdir')
  },
  {
    item: 'command',
    name: 'tsfile rm',
    description: 'a file param in rm mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'any',
          existing: 'yes'
        }
      }
    ],
    exec: createExec('tsfile rm')
  },
];
