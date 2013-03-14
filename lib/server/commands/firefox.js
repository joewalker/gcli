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
var fs = require('fs');
var main = require('../../../gcli');
var gcli = main.require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(firefoxCmdSpc);
};

exports.shutdown = function() {
  gcli.removeCommand(firefoxCmdSpc);
};

/**
 * 'firefox' build command
 */
var firefoxCmdSpc = {
  name: 'firefox',
  description: 'Build the firefox-GCLI target',
  params: [
    {
      name: 'location',
      type: 'string',
      defaultValue: '../devtools',
      description: 'The location of the mozilla-central checkout'
    }
  ],
  returnType: 'terminal',
  exec: function(args, context) {
    return exports.buildFirefox(args.location);
  }
};

/**
 * Build the Javascript JSM files for Firefox
 * Consists of: gcli.jsm, gclichrome.jsm, browser_gcli_web.js and gcli.properties
 */
exports.buildFirefox = function(destDir) {
  if (!destDir && process.env.FIREFOX_HOME) {
    destDir = process.env.FIREFOX_HOME;
  }
  var log = 'Building Firefox outputs to ' + (destDir || 'built/ff') + '.\n\n';

  if (!destDir) {
    copy.mkdirSync(main.gcliHome + '/built/ff', 0755);
  }

  var jsmDir = '/browser/devtools/commandline';
  var testDir = '/browser/devtools/commandline/test';
  var propsDir = '/browser/locales/en-US/chrome/browser/devtools';

  if (destDir) {
    if (!fs.existsSync(destDir + jsmDir)) {
      throw new Error('Missing path for JSM: ' + destDir + jsmDir);
    }
    if (!fs.existsSync(destDir + testDir)) {
      throw new Error('Missing path for tests: ' + destDir + testDir);
    }
    if (!fs.existsSync(destDir + propsDir)) {
      throw new Error('Missing path for l10n string: ' + destDir + propsDir);
    }
  }

  var project = copy.createCommonJsProject({
    roots: [ main.gcliHome + '/mozilla', main.gcliHome + '/lib' ]
  });

  // Package Gcli.jsm
  copy({
    source: [
      createJsmPrefix('gcli'),
      { project: project, require: [ 'gcli/index' ] },
      createRequire('gcli', 'gcli/index')
    ],
    filter: [ createCssIgnoreFilter(), copy.filter.moduleDefines ],
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gcli.jsm'
  });

  // Package GcliChromeModules.jsm
  /*
  project.assumeAllFilesLoaded();
  copy({
    source: [
      createJsmPrefix('gclichrome'),
      { project: project, require: [ 'gcli/gclichrome' ] }
      createRequire('gclichrome', 'gcli/gclichrome')
    ],
    filter: [ createCssIgnoreFilter(), copy.filter.moduleDefines ],
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gclichrome.jsm'
  });
  */

  // Package the test files
  project.assumeAllFilesLoaded();

  // Convert GCLI test files to Mochitest files. The excluded tests are those
  // that rely on commands that ship with GCLI-web but are not implemented in
  // the same way in Firefox, and require which has been manually translated
  copy({
    source: {
      root: 'lib/gclitest/',
      include: /test.*\.js$/,
      exclude: [
        /testHelp\.js$/,
        /testPref\.js$/,
        /testSettings\.js$/,
        /testRequire\.js$/
      ]
    },
    filter: createAmdToJsTestFilter(),
    filenameFilter: function(filename) {
      // the t prefix prevents 'test' from matching the directory name
      return filename.replace(/t\/test/, 't\/browser_gcli_').toLowerCase();
    },
    dest: (destDir ? destDir + testDir : 'built/ff')
  });
  copy({
    source: 'lib/gclitest/mockCommands.js',
    filter: amdToJsMockFilter,
    dest: (destDir ? destDir + testDir : 'built/ff') + '/mockCommands.js'
  });

  // Package the i18n strings
  copy({
    source: [ 'lib/gcli/nls/strings.js', 'mozilla/gcli/commands/strings.js' ],
    filter: tweakI18nStrings,
    dest: (destDir ? destDir + propsDir : 'built/ff') + '/gcli.properties'
  });

  return log;
};

