/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var copy = require('dryice').copy;
var path = require('path');
var fs = require('fs');

var gcliHome = __dirname;

/**
 * The main() function is called at the bottom of this file to ensure all the
 * globals are setup properly.
 */
function main() {
  var args = process.argv;
  if (args[2] === 'standard') {
    buildStandard();
  }
  else if (args[2] === 'firefox') {
    buildFirefox(args[3]);
  }
  else if (args[2] === 'test') {
    test();
  }
  else if (args[2] === 'serve') {
    serve();
  }
  else {
    console.log('Targets:');
    console.log('> node node-main.js standard');
    console.log('  # Builds GCLI for the web to ./built');
    console.log('> node node-main.js firefox [directory]');
    console.log('  # Builds GCLI for firefox to ./built/mozilla or [directory]');
    console.log('> node node-main.js test');
    console.log('  # Run GCLI tests using jsdom');
    console.log('> node node-main.js serve');
    console.log('  # Serve . to http://localhost:9999 for chrome');
    process.exit(1);
  }
}


/**
 * There are 2 important ways to build GCLI.
 * The first is for use within a normal web page.
 * It has compressed and uncompressed versions of the output script file.
 */
function buildStandard() {
  console.log('Building standard outputs to built/gcli[-uncompressed].js');

  copy.mkdirSync(gcliHome + '/built', 0755);
  var project = copy.createCommonJsProject({
    roots: [ gcliHome + '/lib' ]
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
    console.log('ERROR: Uglify compression fails on windows/linux. ' +
        'Skipping creation of built/gcli.js\n');
  }
}

/**
 * Build the Javascript JSM files for Firefox
 * It consists of 1 output file: gcli.jsm
 */
function buildFirefox(destDir) {
  if (!destDir && process.env.FIREFOX_HOME) {
    destDir = process.env.FIREFOX_HOME;
  }
  console.log('Building Firefox outputs to ' + (destDir || 'built/ff') + '.\n');

  if (!destDir) {
    copy.mkdirSync(gcliHome + '/built/ff', 0755);
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
      console.error('Missing path for JSM: ' + destDir + jsmDir);
      fail = true;
    }
    if (!path.existsSync(destDir + winCssDir)) {
      console.error('Missing path for Windows CSS: ' + destDir + winCssDir);
      fail = true;
    }
    if (!path.existsSync(destDir + pinCssDir)) {
      console.error('Missing path for Mac CSS: ' + destDir + pinCssDir);
      fail = true;
    }
    if (!path.existsSync(destDir + gnomeCssDir)) {
      console.error('Missing path for Gnome CSS: ' + destDir + gnomeCssDir);
      fail = true;
    }
    if (!path.existsSync(destDir + propsDir)) {
      console.error('Missing path for l10n string: ' + destDir + propsDir);
      fail = true;
    }
    if (fail) {
      process.exit(1);
    }
  }

  var project = copy.createCommonJsProject({
    roots: [ gcliHome + '/mozilla', gcliHome + '/lib' ]
  });

  var ignoreFilter = createIgnoreFilter([
    'gcli/ui/inputter.css',
    'gcli/ui/field/menu.css',
    'gcli/ui/arg_fetch.css',
    'gcli/commands/help.css',
    'gcli/ui/display.css',
    'gcli/ui/command_output_view.css'
  ]);

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
    filter: [ ignoreFilter, copy.filter.moduleDefines ],
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gcli.jsm'
  });

  // Copy gclichrome.xul
  // Perhaps not the best way, but it does keep everything self-contained
  copy({
    source: 'mozilla/build/gclichrome.xul',
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gclichrome.xul'
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
    filter: copy.filter.moduleDefines,
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

  // Package the CSS
  copy({
    source: [
      'mozilla/build/license-block.txt',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gcliterm.css */\n' },
      'mozilla/gcli/ui/gcliterm.css',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gcliterm-winstripe.css */\n' },
      'mozilla/gcli/ui/gcliterm-winstripe.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/arg_fetch.css */\n' },
      'lib/gcli/ui/arg_fetch.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/fields/menu.css */\n' },
      'lib/gcli/ui/fields/menu.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/inputter.css */\n' },
      'lib/gcli/ui/inputter.css',
      { value: '\n/* From: $GCLI/lib/gcli/commands/help.css */\n' },
      'lib/gcli/commands/help.css'
    ],
    filter: removeNonMozPrefixes,
    dest: (destDir ? destDir + winCssDir : 'built/ff') + '/gcli.css'
  });
  copy({
    source: [
      'mozilla/build/license-block.txt',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gcliterm.css */\n' },
      'mozilla/gcli/ui/gcliterm.css',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gcliterm-pinstripe.css */\n' },
      'mozilla/gcli/ui/gcliterm-pinstripe.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/arg_fetch.css */\n' },
      'lib/gcli/ui/arg_fetch.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/fields/menu.css */\n' },
      'lib/gcli/ui/fields/menu.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/inputter.css */\n' },
      'lib/gcli/ui/inputter.css',
      { value: '\n/* From: $GCLI/lib/gcli/commands/help.css */\n' },
      'lib/gcli/commands/help.css'
    ],
    filter: removeNonMozPrefixes,
    dest: (destDir ? destDir + pinCssDir : 'built/ff') + '/gcli.css'
  });
  copy({
    source: [
      'mozilla/build/license-block.txt',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gcliterm.css */\n' },
      'mozilla/gcli/ui/gcliterm.css',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gcliterm-gnomestripe.css */\n' },
      'mozilla/gcli/ui/gcliterm-gnomestripe.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/arg_fetch.css */\n' },
      'lib/gcli/ui/arg_fetch.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/fields/menu.css */\n' },
      'lib/gcli/ui/fields/menu.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/inputter.css */\n' },
      'lib/gcli/ui/inputter.css',
      { value: '\n/* From: $GCLI/lib/gcli/commands/help.css */\n' },
      'lib/gcli/commands/help.css'
    ],
    filter: removeNonMozPrefixes,
    dest: (destDir ? destDir + gnomeCssDir : 'built/ff') + '/gcli.css'
  });
  copy({
    source: [
      'mozilla/build/license-block.txt',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gclichrome.css */\n' },
      'mozilla/gcli/ui/gclichrome.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/display.css */\n' },
      'lib/gcli/ui/display.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/command_output_view.css */\n' },
      'lib/gcli/ui/command_output_view.css'
    ],
    filter: removeNonMozPrefixes,
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gclichrome.css'
  });

  // Package the i18n strings
  copy({
    source: [ 'lib/gcli/nls/strings.js', 'mozilla/gcli/commands/strings.js' ],
    filter: tweakI18nStrings,
    dest: (destDir ? destDir + propsDir : 'built/ff') + '/gcli.properties'
  });
}

