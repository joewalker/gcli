/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var copy = require('dryice').copy;

/**
 * There are 2 important ways to build GCLI.
 * The first is for use within a normal web page.
 * It has compressed and uncompressed versions of the output script file.
 */
exports.unamdize = function(srcDir, destDir) {
  count = 0;

  copy.mkdirSync(destDir, 0755);
  copy({
    source: srcDir,
    filter: unamdModule,
    dest: destDir
  });

  return 'Converted ' + count + ' modules.';
};

var count;

function unamdModule(input) {
  if (typeof input !== 'string') {
    input = input.toString();
  }
  count++;
  return input
          .replace(/define\(function\(require, exports, module\) \{/, '')
          .replace(/}\);\s*$/, '')
          .replace(/require\('text!([^']*)'\)/g, 'require(\'fs\').readFileSync(\'node_modules/$1\')');
}
