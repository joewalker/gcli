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

var Promise = require('../../util/promise').Promise;

exports.items = [
  {
    item: 'converter',
    from: 'bugz',
    to: 'view',
    exec: function(bugz, context) {
      return {
        html:
          '<div>\n' +
          '  <p>\n' +
          '    Open GCLI meta-bugs\n' +
          '    (i.e. <a target="_blank" href="https://bugzilla.mozilla.org/buglist.cgi?list_id=2622790;short_desc=GCLI;resolution=---;resolution=DUPLICATE;query_format=advanced;bug_status=UNCONFIRMED;bug_status=NEW;bug_status=ASSIGNED;bug_status=REOPENED;short_desc_type=allwords">this search</a>):\n' +
          '  </p>\n' +
          '  <table>\n' +
          '    <thead>\n' +
          '      <tr>\n' +
          '        <th>ID</th>\n' +
          '        <th>Milestone</th>\n' +
          '        <th>Pri</th>\n' +
          '        <th>Summary</th>\n' +
          '      </tr>\n' +
          '    </thead>\n' +
          '    <tbody>\n' +
          '      <tr foreach="bug in ${bugs}">\n' +
          '        <td><a target="_blank" href="https://bugzilla.mozilla.org/show_bug.cgi?id=${bug.id}">${bug.id}</a></td>\n' +
          '        <td>${bug.target_milestone}</td>\n' +
          '        <td>${bug.priority}</td>\n' +
          '        <td>${bug.summary}</td>\n' +
          '      </tr>\n' +
          '    </tbody>\n' +
          '  </table>\n' +
          '</div>',
        data: bugz
      };
    }
  },
  {
    item: 'command',
    name: 'bugz',
    returnType: 'bugz',
    description: 'List the GCLI bugs open in Bugzilla',
    exec: function(args, context) {
      return queryBugzilla(args, context).then(filterReply);
    }
  }
];

/**
 * Simple wrapper for querying bugzilla.
 * @see https://wiki.mozilla.org/Bugzilla:REST_API
 * @see https://wiki.mozilla.org/Bugzilla:REST_API:Search
 * @see http://www.bugzilla.org/docs/developer.html
 * @see https://harthur.wordpress.com/2011/03/31/bz-js/
 * @see https://github.com/harthur/bz.js
 */
function queryBugzilla(args, context) {
  return new Promise(function(resolve, reject) {
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
          reject('Error: ' + JSON.stringify(req));
          return;
        }

        try {
          var json = JSON.parse(req.responseText);
          if (json.error) {
            reject('Error: ' + json.error.message);
          }
          else {
            resolve(json);
          }
        }
        catch (ex) {
          reject('Invalid response: ' + ex + ': ' + req.responseText);
        }
      }
    };
    req.send();
  }.bind(this));
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
