/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ajax.org Code Editor (ACE).
 *
 * The Initial Developer of the Original Code is
 * Ajax.org B.V.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Fabian Jakobs <fabian AT ajax DOT org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

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
  var project = copy.createCommonJsProject([ gcliHome + '/lib' ]);

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
  console.log('Building build/gcli.jsm:');

  if (!fs.statSync(gcliHome + '/built/ff').isDirectory()) {
    fs.mkdirSync(gcliHome + '/built/ff', 0755);
  }

  var project = copy.createCommonJsProject([ gcliHome + '/lib' ]);

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
