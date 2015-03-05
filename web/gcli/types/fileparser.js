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

var Promise = require('../util/promise').Promise;
var Status = require('./types').Status;
var util = require('../util/util');
var GcliFront = require('../connectors/remoted').GcliFront;

/**
 * Helper for the parse() function from the file type.
 * @param context An executionContext to allow us to use the filesystem
 * @param typed i.e. arg.text, the string typed by the user
 * @param options An object describing what type of file is expected:
 * - filetype: One of 'file', 'directory', 'any'
 * - existing: Should be one of 'yes', 'no', 'maybe'
 * - matches: RegExp to match the file part of the path
 * @return An object that describes the results of the parse, to help the file
 * type create a Conversion object. Returned properties are:
 * - value: The parsed type, while we are just using strings for file values,
 *          this will be equal to 'typed' (if status=VALID, undefined otherwise)
 * - status: A Status value (i.e. VALID, INCOMPLETE, ERROR)
 * - message: Message explaining any errors to the user,
 * - predictor: A function with no parameters that returns a promise of an
 *              array of prediction objects, each of which contains a 'name'
 *              and can contain a boolean 'complete' property
 */
exports.parse = function(context, typed, options) {
  var matches = options.matches == null ? undefined : options.matches.source;

  var connector = context.system.connectors.get();
  return GcliFront.create(connector).then(function(front) {
    return front.parseFile(typed, options.filetype,
                           options.existing, matches).then(function(reply) {
      reply.status = Status.fromString(reply.status);
      if (reply.predictions != null) {
        reply.predictor = function() {
          return Promise.resolve(reply.predictions);
        };
      }
      front.connection.disconnect().catch(util.errorHandler);
      return reply;
    });
  });
};
