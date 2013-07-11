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

// Warning - gcli.js causes this version of host.js to be favored in NodeJS
// which means that it's also used in testing in NodeJS

var main = require('../../../gcli');
var promise = main.require('util/promise');

var childProcess = require('child_process');

/**
 * See docs in lib/util/host.js:flashNodes
 */
exports.flashNodes = function(nodes, match) {
  // Not implemented
};

/**
 * See docs in lib/util/host.js:exec
 */
exports.exec = function(execSpec) {
  var deferred = promise.defer();

  var output = { data: '' };
  var child = childProcess.spawn(execSpec.cmd, execSpec.args, {
    env: execSpec.env,
    cwd: execSpec.cwd
  });

  child.stdout.on('data', function(data) {
    output.data += data;
  });

  child.stderr.on('data', function(data) {
    output.data += data;
  });

  child.on('close', function(code) {
    output.code = code;
    if (code === 0) {
      deferred.resolve(output);
    }
    else {
      deferred.reject(output);
    }
  });

  return deferred.promise;
};
