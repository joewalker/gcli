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

var promise = require('./promise');
var util = require('./util');

/**
 * Internal helper to send JSON to a url via XHR and return the JSON reply in a
 * promise.
 */
exports.post = function(url, data) {
  var deferred = promise.defer();

  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

  xhr.onreadystatechange = function(event) {
    if (xhr.readyState === 4) {
      if (xhr.status >= 300 || xhr.status < 200) {
        deferred.reject({
          data: xhr.responseText,
          code: xhr.status
        });
      }
      else {
        var output = JSON.parse(xhr.responseText);
        deferred.resolve(output);
      }
    }
  }.bind(this);

  xhr.send(JSON.stringify(data));

  return deferred.promise;
};

/**
 * Counterpart to POST above that takes JSON-able data from a promise and
 * sends it across XHR
 */
exports.sendReply = function(dataPromise, res) {
  var onResolve = function(data) {
    var text = stringify(data);
    res.send(text);
  };

  var onReject = function(data) {
    if (data.code == null) {
      util.errorHandler(data);
      data = {
        code: -1,
        data: stringify(data)
      };
    }
    var text = stringify(data);
    res.status(500).send(text);
  };

  return dataPromise.then(onResolve).then(null, onReject);
};

/**
 * A wrapper around JSON.stringify to fail gracefully
 */
function stringify(data) {
  try {
    return JSON.stringify(data);
  }
  catch (ex) {
    console.error('Failed to JSON.stringify', data);
    util.errorHandler(ex);

    data = {
      code: -1,
      data: ex.toString()
    };
    return JSON.stringify(data);
  }
}
