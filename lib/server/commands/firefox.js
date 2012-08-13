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
var path = require('path');
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
    if (!path.existsSync(destDir + jsmDir)) {
      throw new Error('Missing path for JSM: ' + destDir + jsmDir);
    }
    if (!path.existsSync(destDir + testDir)) {
      throw new Error('Missing path for tests: ' + destDir + testDir);
    }
    if (!path.existsSync(destDir + propsDir)) {
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
  var sources = copy.createDataObject();
  copy({
    // This list of dependencies should be the same as in suffix-test.js
    source: { project: project, require: [ 'gclitest/index' ] },
    filter: copy.filter.moduleDefines,
    dest: sources
  });
  // This has to be done in 2 steps because createUndefineFunction uses
  // project.currentFiles which is populated by using the project as a source
  copy({
    source: [
      'mozilla/build/prefix-test.js',
      sources,
      createUndefineFunction(project),
      'mozilla/build/suffix-test.js'
    ],
    dest: (destDir ? destDir + testDir : 'built/ff') + '/browser_gcli_web.js'
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
  var prefixFile = main.gcliHome + '/mozilla/build/module-prefix.jsm';
  var prefix = fs.readFileSync(prefixFile, 'UTF-8');
  return {
    value: prefix.replace('{EXPORTED_SYMBOLS}', exportName)
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
        'const ' + exportName + ' = require(\'' + requirement + '\');\n'
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

/**
 * A function to create an undefine function that undoes the effect of defining
 * all the modules in the given project. This is useful in firefox tests that
 * need to undo all the changes they make to avoid memleak detection tests
 * @param project The commonjs the we're aggregating together.
 */
function createUndefineFunction(project) {
  // This is slightly evil because it digs into the guts of a project
  var modules = Object.keys(project.currentModules);
  var undefine = '\n';
  undefine += 'let testModuleNames = [\n';
  modules.forEach(function(module) {
    undefine += '  \'' + module + '\',\n';
  });
  undefine += '];\n';
  return { value: undefine };
}
