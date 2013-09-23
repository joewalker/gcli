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
    item: 'command',
    name: 'sleep',
    description: 'Wait for a while',
    params: [
      {
        name: 'length',
        type: { name: 'number', min: 1 },
        description: 'How long to wait (s)'
      }
    ],
    returnType: 'string',
    exec: function(args, context) {
      var deferred = context.defer();
      window.setTimeout(function() {
        deferred.resolve('Done');
      }, args.length * 1000);
      return deferred.promise;
    }
  }
];


});
