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
    name: 'mdn',
    description: 'Documentation for CSS properties',
    returnType: 'mdn',
    params: [
      {
        name: 'property',
        type: 'string',
        description: 'CSS Property'
      },
      {
        name: 'type',
        type: 'selection',
        data: [ 'css' ],
        defaultValue: 'css'
      },
      {
        name: 'url',
        type: 'string',
        hidden: true,
        defaultValue: 'https://developer.mozilla.org/en-US/search.json?q=${property}&topic=${type}'
      }
    ],

    exec: function(args, context) {
      var deferred = context.defer();

      var url = args.url
                    .replace('${property}', args.property)
                    .replace('${type}', args.type);

      var xhr = new XMLHttpRequest();
      xhr.onload = function() {
        if (xhr.readyState == 4) {
          if (xhr.status >= 300 || xhr.status < 200) {
            console.error('xhr status = ', xhr.status);
            console.error('responseText = ', xhr.responseText);
            deferred.reject('Error reading from MDN');
            return;
          }

          try {
            var response = JSON.parse(xhr.responseText);
            deferred.resolve({ property: args.property, response: response });
          }
          catch (ex) {
            console.error(ex);
            deferred.reject('Error reading from MDN');
          }
        }
      }.bind(this);

      xhr.onabort = xhr.onerror = xhr.ontimeout = function(err) {
        console.error(err);
        deferred.reject('Error reading from MDN');
      }.bind(this);

      try {
        xhr.open('GET', url);
        xhr.send();
      }
      catch (ex) {
        console.error(ex);
        deferred.reject('Error reading from MDN');
      }

      return deferred.promise;
    }
  },
  {
    item: 'converter',
    from: 'mdn',
    to: 'view',
    exec: function(mdn, context) {
      mdn.excerpt = function(parent) {
        parent.innerHTML = mdn.response.documents[0].excerpt;
        return '';
      };

      console.log(mdn);

      return context.createView({
        html:
          '<div>' +
          '  <h2>CSS Properties: ${property}</h2>' +
          '  <p style="${excerpt(__element)}"></p>' +
          '  <div style="text-align:right">' +
          '    <a href="${response.documents[0].link}">Click for more</a>' +
          '  </div>' +
          '</div>',
        data: mdn,
        options: { allowEval: true }
      });
    }
  }
];
