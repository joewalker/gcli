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

var count;

/**
 * There are 2 important ways to build GCLI.
 * The first is for use within a normal web page.
 * It has compressed and uncompressed versions of the output script file.
 */
exports.unamdize = function(srcDir, destDir) {
  count = 0;

  copy.mkdirSync(destDir, 493 /*0755*/);
  copy({
    source: srcDir,
    filter: function(input) {
      if (typeof input !== 'string') {
        input = input.toString();
      }
      count++;
      return input
              .replace(/define\(function\(require, exports, module\) \{/, '')
              .replace(/}\);\s*$/, '')
              .replace(/require\('text!([^']*)'\)/g, 'require(\'fs\').readFileSync(\'node_modules/$1\')');
    },
    dest: destDir
  });

  return 'Converted ' + count + ' modules.';
};

