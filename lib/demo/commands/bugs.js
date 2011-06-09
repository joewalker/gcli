/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Skywriter.
 *
 * The Initial Developer of the Original Code is
 * Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Joe Walker (jwalker@mozilla.com) (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {


var gcli = require('gcli/index');

/**
 * 'bugz' command.
 */
var bugzCommandSpec = {
    name: 'bugz',
    returnType: 'html',
    description: 'List the bugs open in Bugzilla',
    exec: function(args, env) {
        var promise = gcli.createPromise();

        function onFailure(msg) {
            promise.resolve(msg);
        }

        var query = 'status_whiteboard=[GCLI-META]' +
            '&bug_status=UNCONFIRMED' +
            '&bug_status=NEW' +
            '&bug_status=ASSIGNED' +
            '&bug_status=REOPENED';

        queryBugzilla(query, function(json) {
            json.bugs.sort(function(bug1, bug2) {
                return bug1.priority.localeCompare(bug2.priority);
            });

            var doc = gcli.getDocument();
            var div = doc.createElement('div');

            var p = doc.createElement('p');
            p.appendChild(doc.createTextNode('Open GCLI meta-bugs (i.e. '));
            var a = doc.createElement('a');
            a.setAttribute('target', '_blank');
            a.setAttribute('href', 'https://bugzilla.mozilla.org/buglist.cgi?list_id=459033&status_whiteboard_type=allwordssubstr&query_format=advanced&status_whiteboard=[GCLI-META]&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED');
            a.appendChild(doc.createTextNode('this search'));
            p.appendChild(a);
            p.appendChild(doc.createTextNode('):'));
            div.appendChild(p);

            var ul = doc.createElement('ul');
            json.bugs.forEach(function(bug) {
                var li = liFromBug(doc, bug);

                // This is the spinner graphic
                var img = doc.createElement('img');
                img.setAttribute('src', 'data:image/gif;base64,R0lGODlhEAAQA' +
                    'PMAAP///wAAAAAAAIKCgnJycqioqLy8vM7Ozt7e3pSUlOjo6GhoaAAA' +
                    'AAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHd' +
                    'pdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAAEKxDISa' +
                    'u9OE/Bu//cQBTGgWDhWJ5XSpqoIL6s5a7xjLeyCvOgIEdDLBqPlAgAI' +
                    'fkECQoAAAAsAAAAABAAEAAABCsQyEmrvThPwbv/XJEMxIFg4VieV0qa' +
                    'qCC+rOWu8Yy3sgrzoCBHQywaj5QIACH5BAkKAAAALAAAAAAQABAAAAQ' +
                    'rEMhJq704T8G7/9xhFMlAYOFYnldKmqggvqzlrvGMt7IK86AgR0MsGo' +
                    '+UCAAh+QQJCgAAACwAAAAAEAAQAAAEMRDISau9OE/Bu/+cghxGkQyEF' +
                    'Y7lmVYraaKqIMpufbc0bLOzFyXGE25AyI5myWw6KREAIfkECQoAAAAs' +
                    'AAAAABAAEAAABDYQyEmrvThPwbv/nKQgh1EkA0GFwFie6SqIpImq29z' +
                    'WMC6xLlssR3vdZEWhDwBqejTQqHRKiQAAIfkECQoAAAAsAAAAABAAEA' +
                    'AABDYQyEmrvThPwbv/HKUgh1EkAyGF01ie6SqIpImqACu5dpzPrRoMp' +
                    'wPwhjLa6yYDOYuaqHRKjQAAIfkECQoAAAAsAAAAABAAEAAABDEQyEmr' +
                    'vThPwbv/nKUgh1EkAxFWY3mmK9WaqCqIJA3fbP7aOFctNpn9QEiPZsl' +
                    'sOikRACH5BAkKAAAALAAAAAAQABAAAAQrEMhJq704T8G7/xymIIexEO' +
                    'E1lmdqrSYqiGTsVnA7q7VOszKQ8KYpGo/ICAAh+QQJCgAAACwAAAAAE' +
                    'AAQAAAEJhDISau9OE/Bu/+cthBDEmZjeWKpKYikC6svGq9XC+6e5v/A' +
                    'ICUCACH5BAkKAAAALAAAAAAQABAAAAQrEMhJq704T8G7/xy2EENSGOE' +
                    '1lmdqrSYqiGTsVnA7q7VOszKQ8KYpGo/ICAAh+QQJCgAAACwAAAAAEA' +
                    'AQAAAEMRDISau9OE/Bu/+ctRBDUhgHElZjeaYr1ZqoKogkDd9s/to4V' +
                    'y02mf1ASI9myWw6KREAIfkECQoAAAAsAAAAABAAEAAABDYQyEmrvThP' +
                    'wbv/HLUQQ1IYByKF01ie6SqIpImqACu5dpzPrRoMpwPwhjLa6yYDOYu' +
                    'aqHRKjQAAIfkECQoAAAAsAAAAABAAEAAABDYQyEmrvThPwbv/nLQQQ1' +
                    'IYB0KFwFie6SqIpImq29zWMC6xLlssR3vdZEWhDwBqejTQqHRKiQAAI' +
                    'fkECQoAAAAsAAAAABAAEAAABDEQyEmrvThPwbv/3EIMSWEciBWO5ZlW' +
                    'K2miqiDKbn23NGyzsxclxhNuQMiOZslsOikRADsAAAAAAAAAAAA=');
                li.appendChild(img);

                queryBugzilla('blocked=' + bug.id, function(json) {
                    var subul = doc.createElement('ul');
                    json.bugs.forEach(function(bug) {
                        subul.appendChild(liFromBug(doc, bug));
                    });
                    li.appendChild(subul);
                    li.removeChild(img);
                }, onFailure);

                ul.appendChild(li);
            });
            div.appendChild(ul);

            promise.resolve(div);
        }, onFailure);

        return promise;
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
};

/**
 * Create an <li> element from the given bug object
 */
function liFromBug(doc, bug) {
    var done = [ 'RESOLVED', 'VERIFIED', 'CLOSED' ].indexOf(bug.status) !== -1;
    var li = doc.createElement('li');
    if (done) {
        li.setAttribute('style', 'text-decoration: line-through; color: grey;');
    }
    var a = doc.createElement('a');
    a.setAttribute('target', '_blank');
    a.setAttribute('href', 'https://bugzilla.mozilla.org/show_bug.cgi?id=' + bug.id);
    a.appendChild(doc.createTextNode(bug.id));
    li.appendChild(a);
    li.appendChild(doc.createTextNode(' ' + bug.summary + ' '));
    return li;
}


var gcli = require('gcli/index');

exports.startup = function() {
    gcli.addCommand(bugzCommandSpec);
};

exports.shutdown = function() {
    gcli.removeCommand(bugzCommandSpec);
};


});
