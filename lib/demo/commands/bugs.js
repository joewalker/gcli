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

define(function(require, exports, module) {


var gcli = require('gcli/index');
var util = require('gcli/util');

var bugsHtml = require('text!demo/commands/bugs.html');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(bugzCommandSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(bugzCommandSpec);
};


/**
 * 'bugz' command.
 */
var bugzCommandSpec = {
  name: 'bugz',
  returnType: 'html',
  description: 'List the GCLI bugs open in Bugzilla',
  exec: function(args, context) {
    var deferred = context.defer();

    function onFailure(msg) {
      deferred.resolve(msg);
    }

    var query = 'short_desc=GCLI' +
      '&short_desc_type=allwords' +
      '&bug_status=UNCONFIRMED' +
      '&bug_status=NEW' +
      '&bug_status=ASSIGNED' +
      '&bug_status=REOPENED';

    queryBugzilla(query, function(json) {
      json.bugs.forEach(function(bug) {
        if (bug.target_milestone === '---') {
          bug.target_milestone = 'Future';
        }
      });
      json.bugs.sort(function(bug1, bug2) {
        var ms = bug1.target_milestone.localeCompare(bug2.target_milestone);
        if (ms !== 0) {
          return ms;
        }
        return bug1.priority.localeCompare(bug2.priority);
      });

      deferred.resolve(context.createView({
        html: bugsHtml,
        data: json
      }));
    }, onFailure);

    return deferred.promise;
  }
};

/**
 * Simple wrapper for querying bugzilla.
 * @see https://wiki.mozilla.org/Bugzilla:REST_API
 * @see https://wiki.mozilla.org/Bugzilla:REST_API:Search
 * @see http://www.bugzilla.org/docs/developer.html
 * @see https://harthur.wordpress.com/2011/03/31/bz-js/
 * @see https://github.com/harthur/bz.js
 */
function queryBugzilla(query, onSuccess, onFailure) {
  var url = 'https://api-dev.bugzilla.mozilla.org/0.9/bug?' + query;

  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.setRequestHeader('Accept', 'application/json');
  req.setRequestHeader('Content-type', 'application/json');
  req.onreadystatechange = function(event) {
    if (req.readyState == 4) {
      if (req.status >= 300 || req.status < 200) {
        onFailure('Error: ' + JSON.stringify(req));
        return;
      }

      var json;
      try {
        json = JSON.parse(req.responseText);
      }
      catch (ex) {
        onFailure('Invalid response: ' + ex + ': ' + req.responseText);
        return;
      }

      if (json.error) {
        onFailure('Error: ' + json.error.message);
        return;
      }

      onSuccess(json);
    }
  }.bind(this);
  req.send();
}


});
