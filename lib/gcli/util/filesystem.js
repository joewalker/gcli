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

var util = require('./util');

/**
 * A set of functions defining a filesystem API for fileparser.js
 */

exports.join = function() {
  var path = require('p' + 'ath');
  return path.join.apply(path, arguments);
};

exports.dirname = function() {
  var path = require('p' + 'ath');
  return path.dirname.apply(path, arguments);
};

exports.sep = function() {
  var path = require('p' + 'ath');
  return path.sep.apply(path, arguments);
};

exports.home = typeof process !== 'undefined' ? process.env.HOME : '';

/**
 * The NodeJS docs suggest using ``pathname.split(path.sep)`` to cut a path
 * into a number of components. But this doesn't take into account things like
 * path normalization and removing the initial (or trailing) blanks from
 * absolute (or / terminated) paths.
 * http://www.nodejs.org/api/path.html#path_path_sep
 * @param pathname (string) The part to cut up
 * @return An array of path components
 */
exports.split = function(pathname) {
  var path = require('p' + 'ath');
  pathname = path.normalize(pathname);
  var parts = pathname.split(exports.sep);
  return parts.filter(function(part) {
    return part !== '';
  });
};

/**
 * @param pathname string, path of an existing directory
 * @param matches optional regular expression - filter output to include only
 * the files that match the regular expression. The regexp is applied to the
 * filename only not to the full path
 * @return A promise of an array of stat objects for each member of the
 * directory pointed to by ``pathname``, each containing 2 extra properties:
 * - pathname: The full pathname of the file
 * - filename: The final filename part of the pathname
 */
exports.ls = function(pathname, matches) {
  return new Promise(function(resolve, reject) {
    var fs = require('f' + 's');
    var path = require('p' + 'ath');
    fs.readdir(pathname, function(err, files) {
      if (err) {
        reject(err);
      }
      else {
        if (matches) {
          files = files.filter(function(file) {
            return matches.test(file);
          });
        }

        var statsPromise = util.promiseEach(files, function(filename) {
          var filepath = path.join(pathname, filename);
          return exports.stat(filepath).then(function(stats) {
            stats.filename = filename;
            stats.pathname = filepath;
            return stats;
          });
        });

        statsPromise.then(resolve, reject);
      }
    });
  }.bind(this));
};

/**
 * stat() is annoying because it considers stat('/doesnt/exist') to be an
 * error, when the point of stat() is to *find* *out*. So this wrapper just
 * converts 'ENOENT' i.e. doesn't exist to { exists:false } and adds
 * exists:true to stat blocks from existing paths
 */
exports.stat = function(pathname) {
  return new Promise(function(resolve, reject) {
    var fs = require('f' + 's');
    fs.stat(pathname, function(err, stats) {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve({
            exists: false,
            isDir: false,
            isFile: false
          });
        }
        else {
          reject(err);
        }
      }
      else {
        resolve({
          exists: true,
          isDir: stats.isDirectory(),
          isFile: stats.isFile()
        });
      }
    });
  }.bind(this));
};

/**
 * We may read the first line of a file to describe it?
 * Right now, however, we do nothing.
 */
exports.describe = function(pathname) {
  return Promise.resolve('');
};
