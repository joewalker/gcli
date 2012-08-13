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

var copy = require('dryice').copy;
var main = require('../../../gcli');
var gcli = main.require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(standardCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(standardCmdSpec);
};

/**
 * 'standard' build command
 */
var standardCmdSpec = {
  name: 'standard',
  description: 'Build the basic GCLI web target',
  returnType: 'terminal',
  exec: function(args, context) {
    return exports.buildStandard();
  }
};

/**
 * There are 2 important ways to build GCLI.
 * The first is for use within a normal web page.
 * It has compressed and uncompressed versions of the output script file.
 */
exports.buildStandard = function() {
  var log = 'Building standard outputs to built/gcli[-uncompressed].js\n';

  copy.mkdirSync(main.gcliHome + '/built', 0755);
  var project = copy.createCommonJsProject({
    roots: [ main.gcliHome + '/lib' ]
  });
  var sources = copy.createDataObject();

  copy({
    source: {
      project: project,
      // This list of dependencies should reflect index.html
      require: [ 'gcli/index', 'demo/index', 'gclitest/index' ]
    },
    filter: copy.filter.moduleDefines,
    dest: sources
  });
  copy({
    source: { root: project, include: /.*\.png$|.*\.gif$/ },
    filter: copy.filter.base64,
    dest: sources
  });
  log += project.report() + '\n';

  // Create a GraphML dependency report. Directions:
  // - Install yEd (http://www.yworks.com/en/products_yed_about.htm)
  // - Load gcli/built/gcli.graphml
  // - Resize the nodes (Tools->Fit Node to Label)
  // - Apply a layout (Layout->Hierarchical)
  log += 'Outputting dependency graph to built/gcli.graphml\n';
  if (project.getDependencyGraphML) {
    copy({
      source: { value:project.getDependencyGraphML() },
      dest: 'built/gcli.graphml'
    });
  }

  // Create the output scripts, compressed and uncompressed
  copy({ source: 'index.html', filter: tweakIndex, dest: 'built/index.html' });
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
    log += 'ERROR: Uglify compression fails on windows/linux. ' +
        'Skipping creation of built/gcli.js\n';
  }
  return log;
};

/**
 * Filter index.html to:
 * - Make links relative, we flatten out the scripts directory
 * - Replace require.js with the built GCLI script file
 * - Remove the RequireJS configuration
 */
function tweakIndex(data) {
  return data
      .replace(/scripts\/require.js/, 'gcli-uncompressed.js')
      .replace(/\s*require\([^;]*;\n/, '');
}
