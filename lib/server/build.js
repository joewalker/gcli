/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

var copy = require('dryice').copy;
var path = require('path');
var fs = require('fs');
var main = require('../../gcli');
var childProcess = require('child_process');

var Promise = main.requirejs('gcli/promise').Promise;

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

  var jsmDir = '/browser/devtools/gcli';
  var testDir = '/browser/devtools/gcli/test';
  var propsDir = '/browser/locales/en-US/chrome/browser/devtools';

  if (destDir) {
    var fail = false;
    if (!path.existsSync(destDir + jsmDir)) {
      log += 'Missing path for JSM: ' + destDir + jsmDir + '\n';
      fail = true;
    }
    if (!path.existsSync(destDir + testDir)) {
      log += 'Missing path for tests: ' + destDir + testDir + '\n';
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
      'mozilla/build/module-prefix.jsm',
      // This list of dependencies should be the same as in suffix-gcli.jsm
      { project: project, require: [ 'gcli/index' ] }
    ],
    filter: [ createCssIgnoreFilter(), copy.filter.moduleDefines ],
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/GcliModules.jsm'
  });

  // Package the gclichrome.jsm
  project.assumeAllFilesLoaded();
  copy({
    source: [
      'mozilla/build/module-prefix.jsm',
      // This list should be the same as suffix-gclichrome.jsm
      { project: project, require: [ 'gcli/gclichrome' ] }
    ],
    filter: [ createCssIgnoreFilter(), copy.filter.moduleDefines ],
    dest: (destDir ? destDir + jsmDir : 'built/ff') + '/GcliChromeModules.jsm'
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
  var undefine = '\n';
  undefine += 'let testModuleNames = [\n';
  modules.forEach(function(module) {
    undefine += '  \'' + module + '\',\n';
  });
  undefine += '];\n';
  return { value: undefine };
}

/**
 * The dirs which we need to build
 */
var firefoxHome = 'P:/mozilla/devtools';
var buildDirs = [
  '/p/mozilla/devtools/obj/browser/themes',
  '/p/mozilla/devtools/obj/browser/devtools',
  '/p/mozilla/devtools/obj/browser/base'
];

/**
 * Test build file
 */
exports.incrBuildMain = function() {
  var promise = new Promise();

  var buildPromises = buildDirs.map(function(buildDir) {
    return build(buildDir);
  });
  Promise.group(buildPromises).then(function(outputs) {
    build('/p/mozilla/devtools/obj/browser/app').then(function(output) {
      outputs.push(output);
      promise.resolve(outputs);
    });
  });

  return promise;
};

/**
 * Test build file
 */
exports.fullBuildMain = function() {
  var command = 'C:/Users/joe/Projects/mozilla/build/build.bat';
  var args = [ '/C/Users/joe/Projects/mozilla/build/fullbuild-run.sh' ];
  var dir = 'C:/Users/joe/Projects/mozilla/build';

  return run(dir, command, args);
};

var mozEnv = {
  // These are the entries that build.bat does by hand
  MOZ_MSVCVERSION: 10,
  MOZBUILDDIR: 'C:\\mozilla-build\\',
  MOZILLABUILD: 'C:\\mozilla-build\\',
  MOZ_TOOLS: 'C:\\mozilla-build\\moztools',
  // PATH: PATH + ';C:\\mozilla-build\\moztools\\bin',
  VC10DIR: 'C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\',

  // Extra stuff from calling "%VC10DIR%\Bin\vcvars32.bat"
  INCLUDE: 'c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\INCLUDE;c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\ATLMFC\\INCLUDE;C:\\Program Files (x86)\\Microsoft SDKs\\Windows\\v7.0A\\include;',
  LIB: 'c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\LIB;c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\ATLMFC\\LIB;C:\\Program Files (x86)\\Microsoft SDKs\\Windows\\v7.0A\\lib;',
  PATH: '/local/bin:/c/mozilla-build/wget:/c/mozilla-build/7zip:/c/mozilla-build/blat261/full:/c/mozilla-build/python:/c/mozilla-build/svn-win32-1.6.3/bin:/c/mozilla-build/upx203w:/c/mozilla-build/emacs-22.3/bin:/c/mozilla-build/info-zip:/c/mozilla-build/nsis-2.22:/c/mozilla-build/nsis-2.33u:/c/mozilla-build/nsis-2.46u:/c/mozilla-build/wix-351728:/c/mozilla-build/hg:/c/mozilla-build/python/Scripts:/c/mozilla-build/kdiff3:/c/mozilla-build/yasm:.:/usr/local/bin:/mingw/bin:/bin:/c/Program Files (x86)/Microsoft F#/v4.0/:/c/Program Files (x86)/Microsoft Visual Studio 10.0/VSTSDB/Deploy:/c/Program Files (x86)/Microsoft Visual Studio 10.0/Common7/IDE/:/c/Program Files (x86)/Microsoft Visual Studio 10.0/VC/BIN:/c/Program Files (x86)/Microsoft Visual Studio 10.0/Common7/Tools:/c/Windows/Microsoft.NET/Framework/v4.0.30319:/c/Windows/Microsoft.NET/Framework/v3.5:/c/Program Files (x86)/Microsoft Visual Studio 10.0/VC/VCPackages:/c/Program Files (x86)/HTML Help Workshop:/c/Program Files (x86)/HTML Help Workshop:/c/Program Files (x86)/Microsoft SDKs/Windows/v7.0A/bin/NETFX 4.0 Tools:/c/Program Files (x86)/Microsoft SDKs/Windows/v7.0A/bin:/c/Windows/System32:/c/Windows:/c/Windows/System32/Wbem:/c/mozilla-build/moztools/bin:/c/mozilla-build/vim/vim72',
  LIBPATH: 'c:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319;c:\\Windows\\Microsoft.NET\\Framework\\v3.5;c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\LIB;c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\ATLMFC\\LIB;',

  DEVENVDIR: 'c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\Common7\\IDE\\',
  FRAMEWORK35VERSION: 'v3.5',
  FRAMEWORKDIR: 'c:\\Windows\\Microsoft.NET\\Framework\\',
  FRAMEWORKDIR32: 'c:\\Windows\\Microsoft.NET\\Framework\\',
  FRAMEWORKVERSION: 'v4.0.30319',
  FRAMEWORKVERSION32: 'v4.0.30319',
  VCINSTALLDIR: 'c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\',
  VSINSTALLDIR: 'c:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\',
  WINDOWSSDKDIR: 'C:\\Program Files (x86)\\Microsoft SDKs\\Windows\\v7.0A\\',

  SDKMINORVER: '0',
  WIX_351728_PATH: '/c/mozilla-build/wix-351728',
  APR_ICONV_PATH: '/c/mozilla-build/svn-win32-1.6.3/iconv',
  MOZ_MAXWINSDK: '999999'
};

/**
 *
 */
function build(buildDir) {
  var cmd = 'C:/mozilla-build/msys/bin/bash';
  var options = { cwd: firefoxHome, env: mozEnv };

  var args = [ ];
  if (buildDir == null) {
    args.push('--login', '-i', '-c', 'python -OO build/pymake/make.py -f client.mk');
    buildDir = 'Full';
  }
  else {
    args.push('--login', '-i', '-c', 'cd /p/mozilla/devtools; python -OO build/pymake/make.py -C ' + buildDir);
  }

  return run(firefoxHome, cmd, args, mozEnv);
}

/**
 *
 */
function run(cwd, command, args, env) {
  console.log('From: ' + cwd);
  console.log('Running: ' + command, args.join(' '));

  var promise = new Promise();
  var output = [];

  var child = childProcess.execFile(command, args, { cwd: cwd, env: env });
  child.stdout.on('data', function(data) {
    data = data.toString().replace(/\n$/, '');
    console.log(data);
    output.push({
      stream: 'stdout',
      data: data,
      timestamp: (new Date()).getTime()
    });
    promise.progress({ message: data });
  });

  child.stderr.on('data', function(data) {
    data = data.toString().replace(/\n$/, '');
    console.log(data);
    output.push({
      stream: 'stderr',
      data: data,
      timestamp: (new Date()).getTime()
    });
    promise.progress({ message: data });
  });

  child.on('exit', function(code) {
    console.log('Done ' + command);
    promise.resolve(output);
  });

  return promise;
}
