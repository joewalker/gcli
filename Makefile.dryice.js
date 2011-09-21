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
  if (args.length < 3 || args[2] === 'standard') {
    buildStandard();
  }
  else if (args[2] === 'firefox') {
    buildFirefox(args[3]);
  }
  else {
    console.error('Error: Unknown target: \'' + args[2] + '\'');
    process.exit(1);
  }
}


/**
 * There are 2 important ways to build GCLI.
 * The first is for use within a normal web page.
 * It has compressed and uncompressed versions of the output script file.
 */
function buildStandard() {
  console.log('Building built/gcli[-uncompressed].js:');

  if (!path.existsSync(gcliHome + '/built')) {
    fs.mkdirSync(gcliHome + '/built', 0755);
  }

  var project = copy.createCommonJsProject({
    roots: [ gcliHome + '/lib' ]
  });
  var sources = copy.createDataObject();

  copy({
    source: copy.source.commonjs({
      project: project,
      // This list of dependencies should be the same as in index.html
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
  console.log('Building to ' + (destDir || 'built/ff') + '.\n');

  if (!destDir) {
    if (!path.existsSync(gcliHome + '/built')) {
      fs.mkdirSync(gcliHome + '/built', 0755);
    }
    if (!path.existsSync(gcliHome + '/built/ff')) {
      fs.mkdirSync(gcliHome + '/built/ff', 0755);
    }
  }

  var jsmDir = '/browser/devtools/webconsole';
  var winCssDir = '/browser/themes/winstripe/browser/devtools';
  var pinCssDir = '/browser/themes/pinstripe/browser/devtools';
  var gnomeCssDir = '/browser/themes/gnomestripe/browser/devtools';
  var propsDir = '/browser/locales/en-US/chrome/browser';

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
    roots: [ gcliHome + '/mozilla', gcliHome + '/lib' ],
    ignores: [ 'text!gcli/ui/inputter.css' ]
  });

  // Package the JavaScript
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
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/gcli.jsm'
  });

  // Package the CSS
  var css = copy.createDataObject();
  copy({
    source: [
      'mozilla/build/license-block.txt',
      { value: '\n/* From: $GCLI/mozilla/gcli/ui/gcliterm.css */' },
      'mozilla/gcli/ui/gcliterm.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/arg_fetch.css */' },
      'lib/gcli/ui/arg_fetch.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/hinter.css */' },
      'lib/gcli/ui/hinter.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/menu.css */' },
      'lib/gcli/ui/menu.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/inputter.css */' },
      'lib/gcli/ui/inputter.css',
      { value: '\n/* From: $GCLI/lib/gcli/ui/command_output_view.css */' },
      'lib/gcli/ui/command_output_view.css'
    ],
    dest: css
  });
  copy({
    source: css,
    dest: (destDir ? destDir + winCssDir : 'built/ff') + '/gcli.css'
  });
  copy({
    source: css,
    dest: (destDir ? destDir + pinCssDir : 'built/ff') + '/gcli.css'
  });
  copy({
    source: css,
    dest: (destDir ? destDir + gnomeCssDir : 'built/ff') + '/gcli.css'
  });

  // Package the i18n strings
  copy({
    source: 'lib/gcli/nls/strings.js',
    filter: tweakI18nStrings,
    dest: (destDir ? destDir + propsDir : 'built/ff') + '/gcli.properties'
  });

  console.log(project.report());
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
var outline = /root: {([^}]*)}/;

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
  var results = outline.exec(data);
  if (!results) {
    console.error('Mismatch in lib/gcli/nls/strings.js');
    process.exit(1);
  }
  // Remove the trailing spaces
  var data = results[1].replace(/ *$/, '');
  // Convert each of the string definitions
  data = data.replace(singleString, function(m, note, x, name, value) {
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

  return '# LOCALIZATION NOTE These strings are used inside the GCLI.\n\n' + data;
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

// Now everything is defined properly, start working
main();
