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

/**
 * This is a list of the l10n strings that we remove from strings.js as we
 * convert it to gcli.properties. This list comes about due to commands that we
 * include in the web build of GCLI, but not in the Firefox build
 */
var ignoreStrings = [
  'cdDesc', 'cdManual', 'cdDirectoryDesc', 'cdOutput',
  'execDesc', 'execManual', 'execCommandDesc'
];

/**
 * 'firefox' build command
 */
exports.items = [
  {
    item: 'command',
    name: 'firefox',
    description: 'Build the firefox-GCLI target',
    params: [
      {
        name: 'location',
        type: 'string',
        defaultValue: process.env.FIREFOX_HOME,
        description: 'The location of the mozilla-central checkout'
      }
    ],
    returnType: 'string',
    exec: function(args, context) {
      return buildFirefox(args.location);
    }
  }
];

/**
 * Build the Javascript JSM files for Firefox
 * Consists of: gcli.jsm, browser_gcli_web.js and gcli.properties
 */
function buildFirefox(destDir) {
  if (!destDir) {
    throw new Error('No destination directory. Either set $FIREFOX_HOME or use --location ...');
  }
  var log = 'Building Firefox outputs to ' + (destDir || 'built/ff') + '.\n\n';

  if (!destDir) {
    copy.mkdirSync(path.dirname(require.main.filename) + '/built/ff', 493 /*0755*/);
  }

  var testDir = '/browser/devtools/commandline/test';
  var propsDir = '/browser/locales/en-US/chrome/browser/devtools';

  if (destDir) {
    if (!fs.existsSync(destDir + testDir)) {
      throw new Error('Missing path for tests: ' + destDir + testDir);
    }
    if (!fs.existsSync(destDir + propsDir)) {
      throw new Error('Missing path for l10n string: ' + destDir + propsDir);
    }
  }

  // Convert GCLI test files to Mochitest files. The excluded tests are those
  // that rely on commands that ship with GCLI-web but are not implemented in
  // the same way in Firefox, and require which has been manually translated
  copy({
    source: {
      root: 'lib/gcli/test/',
      include: /test.*\.js$/,
      exclude: [
        /testHelp\.js$/,
        /testPref\.js$/,
        /testSettings\.js$/,
        /testRequire\.js$/
      ]
    },
    filter: createCommonJsToJsTestFilter(),
    filenameFilter: function(filename) {
      // the t prefix prevents 'test' from matching the directory name
      return filename.replace(/t\/test/, 't\/browser_gcli_').toLowerCase();
    },
    dest: (destDir ? destDir + testDir : 'built/ff')
  });
  copy({
    source: 'lib/gcli/test/mockCommands.js',
    filter: commonJsToJsMockFilter,
    dest: (destDir ? destDir + testDir : 'built/ff') + '/mockCommands.js'
  });
  copy({
    source: 'lib/gcli/test/mockFileCommands.js',
    filter: commonJsToJsMockFilter,
    dest: (destDir ? destDir + testDir : 'built/ff') + '/mockFileCommands.js'
  });

  // Package the i18n strings
  copy({
    source: [ 'lib/gcli/nls/strings.js' ],
    filter: tweakI18nStrings,
    dest: (destDir ? destDir + propsDir : 'built/ff') + '/gcli.properties'
  });

  return log;
}

/**
 * Convert the CommonJS module style that GCLI uses to the plain JS style used
 * by Firefox. Note that this is custom for our tests, but it could be a
 * starting point for other similar conversions.
 */
