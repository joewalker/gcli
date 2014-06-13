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

var assert = require('../testharness/assert');
var helpers = require('./helpers');
var converters = require('../converters/converters');

var unionCommand = {
  name: 'unioncommand',
  params: [
    {
      name: 'first',
      type: {
        name: 'union',
        alternatives: [
          {
            name: 'selection',
            lookup: [
              { name: 'one', value: 1 },
              { name: 'two', value: 2 },
            ]
          },
          'number',
          { name: 'string' }
        ]
      }
    }
  ],
  returnType: 'json',
  exec: function(args, context) {
    return args;
  }
};

var jsonStringConverter = {
  item: 'converter',
  from: 'json',
  to: 'string',
  exec: function(json, context) {
    return JSON.stringify(json, null, '  ');
  }
};

var jsonViewConverter = {
  item: 'converter',
  from: 'json',
  to: 'view',
  exec: function(json, context) {
    var html = JSON.stringify(json, null, '&nbsp;').replace('\n', '</br>');
    return {
      html: '<div>' + html + '</div>'
    };
  }
};

exports.setup = function(options) {
  converters.addConverter(jsonStringConverter);
  converters.addConverter(jsonViewConverter);
  options.requisition.canon.addCommand(unionCommand);
};

exports.shutdown = function(options) {
  options.requisition.canon.removeCommand(unionCommand);
  converters.removeConverter(jsonStringConverter);
  converters.removeConverter(jsonViewConverter);
};

exports.testDefault = function(options) {
  return helpers.audit(options, [
    {
      setup:    'unioncommand',
      check: {
        input:  'unioncommand',
        markup: 'VVVVVVVVVVVV',
        hints:              ' <first>',
        status: 'ERROR',
        args: {
          first: {
            value: undefined,
            arg: '',
            status: 'INCOMPLETE'
          }
        }
      }
    },
    {
      setup:    'unioncommand three',
      check: {
        input:  'unioncommand three',
        markup: 'VVVVVVVVVVVVVVVVVV',
        hints:                    '',
        status: 'VALID',
        args: {
          first: {
            value: function(data) {
              assert.is(Object.keys(data).length, 2, 'union3 Object.keys');
              assert.is(data.type, 'string', 'union3 val type');
              assert.is(data.string, 'three', 'union3 val string');
            },
            arg: ' three',
            status: 'VALID'
          }
        }
      },
      exec: {
        output: [
          /"type": ?"string"/,
          /"string": ?"three"/
        ]
      },
      post: function(output, text) {
        var data = output.data.first;
        assert.is(Object.keys(data).length, 2, 'union3 Object.keys');
        assert.is(data.type, 'string', 'union3 val type');
        assert.is(data.string, 'three', 'union3 val string');
      }
    },
    {
      setup:    'unioncommand one',
      check: {
        input:  'unioncommand one',
        markup: 'VVVVVVVVVVVVVVVV',
        hints:                  '',
        status: 'VALID',
        args: {
          first: {
            value: function(data) {
              assert.is(Object.keys(data).length, 2, 'union1 Object.keys');
              assert.is(data.type, 'selection', 'union1 val type');
              assert.is(data.selection, 1, 'union1 val selection');
            },
            arg: ' one',
            status: 'VALID'
          }
        }
      },
      exec: {
        output: [
          /"type": ?"selection"/,
          /"selection": ?1/
        ]
      },
      post: function(output, text) {
        var data = output.data.first;
        assert.is(Object.keys(data).length, 2, 'union1 Object.keys');
        assert.is(data.type, 'selection', 'union1 val type');
        assert.is(data.selection, 1, 'union1 val selection');
      }
    },
    {
      setup:    'unioncommand 5',
      check: {
        input:  'unioncommand 5',
        markup: 'VVVVVVVVVVVVVV',
        hints:                '',
        status: 'VALID',
        args: {
          first: {
            value: function(data) {
              assert.is(Object.keys(data).length, 2, 'union5 Object.keys');
              assert.is(data.type, 'number', 'union5 val type');
              assert.is(data.number, 5, 'union5 val number');
            },
            arg: ' 5',
            status: 'VALID'
          }
        }
      },
      exec: {
        output: [
          /"type": ?"number"/,
          /"number": ?5/
        ]
      },
      post: function(output, text) {
        var data = output.data.first;
        assert.is(Object.keys(data).length, 2, 'union5 Object.keys');
        assert.is(data.type, 'number', 'union5 val type');
        assert.is(data.number, 5, 'union5 val number');
      }
    }
  ]);
};