/**
 * Create a JSM prefix.
 * The prefix is the contents of mozilla/build/module-prefix.jsm with the
 * '{EXPORTED_SYMBOLS}' string replaced by |exportName|.
 */
function createJsmPrefix(exportName) {
  return {
    value: '' +
      '/*\n' +
      ' * Copyright 2012, Mozilla Foundation and contributors\n' +
      ' *\n' +
      ' * Licensed under the Apache License, Version 2.0 (the "License");\n' +
      ' * you may not use this file except in compliance with the License.\n' +
      ' * You may obtain a copy of the License at\n' +
      ' *\n' +
      ' * http://www.apache.org/licenses/LICENSE-2.0\n' +
      ' *\n' +
      ' * Unless required by applicable law or agreed to in writing, software\n' +
      ' * distributed under the License is distributed on an "AS IS" BASIS,\n' +
      ' * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n' +
      ' * See the License for the specific language governing permissions and\n' +
      ' * limitations under the License.\n' +
      ' */\n' +
      '\n' +
      '"use strict";\n' +
      '\n' +
      '/**\n' +
      ' * DO NOT MODIFY THIS FILE DIRECTLY.\n' +
      ' * This file is generated from separate files stored in the GCLI project.\n' +
      ' * Please modify the files there and use the import script so the 2 projects\n' +
      ' * are kept in sync.\n' +
      ' * For more information, ask Joe Walker <jwalker@mozilla.com>\n' +
      ' */\n' +
      '\n' +
      'this.EXPORTED_SYMBOLS = [ "' + exportName + '" ];\n' +
      '\n' +
      'Components.utils.import("resource://gre/modules/devtools/Require.jsm");\n' +
      'Components.utils.import("resource://gre/modules/devtools/Console.jsm");\n' +
      'Components.utils.import("resource:///modules/devtools/Browser.jsm");\n' +
      '\n'
  };
}

/**
 * Create a JSM suffix.
 * Define a variable (|exportName|, see createJsmPrefix) from the module named
 * by |requirement|.
 */
function createRequire(exportName, requirement) {
  return {
    value: '\n' +
        '// Satisfy EXPORTED_SYMBOLS\n' +
        'this.' + exportName + ' = require(\'' + requirement + '\');\n'
  };
}

/**
 * Sometimes we want to exclude CSS modules from the output.
 * This replaces the contents of any file named '*.css' with an empty string.
 */
function createCssIgnoreFilter() {
  var filter = function(data, location) {
    return location != null && /\.css$/.test(location.path) ? '' : data;
  };
  filter.onRead = true;
  return filter;
}

/**
 * Convert the AMD module style that GCLI uses to the plain JS style used by
 * Firefox. Note that this is custom for our tests, but it could be a starting
 * point for other similar conversions.
 */