/**
 * Sometimes we want to exclude modules from the output.
 * This replaces the contents of a named set of modules with an empty string.
 */
function createIgnoreFilter(ignoredModules) {
  var filter = function(data, location) {
    function checkIgnored(ignoredModule) {
      return location.path === ignoredModule;
    }
    if (location != null && ignoredModules.some(checkIgnored)) {
      return '';
    }
    return data;
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
    console.error('Mismatch in lib/gcli/nls/strings.js');
    process.exit(1);
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
 * Hack to remove the '-vendorprefix' definitions. This currently works to
 * remove -webkit, -ms and -op from CSS values and properties.
 */
function removeNonMozPrefixes(data) {
  return data
      .replace(/\n?\s*[-a-z]*:\s*-(webkit|op|ms)-[-a-z]*\s*;[ \t]*/g, '')
      .replace(/\n?\s*-(webkit|op|ms)-[-a-z]*:\s*[^;]*\s*;[ \t]*/g, '');
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
 * Run the test suite inside node
 */
function test() {
  // It's tempting to use RequireJS from npm, however that would break
  // running GCLI in Firefox just by opening index.html
  var requirejs = require('./scripts/r.js');

  requirejs.config({
    nodeRequire: require,
    paths: { 'text': 'scripts/text', 'i18n': 'scripts/i18n' },
    packagePaths: {
      'lib': [
        { name: 'gcli', main: 'index', lib: '.' },
        { name: 'test', main: 'index', lib: '.' },
        { name: 'gclitest', main: 'index', lib: '.' },
        { name: 'demo', main: 'index', lib: '.' }
      ]
    }
  });

  require('jsdom').jsdom.env({
    html: fs.readFileSync(gcliHome + '/index.html').toString(),
    src: [
      fs.readFileSync(gcliHome + '/scripts/html5-shim.js').toString()
    ],
    features: {
      QuerySelector: true
    },
    done: requirejs('gclitest/nodeIndex').run
  });
}

var connect = require('connect');
var util  = require('util');
var childProcess = require('child_process');

/**
 * Serve '.' to http://localhost:9999/
 */
function serve() {
  var logger = connect.logger();
  var files = connect.static(gcliHome, { maxAge: 0 });
  /*
  var parser = connect.bodyParser();
  var router = connect.router(function(app) {
    app.post('/exec/', execApp);
    app.get('/test/', testApp);
  });
  */

  console.log('Serving GCLI to http://localhost:9999/');
  connect(logger, files/*, parser, router*/).listen(9999);
}

function execApp(request, response, next) {
  var cmd = request.body.cmd;
  var args = request.body.args;
  var options = { cwd: request.body.cwd, env: request.body.env };
  childProcess.execFile(cmd, args, options, function(error, stdout, stderr) {
    var status = error ? 500 : 200;
    response.writeHead(status, {
      'Content-Length': stdout.toString().length,
      'Content-Type': 'text/plain'
    });
    response.end(stdout);
  });
}

function testApp(req, res, next) {
  res.end('hello world\n');
}

// Now everything is defined properly, start working
main();
