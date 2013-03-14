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
var childProcess = require('child_process');
var main = require('../../../gcli');
var gcli = main.require('gcli/index');
var Promise = main.require('util/promise').Promise;

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(makeCmdSpc);
};

exports.shutdown = function() {
  gcli.removeCommand(makeCmdSpc);
};

/**
 * 'make' build command
 */
var makeCmdSpc = {
  name: 'make',
  description: 'Firefox build/run',
  params: [
    {
      name: 'full',
      type: 'boolean',
      description: 'Do we do a full build'
    }
  ],
  returnType: 'terminal',
  exec: function(args, context) {
    if (args.full) {
      return exports.fullBuildMain();
    }
    else {
      return exports.incrBuildMain();
    }
  }
};

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
