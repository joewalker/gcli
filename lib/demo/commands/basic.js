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


/**
 * 'eval' command
 */
var evalCommandSpec = {
    name: 'eval',
    params: [
        {
            name: 'javascript',
            type: 'string',
            description: 'Script to evaluate'
        }
    ],
    returnType: 'html',
    description: 'Call \'eval\' on some JavaScript',
    exec: function(env, args) {
        var resultPrefix = 'Result for <em>\'' + args.javascript + '\'</em>: ';
        try {
            var result = eval(args.javascript);

            if (result === null) {
                return resultPrefix + 'null.';
            }

            if (result === undefined) {
                return resultPrefix + 'undefined.';
            }

            if (typeof result === 'function') {
                return resultPrefix +
                    (result + '').replace(/\n/g, '<br>').replace(/ /g, '&#160');
            }

            return resultPrefix + result;
        } catch (e) {
            return '<b>Error</b>: ' + e.message;
        }
    }
};

/**
 * Arm window.alert with metadata
 */
window.alert.metadata = {
    name: 'alert',
    context: window,
    description: 'Show an alert dialog',
    params: [
        {
            name: 'message',
            type: 'string',
            description: 'Message to display'
        }
    ]
};

/**
 * 'echo' command
 */
echo.metadata = {
    name: 'echo',
    description: 'Show a message',
    params: [
        {
            name: 'message',
            type: 'string',
            description: 'Message to output'
        }
    ],
    returnType: 'string'
};
function echo(message) {
    return message;
}


var gcli = require('gcli/index');

exports.startup = function() {
    gcli.addCommand(evalCommandSpec);
    gcli.addCommand(echo);
    gcli.addCommand(window.alert);
};

exports.shutdown = function() {
    gcli.removeCommand(evalCommandSpec);
    gcli.removeCommand(echo);
    gcli.removeCommand(window.alert);
};


});
