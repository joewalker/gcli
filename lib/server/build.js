/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var copy = require('dryice').copy;
var path = require('path');
var fs = require('fs');
var main = require('../../gcli');

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
      // This list of dependencies should be the same as in index.html
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
    log += 'ERROR: Uglify compression fails on windows/linux. ' +
        'Skipping creation of built/gcli.js\n';
  }
  return log;
};

/**
 * Build the Javascript JSM files for Firefox
 * It consists of 1 output file: gcli.jsm
 */
exports.buildFirefox = function(destDir) {
  if (!destDir && process.env.FIREFOX_HOME) {
    destDir = process.env.FIREFOX_HOME;
  }
  log = 'Building Firefox outputs to ' + (destDir || 'built/ff') + '.\n\n';

  if (!destDir) {
    copy.mkdirSync(main.gcliHome + '/built/ff', 0755);
  }

  var jsmDir = '/browser/devtools/webconsole';
  var winCssDir = '/browser/themes/winstripe/devtools';
  var pinCssDir = '/browser/themes/pinstripe/devtools';
  var gnomeCssDir = '/browser/themes/gnomestripe/devtools';
  var propsDir = '/browser/locales/en-US/chrome/browser/devtools';
  var testDir = '/browser/devtools/webconsole/test';

  if (destDir) {
    var fail = false;
    if (!path.existsSync(destDir + jsmDir)) {
      log += 'Missing path for JSM: ' + destDir + jsmDir + '\n';
      fail = true;
    }
    if (!path.existsSync(destDir + winCssDir)) {
      log += 'Missing path for Windows CSS: ' + destDir + winCssDir + '\n';
      fail = true;
    }
    if (!path.existsSync(destDir + pinCssDir)) {
      log += 'Missing path for Mac CSS: ' + destDir + pinCssDir + '\n';
      fail = true;
    }
    if (!path.existsSync(destDir + gnomeCssDir)) {
      log += 'Missing path for Gnome CSS: ' + destDir + gnomeCssDir + '\n';
      fail = true;
    }
    if (!path.existsSync(destDir + propsDir)) {
      log += 'Missing path for l10n string: ' + destDir + propsDir + '\n';
      fail = true;
    }
    if (fail) {
      process.exit(1);
    }
  }

  var project = copy.createCommonJsProject({
    roots: [ main.gcliHome + '/mozilla', main.gcliHome + '/lib' ]
  });

  // Package the JavaScript
  copy({
    source: [
      'mozilla/build/prefix-gcli.jsm',
      'mozilla/build/console.js',
      copy.getMiniRequire(),
      // This list of dependencies should be the same as in suffix-gcli.jsm
      { project: project, require: [ 'gcli/index' ] },
      'mozilla/build/suffix-gcli.jsm'
    ],
    filter: [ createCssIgnoreFilter(), copy.filter.moduleDefines ],
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gcli.jsm'
  });

  // Package the gclichrome.jsm
  project.assumeAllFilesLoaded();
  copy({
    source: [
      'mozilla/build/prefix-gclichrome.jsm',
      'mozilla/build/console.js',
      copy.source.commonjs({
        project: project,
        // This list should be the same as suffix-gclichrome.jsm
        require: [ 'gcli/gclichrome' ]
      }),
      'mozilla/build/suffix-gclichrome.jsm'
    ],
    filter: [ createCssIgnoreFilter(), copy.filter.moduleDefines ],
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gclichrome.jsm'
  });

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
      .replace(/scripts\/es5-shim.js/, 'es5-shim.js')
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
 * We run this to fund the list of strings once we've used 'outline' to get the
 * main body.
 * See lib/gcli/nls/strings.js for an example
 */
var singleString = /((\s*\/\/.*\n)+)\s*([A-z.]+):\s*'(.*)',?\n/g;

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
  var undefine = '\nfunction undefine() {\n';
  modules.forEach(function(module) {
    undefine += '  delete define.modules[\'' + module + '\'];\n';
  });
  undefine += '\n';
  modules.forEach(function(module) {
    undefine += '  delete define.globalDomain.modules[\'' + module + '\'];\n';
  });
  undefine += '}\n';
  return { value: undefine };
}

/**
 * Test build file
 */
exports.buildMain = function() {
  var firefoxHome = main.gcliHome + '/../devtools';
  [
    firefoxHome + '/obj/browser/themes',
    firefoxHome + '/obj/browser/devtools',
    firefoxHome + '/obj/browser/app',
    firefoxHome + '/obj/browser/base'
  ].forEach(function(dir) {
    var cmd = 'python';
    var options = { cwd: firefoxHome };
    var args = [ '-OO', 'build/pymake/make.py', '-C', dir ];
    childProcess.execFile(cmd, args, options, function(error, stdout, stderr) {
      var status = error ? 500 : 200;
      response.writeHead(status, {
        'Content-Length': stdout.toString().length,
        'Content-Type': 'text/plain'
      });
      response.end(stdout);
    });
  });
};