function createAmdToJsTestFilter() {
  var filter = function amdToJsTestFilter(data, location) {
    var name = location.path.substring(1);
    var testHeader = '// $1\n' +
        '\n' +
        '// <INJECTED SOURCE:START>\n' +
        '\n' +
        '// THIS FILE IS GENERATED FROM SOURCE IN THE GCLI PROJECT\n' +
        '// DO NOT EDIT IT DIRECTLY\n' +
        '\n' +
        'var exports = {};\n' +
        '\n' +
        'const TEST_URI = "data:text/html;charset=utf-8,<p id=\'gcli-input\'>gcli-' + name + '</p>";\n' +
        '\n' +
        'function test() {\n' +
        '  helpers.addTabWithToolbar(TEST_URI, function(options) {\n' +
        '    return helpers.runTests(options, exports);\n' +
        '  }).then(finish);\n' +
        '}\n' +
        '\n' +
        '// <INJECTED SOURCE:END>';
    return data.toString()
        .replace(/(define\(function\(require, exports, module\) {)/, testHeader)
        .replace(/(var [A-z]* = require\(['"]test\/assert['"]\);)/g, '// $1')
        .replace(/(var [A-z]* = require\(['"]gclitest\/helpers['"]\);)/g, '// $1')
        .replace(/(var [A-z]* = require\(['"]gclitest\/mockCommands['"]\);)/g, '// $1')
        .replace(/(}\);[\n\w]*)$/, '// $1');
  };
  filter.onRead = true;
  return filter;
}

var mockHeader = '// $1\n' +
    '\n' +
    '// <INJECTED SOURCE:START>\n' +
    '\n' +
    '// THIS FILE IS GENERATED FROM SOURCE IN THE GCLI PROJECT\n' +
    '// DO NOT EDIT IT DIRECTLY\n' +
    '\n' +
    'const { classes: Cc, interfaces: Ci, utils: Cu } = Components;\n' +
    'let { require: require, define: define } = Cu.import("resource://gre/modules/devtools/Require.jsm", {});\n' +
    'Cu.import("resource:///modules/devtools/gcli.jsm", {});\n' +
    '\n' +
    '// <INJECTED SOURCE:END>\n';

function amdToJsMockFilter(data) {
  return data.toString()
      .replace(/(define\(function\(require, exports, module\) {)/, mockHeader)
      .replace(/var mockCommands = exports;/, 'var mockCommands = {};')
      .replace(/(var [A-z]* = require\(['"]gclitest\/helpers['"]\);)/g, '// $1')
      .replace(/(var [A-z]* = require\(['"]gclitest\/mockCommands['"]\);)/g, '// $1')
      .replace(/(}\);[\n\w]*)$/, '// $1');
}

/**
 * Regular expression that removes the header/footer from a nls strings file.
 * If/when we revert to RequireJS formatted strings files, we'll need to update
 * this.
 * See lib/gcli/nls/strings.js for an example
 */
var outline = /root: {([^}]*)}/g;

/**
 * Regex to match a set of single line comments followed by a name:value
 * We run this to find the list of strings once we've used 'outline' to get the
 * main body.
 * See lib/gcli/nls/strings.js for an example
 */
var singleString = /((\s*\/\/.*\n)+)\s*([A-z0-9.]+):\s*'(.*)',?\n/g;

/**
 * Filter to turn GCLIs l18n script file into a Firefox l10n strings file
 */
function tweakI18nStrings(data) {
  // Rip off the CommonJS header/footer
  var output = '';
  data.replace(outline, function(m, inner) {
    // Remove the trailing spaces
    output += inner.replace(/ *$/, '');
  });

  if (output === '') {
    throw new Error('Mismatch in lib/gcli/nls/strings.js');
  }

  // Convert each of the string definitions
  output = output.replace(singleString, function(m, note, x, name, value) {
    note = note.replace(/\n? *\/\/ */g, ' ')
               .replace(/^ /, '')
               .replace(/\n$/, '');
    note = 'LOCALIZATION NOTE (' + name + '): ' + note;
    var lines = '# ' + wordWrap(note, 77).join('\n# ') + '\n';
    // Unescape JavaScript strings so they're property values
    value = value.replace(/\\\\/g, '\\')
                 .replace(/\\'/g, '\'');
    return lines + name + '=' + value + '\n\n';
  });

  return '' +
    '# This Source Code Form is subject to the terms of the Mozilla Public\n' +
    '# License, v. 2.0. If a copy of the MPL was not distributed with this\n' +
    '# file, You can obtain one at http://mozilla.org/MPL/2.0/.\n' +
    '\n' +
    '# LOCALIZATION NOTE These strings are used inside the Web Console\n' +
    '# command line which is available from the Web Developer sub-menu\n' +
    '# -> \'Web Console\'.\n' +
    '# The correct localization of this file might be to keep it in\n' +
    '# English, or another language commonly spoken among web developers.\n' +
    '# You want to make that choice consistent across the developer tools.\n' +
    '# A good criteria is the language in which you\'d find the best\n' +
    '# documentation on web development on the web.\n' +
    '\n' + output;
}

/**
 * Return an input string split into lines of a given length
 */
function wordWrap(input, length) {
  // LOOK! Over there! Is it an airplane?
  var wrapper = new RegExp('.{0,' + (length - 1) + '}([ $|\\s$]|$)', 'g');
  return input.match(wrapper).slice(0, -1).map(function(s) {
    return s.replace(/ $/, '');
  });
  // Ah, no - it's just superman, anyway, on with the code ...
}
