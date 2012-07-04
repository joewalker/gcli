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


var gcli = require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(gcliTop);
  gcli.addCommand(gcliOnestring);
  gcli.addCommand(gcliTwostrings);
  gcli.addCommand(gcliTwonums);
  gcli.addCommand(gcliSelboolnum);
  gcli.addCommand(gcliNode);
};

exports.shutdown = function() {
  gcli.removeCommand(gcliTop);
  gcli.removeCommand(gcliOnestring);
  gcli.removeCommand(gcliTwostrings);
  gcli.removeCommand(gcliTwonums);
  gcli.removeCommand(gcliSelboolnum);
  gcli.removeCommand(gcliNode);
};


/**
 * Parent Command
 */
var gcliTop = {
  name: 'gcli',
  description: 'Commands for playing with the UI'
};


/**
 * 'gcli onestring' command
 */
var gcliOnestring = {
  name: 'gcli onestring',
  description: 'Single string parameter',
  params: [
    { name: 'text', type: 'string', description: 'Demo param' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() + 'text=' + args.text;
  }
};

/**
 * 'gcli twostrings' command
 */
var gcliTwostrings = {
  name: 'gcli twostrings',
  description: '2 string parameters',
  params: [
    { name: 'p1', type: 'string', description: 'First param' },
    { name: 'p2', type: 'string', description: 'Second param' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=\'' + args.p1 + '\', p2=\'' + args.p2 + '\'';
  }
};

/**
 * 'gcli twonums' command
 */
var gcliTwonums = {
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
      type: { name: 'number', min: -20, max: 42, step: 5 },
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
    },
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=' + args.p1 + ', p2=' + args.p2;
  }
};

/**
 * 'gcli selboolnum' command
 */
var gcliSelboolnum = {
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
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=' + args.p1 + ', p2=' + args.p2 + ', p3=' + args.p3;
  }
};

/**
 * 'gcli node' command
 */
var gcliNode = {
  name: 'gcli node',
  description: 'Single node parameter',
  params: [
    { name: 'node', type: 'node', description: 'CSS selector pointing at a single node' }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() + 'node=' + args.node;
  }
};


var messages = [
  'GCLI wants you to trick it out in some way.</br>',
  'GCLI is your web command line.</br>',
  'GCLI would love to be like Zsh on the Web.</br>',
  'GCLI is written on the Web platform, so you can tweak it.</br>'
];
function motivate() {
  var index = Math.floor(Math.random() * messages.length);
  return messages[index];
}


});
