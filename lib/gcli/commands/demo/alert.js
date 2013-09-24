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
    // Arm window.alert with metadata
    item: 'command',
    name: 'alert',
    description: 'Show an alert dialog',
    params: [
      {
        name: 'message',
        type: 'string',
        description: 'Message to display'
      }
    ],
    exec: function(args, context) {
      window.alert(args.message);
    }
  }
];
