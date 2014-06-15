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

var Promise = require('../util/promise').Promise;
var Status = require('./types').Status;
var Conversion = require('./types').Conversion;

exports.items = [
  {
    item: 'type',
    name: 'url',

    getSpec: function() {
      return 'url';
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return value.href;
    },

    parse: function(arg, context) {
      var conversion;

      if (typeof URL === 'undefined') {
        return Promise.resolve(new Conversion(undefined, arg, Status.ERROR,
                                              'URL is not supported'));
      }

      try {
        var url = new URL(arg.text);
        conversion = new Conversion(url, arg);
      }
      catch (ex) {
        // Try to guess what the user is getting at. If there is a '.' before
        // the first '/' then assume it's a domain name, and prepend 'http://'
        // otherwise assume it's relative to the current URL (if that exists)
        var test;
        var firstDot = arg.text.indexOf('.');
        var firstSlash = arg.text.indexOf('/');
        if (firstDot !== -1) {
          if (firstSlash === -1 || (firstDot < firstSlash)) {
            test = new URL('http://' + arg.text);
          }
        }

        if (test == null && context.environment.window != null) {
          test = new URL(arg.text, context.environment.window.location.href);
        }

        var pred = (test == null) ? [] : [ { name: test.href, value: test } ];
        var status = (test == null) ? Status.ERROR : Status.INCOMPLETE;
        conversion = new Conversion(undefined, arg, status, ex.message, pred);
      }

      return Promise.resolve(conversion);
    }
  }
];
