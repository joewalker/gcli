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
 * There are 2 important ways to build GCLI.
 * The first is for use within a normal web page.
 * It has compressed and uncompressed versions of the output script file.
 */
function buildStandard() {
  console.log('Building built/gcli[-uncompressed].js:');

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
      require: [ 'gcli/index', 'demo/index' ]
    }),
    filter: copy.filter.moduleDefines,
    dest: sources
  });

  console.log(project.report());

  // Create a GraphML dependency report. Directions:
  // - Install yEd (http://www.yworks.com/en/products_yed_about.htm)
  // - Load gcli/built/gcli.graphml
  // - Resize the nodes (Tools->Fit Node to Label)
  // - Apply a layout (Layout->Hierarchical)
  console.log('Outputting dependency graph to built/gcli.graphml\n');
  if (project.getDependencyGraphML) {
    copy({
      source: { value:project.getDependencyGraphML() },
      dest: 'built/gcli.graphml',
    });
  }

  // Process the PNG/GIF
  copy({
    source: { root: project, include: /.*\.png$|.*\.gif$/ },
    filter: copy.filter.base64,
    dest: sources
  });

  // Create the output scripts, compressed and uncompressed
  copy({ source: 'build/index.html', dest: 'built/index.html' });
  copy({ source: 'scripts/es5-shim.js', dest: 'built/es5-shim.js' });
  copy({
    source: [ 'build/mini_require.js', sources ],
    dest: 'built/gcli-uncompressed.js'
  });
  try {
    copy({
      source: [ 'build/mini_require.js', sources ],
      filter: copy.filter.uglifyjs,
      dest: 'built/gcli.js'
    });
  }
  catch (ex) {
    console.log('ERROR: Uglify compression fails on windows. Skipping creation of built/gcli.js\n');
  }
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
      'build/console.js',
      'build/mini_require.js',
      copy.source.commonjs({
        project: project,
        // This list of dependencies should be the same as in suffix-gcli.jsm
        require: [ 'gcli/firefox/index' ]
      }),
      'build/suffix-gcli.jsm'
    ],
    filter: copy.filter.moduleDefines,
    dest: 'built/ff/gcli.jsm'
  });

  console.log(project.report());
}
