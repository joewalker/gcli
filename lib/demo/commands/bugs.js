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
 * @see https://wiki.mozilla.org/Bugzilla:REST_API
 * @see https://wiki.mozilla.org/Bugzilla:REST_API:Search
 * @see http://www.bugzilla.org/docs/developer.html
 * @see https://harthur.wordpress.com/2011/03/31/bz-js/
 * @see https://github.com/harthur/bz.js
 */
var bugzCommandSpec = {
    name: 'bugz',
    returnType: 'html',
    description: 'List the bugs open in Bugzilla',
    exec: function(env, args) {
        var promise = gcli.createPromise();
        var url = 'https://api-dev.bugzilla.mozilla.org/0.9/bug' +
            '?short_desc=gcli' +
            '&short_desc_type=allwordssubstr' +
            '&bug_status=UNCONFIRMED' +
            '&bug_status=NEW' +
            '&bug_status=ASSIGNED' +
            '&bug_status=REOPENED' +
            '&component=Developer%20Tools';

        var req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.setRequestHeader('Accept', 'application/json');
        req.setRequestHeader('Content-type', 'application/json');
        req.onreadystatechange = function(event) {
            if (req.readyState == 4) {
                if (req.status >= 300 || req.status < 200) {
                    promise.resolve('Error: ' + JSON.stringify(req));
                    return;
                }

                var json;
                try {
                    json = JSON.parse(req.responseText);
                }
                catch (ex) {
                    promise.resolve('Invalid JSON response: ' + ex + ': ' +
                        req.responseText);
                    return;
                }

                if (json.error) {
                    promise.resolve('Error: ' + json.error.message);
                    return;
                }

                var reply = '<p>Open devtools bugs with \'gcli\' in the summary ' +
                    '(i.e. <a href="https://bugzilla.mozilla.org/buglist.cgi?list_id=170394&short_desc=gcli&query_format=advanced&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED&short_desc_type=allwordssubstr&component=Developer%20Tools">this search</a>):' +
                    '<ul>';
                json.bugs.forEach(function(bug) {
                    reply += '<li>' +
                        '<a href="https://bugzilla.mozilla.org/show_bug.cgi?id=' + bug.id + '"' +
                        ' target="_blank">' + bug.id + '</a>: ' +
                        escapeHtml(bug.summary) +
                        '</li>';
                });
                reply += '</ul>';
                promise.resolve(reply);
            }
        }.bind(this);
        req.send();

        return promise;
    }
};

function escapeHtml(original) {
    return original.replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#039;');
};

var gcli = require('gcli/index');

exports.startup = function() {
    gcli.addCommand(bugzCommandSpec);
};

exports.shutdown = function() {
    gcli.removeCommand(bugzCommandSpec);
};


});
