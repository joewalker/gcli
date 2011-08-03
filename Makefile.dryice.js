/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var copy = require('dryice').copy;
var fs = require('fs');

// SETUP
var gcliHome = __dirname;

if (!fs.statSync(gcliHome + '/built').isDirectory()) {
  fs.mkdirSync(gcliHome + '/built', 0755);
}

buildStandard();
buildFirefox();

/**
 * There are 2 important ways to build GCLI with 2 outputs each.
 * - One build is for use within a normal web page. It has compressed and
 *   uncompressed versions of the output script file.
 */
function buildStandard() {
  console.log('Building build/gcli.js and build/gcli-uncompressed.js:');

  // Build the standard compressed and uncompressed javascript files
  var project = copy.createCommonJsProject({
    roots: [ gcliHome + '/lib' ]
  });

  // Grab and process all the Javascript
  var sources = copy.createDataObject();
  copy({
    source: copy.source.commonjs({
      project: project,
      // This list of dependencies should be the same as in build/*.html
      require: [ 'gcli/index', 'gcli/ui/start/browser', 'demo/index' ]
    }),
    filter: copy.filter.moduleDefines,
    dest: sources
  });

  console.log(project.report());

  // Process the CSS/HTML/PNG/GIF
  copy({
    source: { root: project, include: /.*\.css$|.*\.html$/ },
    filter: copy.filter.addDefines,
    dest: sources
  });
  copy({
    source: { root: project, include: /.*\.png$|.*\.gif$/ },
    filter: copy.filter.base64,
    dest: sources
  });

  // Create the output scripts, compressed and uncompressed
  copy({
    source: [ 'build/mini_require.js', sources ],
    filter: copy.filter.uglifyjs,
    dest: 'built/gcli.js'
  });
  copy({
    source: [ 'build/mini_require.js', sources ],
    dest: 'built/gcli-uncompressed.js'
  });
  copy({ source: 'build/index.html', dest: 'built/index.html' });
  copy({ source: 'build/nohelp.html', dest: 'built/nohelp.html' });
  copy({ source: 'scripts/es5-shim.js', dest: 'built/es5-shim.js' });
}


/**
 * Build the Javascript JSM files for Firefox
 * It consists of 1 output file: gcli.jsm
 */
function buildFirefox() {
  console.log('Building built/ff/gcli.jsm:');

  if (!fs.statSync(gcliHome + '/built/ff').isDirectory()) {
    fs.mkdirSync(gcliHome + '/built/ff', 0755);
  }

  var project = copy.createCommonJsProject({
    roots: [ gcliHome + '/lib' ],
    ignores: [ 'text!gcli/ui/inputter.css' ]
  });

  copy({
    source: [
      'build/prefix-gcli.jsm',
      copy.source.commonjs({
        project: project,
        // This list of dependencies should be the same as in suffix-gcli.jsm
        require: [ 'gcli/index', 'gcli/ui/start/firefox' ]
      }),
      'build/suffix-gcli.jsm'
    ],
    filter: copy.filter.moduleDefines,
    dest: 'built/ff/gcli.jsm'
  });

  console.log(project.report());
}
