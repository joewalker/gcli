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
    item: 'command',
    name: 'edit',
    description: 'Edit a file',
    params: [
      {
        name: 'resource',
        type: { name: 'resource', include: 'text/css' },
        description: 'The resource to edit'
      }
    ],
    returnType: 'html',
    exec: function(args, context) {
      var deferred = context.defer();
      args.resource.loadContents(function(data) {
        deferred.resolve('<p>This is just a demo</p>' +
                        '<textarea rows=5 cols=80>' + data + '</textarea>');
      });
      return deferred.promise;
    }
  }
];
