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

var copy = require('dryice').copy;
var fs = require('fs');
var path = require('path');
var main = require('../../../../gcli');

/**
 * 'orion' build command
 */
exports.items = [
  {
    item: 'command',
    name: 'orion',
    description: 'Build the Orion-GCLI target',
    params: [
      {
        name: 'location',
        type: {
          name: 'file',
          filetype: 'directory',
          existing: 'yes'
        },
        defaultValue: process.env.ORION_HOME || undefined,
        description: 'The location of the org.eclipse.orion.client checkout'
      }
    ],
    returnType: 'string',
    exec: function(args, context) {
      var root = path.normalize(args.location);
      var dest = path.join(root, 'bundles/org.eclipse.orion.client.ui/web/gcli');
      var count = 0;

      if (!fs.existsSync(dest)) {
        throw new Error('\'' + dest + '\' does not exist.');
      }

      var stats = fs.statSync(dest);
      if (!stats.isDirectory()) {
        throw new Error('\'' + dest + '\' is not a directory.');
      }

      var output = 'Building GCLI files for Orion';
      output += '\n  Source = ' + main.gcliHome;
      output += '\n  Dest = ' + dest;

      var logCopy = function(filename) {
        output += '\n  ' + filename.substr(dest.length + 1);
        count++;
        return filename;
      };

      output += '\nCopying:';
      copy({
        source: main.gcliHome + '/LICENSE',
        dest: dest + '/LICENSE'
      });
      logCopy(dest + '/LICENSE');

      output += '\nCopying (and adding AMD headers):';
      copy({
        source: { root: main.gcliHome + '/lib/gcli' },
        filenameFilter: logCopy,
        filter: defineFilter,
        dest: dest + '/gcli'
      });

      output += '\nCopying (and adding AMD headers):';
      copy({
        source: { root: main.gcliHome + '/web/gcli' },
        filenameFilter: logCopy,
        filter: defineFilter,
        dest: dest + '/gcli'
      });

      output += '\nCopied ' + count + ' files';

      return output;
    }
  }
];

/**
 * A filter to munge CommonJS headers
 */
var defineFilter = function(input, source) {
  var output = input.toString();

  if (source.path.match(/\.js$/)) {
    output = output.replace(/(["'](do not )?use strict[\"\'];)/,
        'define(function(require, exports, module) {\n\n$1');
    output += '\n\n});\n';
  }

  return output;
};
defineFilter.onRead = true;
