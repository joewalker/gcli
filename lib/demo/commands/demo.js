/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var gcli = require('gcli/index');


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
  exec: function(text) {
    return motivate() + 'text=' + text;
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
      type: { name: 'number', min: -20, max: 42, step: 5 },
      description: 'Second param'
    }
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
      name: 'p1',
      type: {
        name: 'selection',
        lookup: {
          'firefox': 4,
          'chrome': 12,
          'ie': 9,
          'opera': 10,
          'safari': 5
        }
      },
      description: 'First param'
    },
    {
      name: 'p2',
      type: { name: 'number', min: -4, max: 42, step: 5 },
      description: 'Third param'
    },
    {
      name: 'p3',
      type: 'boolean',
      description: 'Second param'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return motivate() +
      'p1=' + args.p1 + ', p2=' + args.p2 + ', p3=' + args.p3;
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


exports.startup = function() {
  gcli.addCommand(gcliTop);
  gcli.addCommand(gcliOnestring);
  gcli.addCommand(gcliTwostrings);
  gcli.addCommand(gcliTwonums);
  gcli.addCommand(gcliSelboolnum);
};

exports.shutdown = function() {
  gcli.removeCommand(gcliTop);
  gcli.removeCommand(gcliOnestring);
  gcli.removeCommand(gcliTwostrings);
  gcli.removeCommand(gcliTwonums);
  gcli.removeCommand(gcliSelboolnum);
};


});
