/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var copy = require('dryice').copy;
var path = require('path');
var fs = require('fs');

// SETUP
var gcliHome = __dirname;

if (!path.existsSync(gcliHome + '/built')) {
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

  var project = copy.createCommonJsProject({
    roots: [ gcliHome + '/lib' ]
  });
  var sources = copy.createDataObject();

  copy({
    source: copy.source.commonjs({
      project: project,
      // This list of dependencies should be the same as in build/index.html
      require: [ 'gcli/index', 'demo/index', 'gclitest/index' ]
    }),
    filter: copy.filter.moduleDefines,
    dest: sources
  });
  copy({
    source: { root: project, include: /.*\.png$|.*\.gif$/ },
    filter: copy.filter.base64,
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

  // Create the output scripts, compressed and uncompressed
  copy({ source: 'build/index.html', dest: 'built/index.html' });
  copy({ source: 'scripts/es5-shim.js', dest: 'built/es5-shim.js' });
  copy({
    source: [ copy.getMiniRequire(), sources ],
    dest: 'built/gcli-uncompressed.js'
  });
  try {
    copy({
      source: [ copy.getMiniRequire(), sources ],
      filter: copy.filter.uglifyjs,
      dest: 'built/gcli.js'
    });
  }
  catch (ex) {
    console.log('ERROR: Uglify compression fails on windows. ' +
        'Skipping creation of built/gcli.js\n');
  }
}


/**
 * Build the Javascript JSM files for Firefox
 * It consists of 1 output file: gcli.jsm
 */
function buildFirefox() {
  console.log('Building built/ff/gcli.jsm:');

  if (!path.existsSync(gcliHome + '/built/ff')) {
    fs.mkdirSync(gcliHome + '/built/ff', 0755);
  }

  var project = copy.createCommonJsProject({
    roots: [ gcliHome + '/mozilla', gcliHome + '/lib' ],
    ignores: [ 'text!gcli/ui/inputter.css' ]
  });

  copy({
    source: [
      'mozilla/build/prefix-gcli.jsm',
      'mozilla/build/console.js',
      copy.getMiniRequire(),
      copy.source.commonjs({
        project: project,
        // This list of dependencies should be the same as in suffix-gcli.jsm
        require: [ 'gcli/index' ]
      }),
      'mozilla/build/suffix-gcli.jsm'
    ],
    filter: copy.filter.moduleDefines,
    dest: 'built/ff/gcli.jsm'
  });

  console.log(project.report());
}
