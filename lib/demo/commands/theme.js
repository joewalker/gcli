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

exports.items = [
  {
    item: 'type',
    name: 'theme',
    parent: 'selection',
    data: [ 'dark', 'light' ]
  },
  {
    item: 'command',
    name: 'theme',
    description: 'Change themes',
    params: [
      {
        name: 'theme',
        type: 'theme',
        description: 'The theme to use'
      },
      {
        name: 'show',
        type: 'boolean',
        description: 'Display a preview of the current theme',
        hidden: true,
        option: true
      }
    ],
    exec: function(args, context) {
      if (args.show) {
        return context.typedData('theme-preview', args);
      }
      else {
        return context.typedData('theme-change', args);
      }
    }
  },
  {
    item: 'converter',
    from: 'theme-change',
    to: 'view',
    exec: function(args, context) {
      var body = context.document.body;

      // Remove existing themes. This is very dependent on how themes are
      // setup. This code will probably require local customization
      exports.items[0].data.forEach(function(theme) {
        body.classList.remove(theme);
      });
      body.classList.add(args.theme);

      return {
        html: '<div>Set theme to ${theme}</div>',
        data: args,
        options: { allowEval: true, stack: 'theme.html#change' }
      };
    }
  },
  {
    item: 'converter',
    from: 'theme-preview',
    to: 'view',
    exec: function(args, context) {
      return {
        html: require('text!demo/commands/theme.html'),
        data: args,
        options: { allowEval: true, stack: 'theme.html#preview' }
      };
    }
  }
];


});