function createCommonJsToJsTestFilter() {
  var filter = function commonJsToJsTestFilter(data, location) {
    var name = location.path.replace(/\/test/, 'browser_gcli_').toLowerCase();
    var header = '$1' +
        '\n\n' +
        '// THIS FILE IS GENERATED FROM SOURCE IN THE GCLI PROJECT\n' +
        '// PLEASE TALK TO SOMEONE IN DEVELOPER TOOLS BEFORE EDITING IT\n' +
        '\n' +
        'const exports = {};\n' +
        '\n' +
        'function test() {\n' +
        '  helpers.runTestModule(exports, "' + name + '");\n' +
        '}';
    return data.toString()
        // Inject the header above just after 'use strict'
        .replace(/('use strict';)/, header)
        // Comment out test helpers that we define separately
        .replace(/(var [A-z]* = require\(['"][A-z_\.\/]*\/assert['"]\);)/g, '// $1')
        .replace(/(var [A-z]* = require\(['"][A-z_\.\/]*\/helpers['"]\);)/g, '// $1')
        .replace(/(var [A-z]* = require\(['"][A-z_\.\/]*\/mockCommands['"]\);)/g, '// $1')
        // Make the require statements absolute rather than relative.
        // We're ignoring paths that start ../.. or ./ but this works for now
        .replace(/\nvar ([A-z]*) = require\(['"]..\/([A-z_\/]*)['"]\)/g, '\nvar $1 = require(\'gcli/$2\')');
  };
  filter.onRead = true;
  return filter;
}

function commonJsToJsMockFilter(data) {
  var header = '$1' +
      '\n\n' +
      '// THIS FILE IS GENERATED FROM SOURCE IN THE GCLI PROJECT\n' +
      '// PLEASE TALK TO SOMEONE IN DEVELOPER TOOLS BEFORE EDITING IT';

  return data.toString()
      // Inject the header above just after 'use strict'
      .replace(/('use strict';)/, header)
      // Make the require statements absolute rather than relative.
      // We're ignoring paths that start ../.. or ./ but this works for now
      .replace(/\nvar ([A-z]*) = require\(['"]..\/([A-z_\/]*)['"]\)/g, '\nvar $1 = require(\'gcli/$2\')');
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
var singleString = /((\s*\/\/.*\n)*)\s*([A-z0-9.]+):\s*'(.*)',?\n/g;

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

  var strings = [];

  // Convert each of the string definitions
  var reply = output.replace(singleString, (m, note, x, name, value) => {
    strings.push({
      note: note,
      noteAlsoFor: [],
      name: name,
      value: value
    });
    return '';
  });

  console.log('reply="' + reply + '"');

  strings = strings.filter(string => ignoreStrings.indexOf(string.name) === -1);

  // All strings should have a note, but sometimes we describe several strings
  // with one note, so if a string has no note then we add it to noteAlsoFor
  // in the last string with a note
  var lastStringWithNote = -1;
  strings.forEach((string, i) => {
    if (string.note === '') {
      strings[lastStringWithNote].noteAlsoFor.push(string.name);
    }
    else {
      lastStringWithNote = i;
    }
  });

  // Make a single one line string from the the multi-line JS comments
  strings.forEach(string => {
    if (string.note !== '') {
      string.note = string.note.replace(/\n? *\/\/ */g, ' ')
                               .replace(/^ /, '')
                               .replace(/\n$/, '');
    }
  });

  // Add the 'LOCALIZATION NOTE' and word wrap
  strings.forEach(string => {
    if (string.note !== '') {
      string.noteAlsoFor.unshift(string.name);
      var names = '';
      if (string.noteAlsoFor.length > 1) {
        names = ' (' + string.noteAlsoFor.join(', ') + ')';
      }

      string.note = 'LOCALIZATION NOTE' + names + ': ' + string.note;
      string.note = '\n# ' + wordWrap(string.note, 77).join('\n# ') + '\n';
    }
  });

  // The values were escaped JavaScript strings to be property values they
  // need unescaping
  strings.forEach(string => {
    string.value = string.value.replace(/\\\\/g, '\\').replace(/\\'/g, '\'');
  });

  // Join to get the output
  output = strings.map(string => {
    return string.note + string.name + '=' + string.value + '\n';
  }).join('');

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
    '\n' +
    '# For each command there are in general two strings. As an example consider\n' +
    '# the \'pref\' command.\n' +
    '# commandDesc (e.g. prefDesc for the command \'pref\'): this string contains a\n' +
    '# very short description of the command. It\'s designed to be shown in a menu\n' +
    '# alongside the command name, which is why it should be as short as possible.\n' +
    '# commandManual (e.g. prefManual for the command \'pref\'): this string will\n' +
    '# contain a fuller description of the command. It\'s diplayed when the user\n' +
    '# asks for help about a specific command (e.g. \'help pref\').\n' +
    output;
}
/**
 * Return an input string split into lines of a given length
 */
function wordWrap(input, length) {
  // LOOK! Over there! Is it an airplane?
  var wrapper = new RegExp('.{0,' + (length - 1) + '}([ $|\\s$]|$)', 'g');
  return input.match(wrapper).slice(0, -1).map(s => s.replace(/ $/, ''));
  // Ah, no - it's just superman, anyway, on with the code ...
}
