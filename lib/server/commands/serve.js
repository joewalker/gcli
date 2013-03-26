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

var main = require('../../../gcli');
var gcli = main.require('gcli/index');
var express = require('express');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(serveCmdSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(serveCmdSpec);
};

/**
 * 'serve' build command
 */
var serveCmdSpec = {
  name: 'serve',
  description: 'Quit from GCLI',
  returnType: 'string',
  exec: function(args, context) {
    var deferred = context.defer();

    var server = express();
    server.use(express.logger('dev'));
    server.use(express.static(main.gcliHome));

    server.on('error', function(error) {
      deferred.reject(error);
    });
    server.listen(9999, 'localhost', undefined, function() {
      deferred.resolve('Serving GCLI to http://localhost:9999/');
    });

    return deferred.promise;
  }
};
