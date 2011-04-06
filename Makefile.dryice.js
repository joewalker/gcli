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

// SETUP
var gcliHome = __dirname;
var project = copy.createCommonJsProject([
  gcliHome + '/mini',
  gcliHome + '/lib'
]);

// Grab and process all the Javascript
var javascript = copy.createDataObject();
copy({
  source: [ copy.source.commonjs({ project: project, require: [ "cockpit/index" ] }) ],
  filter: [ copy.filter.moduleDefines ],
  dest: javascript
});

// Process the CSS/HTML/PNG/GIF
var resources = copy.createDataObject();
copy({
  source: { root: project, include: /.*\.css$|.*\.html$/, exclude: /tests?\// },
  filter: [ copy.filter.addDefines ],
  dest: resources
});
copy({
  source: { root: project, include: /.*\.png$|.*\.gif$/, exclude: /tests?\// },
  filter: [ copy.filter.base64 ],
  dest: resources
});

// Mini require as used in a web page
var require = copy.createDataObject();
copy({
  source: [ 'build/mini_require.js' ],
  dest: require
});

// Mini require as used in Firefox
var ffrequire = copy.createDataObject();
copy({
  source: [ 'build/ff_require.js' ],
  dest: ffrequire
});


// Create the compressed and uncompressed output files

copy({
  source: [ require, javascript, resources ],
  filter: [ copy.filter.uglifyjs, filterTextPlugin ],
  dest: 'build/gcli.js'
});
copy({
  source: [ require, javascript, resources ],
  filter: [ filterTextPlugin ],
  dest: 'build/gcli-uncompressed.js'
});
copy({
  source: [ ffrequire, javascript, resources ],
  filter: [ filterTextPlugin ],
  dest: 'build/gcli-ff.js'
});



function filterTextPlugin(text) {
  return text.replace(/(['"])text\!/g, "$1text/");
}
