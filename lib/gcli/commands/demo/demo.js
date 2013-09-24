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

exports.items = [
  {
    // Parent Command
    item: 'command',
    name: 'gcli',
    description: 'Commands for playing with the UI'
  },
  {
    // 'gcli onestring' command
    item: 'command',
    name: 'gcli onestring',
    description: 'Single string parameter',
    params: [
      { name: 'text', type: 'string', description: 'Demo param' }
    ],
    exec: function(args, context) {
      return 'text=' + args.text;
    }
  },
  {
    // 'gcli twostrings' command
    item: 'command',
    name: 'gcli twostrings',
    description: '2 string parameters',
    params: [
      { name: 'p1', type: 'string', description: 'First param' },
      { name: 'p2', type: 'string', description: 'Second param' }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\', p2=\'' + args.p2 + '\'';
    }
  },
  {
    // 'gcli twonums' command
    item: 'command',
    name: 'gcli twonums',
    description: '2 numeric parameters',
    params: [
      {
        name: 'p1',
        type: 'number',
        description: 'First param'
      },
      {
        name: 'p2',
        defaultValue: 8,
        type: { name: 'number', allowFloat: true, min: -20, max: 42, step: 5 },
        description: 'Second param'
      },
      {
        group: 'Options',
        params: [
          {
            name: 'all',
            description: 'All your base',
            type: 'boolean'
          },
          {
            name: 'verbose',
            description: 'Be verbose',
            type: 'boolean'
          },
          {
            name: 'message',
            description: 'A message',
            type: 'string',
            defaultValue: 'nothing'
          },
          {
            name: 'browser',
            description: 'Pick a browser',
            type: {
              name: 'selection',
              lookup: [
                { name: 'chrome', value: 1 },
                { name: 'firefox', value: 2 },
                { name: 'ie', value: 3 },
                { name: 'opera', value: 4 },
                { name: 'safari', value: 5 }
              ]
            },
            defaultValue: 3
          }
        ]
      }
    ],
    exec: function(args, context) {
      return 'p1=' + args.p1 + ', p2=' + args.p2;
    }
  },
  {
    // 'gcli selboolnum' command
    item: 'command',
    name: 'gcli selboolnum',
    description: 'A selection, a boolean and a number',
    params: [
      {
        name: 'sel',
        type: {
          name: 'selection',
          lookup: [
            { name: 'firefox', value: 4 },
            { name: 'chrome', value: 12 },
            { name: 'ie', value: 9 },
            { name: 'opera', value: 10 },
            { name: 'safari', value: 5 }
          ]
        },
        description: 'First param'
      },
      {
        name: 'bool',
        type: 'boolean',
        description: 'A boolean param'
      },
      {
        name: 'num',
        type: { name: 'number', min: -4, max: 42, step: 5 },
        description: 'A number param'
      }
    ],
    exec: function(args, context) {
      return 'p1=' + args.p1 + ', p2=' + args.p2 + ', p3=' + args.p3;
    }
  },
  {
    // 'gcli node' command
    item: 'command',
    name: 'gcli node',
    description: 'Single node parameter',
    params: [
      { name: 'node', type: 'node', description: 'CSS selector pointing at a single node' }
    ],
    exec: function(args, context) {
      return 'node=' + args.node;
    }
  },
  {
    // 'gcli onedate' command
    item: 'command',
    name: 'gcli onedate',
    description: 'One date parameter',
    params: [
      {
        name: 'date',
        type: { name: 'date', step: 5 },
        description: 'Demo param'
      }
    ],
    exec: function(args, context) {
      return 'date=' + args.date;
    }
  },
  {
    // 'gcli twodates' commands
    item: 'command',
    name: 'gcli twodates',
    description: 'Two date parameters',
    params: [
      {
        name: 'date1',
        type: { name: 'date', step: 5 },
        description: 'Demo param 1'
      },
      {
        name: 'date2',
        type: { name: 'date', step: 2 },
        description: 'Demo param 2'
      }
    ],
    exec: function(args, context) {
      return 'date1=' + args.date1 + ' date2=' + args.date2;
    }
  },
  {
    // 'gcli file' command
    item: 'command',
    name: 'gcli open',
    description: 'a file param in open mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'yes'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli saveas' command
    item: 'command',
    name: 'gcli saveas',
    description: 'a file param in saveas mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'no'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli save' command
    item: 'command',
    name: 'gcli save',
    description: 'a file param in save mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'file',
          existing: 'maybe'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli cd' command
    item: 'command',
    name: 'gcli cd',
    description: 'a file param in cd mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'directory',
          existing: 'yes'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli mkdir' command
    item: 'command',
    name: 'gcli mkdir',
    description: 'a file param in mkdir mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'directory',
          existing: 'no'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  },
  {
    // 'gcli rm' command
    item: 'command',
    name: 'gcli rm',
    description: 'a file param in rm mode',
    params: [
      {
        name: 'p1',
        type: {
          name: 'file',
          filetype: 'any',
          existing: 'yes'
        },
        description: 'open param'
      }
    ],
    exec: function(args, context) {
      return 'p1=\'' + args.p1 + '\'';
    }
  }
];
