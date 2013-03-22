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

'use strict';

var gcli = require('gcli/index');

var bugsHtml = require('text!demo/commands/bugs.html');

/**
 * 'bugz' -> 'view' converter
 */
var bugzConverterSpec = {
  from: 'bugz',
  to: 'view',
  exec: function(bugz, context) {
    return context.createView({ html: bugsHtml, data: bugz });
  }
};

/**
 * 'bugz' command.
 */
var bugzCommandSpec = {
  name: 'bugz',
  returnType: 'bugz',
  description: 'List the GCLI bugs open in Bugzilla',
  exec: function(args, context) {
    return queryBugzilla(args, context).then(filterReply);
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
function queryBugzilla(args, context) {
  var deferred = context.defer();

  var url = 'https://api-dev.bugzilla.mozilla.org/1.1/bug?' +
      'short_desc=GCLI' +
      '&short_desc_type=allwords' +
      '&bug_status=UNCONFIRMED' +
      '&bug_status=NEW' +
      '&bug_status=ASSIGNED' +
      '&bug_status=REOPENED';

  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.setRequestHeader('Accept', 'application/json');
  req.setRequestHeader('Content-type', 'application/json');
  req.onreadystatechange = function(event) {
    if (req.readyState == 4) {
      if (req.status >= 300 || req.status < 200) {
        deferred.reject('Error: ' + JSON.stringify(req));
        return;
      }

      try {
        var json = JSON.parse(req.responseText);
        if (json.error) {
          deferred.reject('Error: ' + json.error.message);
        }
        else {
          deferred.resolve(json);
        }
      }
      catch (ex) {
        deferred.reject('Invalid response: ' + ex + ': ' + req.responseText);
      }
    }
  }.bind(this);
  req.send();

  return deferred.promise;
}

/**
 * Filter the output from Bugzilla for display
 */
function filterReply(json) {
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

  return json;
}

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(bugzCommandSpec);
  gcli.addConverter(bugzConverterSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(bugzCommandSpec);
  gcli.removeConverter(bugzConverterSpec);
};


});
