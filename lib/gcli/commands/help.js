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
var basic = exports;


// This API is NOT public it may change without warning in the future.
var canon = require('gcli/canon');

/**
 * We export a way to customize the help message with some HTML text
 */
basic.helpMessages = {
    prefix: null,
    suffix: null
};

/**
 * 'help' command
 */
var helpCommandSpec = {
    name: 'help',
    params: [
        {
            name: 'search',
            type: 'string',
            description: 'Search string',
            defaultValue: null
        },
        {
            group: 'Options',
            params: [
                {
                    name: 'hidden',
                    type: 'boolean',
                    description: 'Include hidden'
                }
            ]
        }
    ],
    returnType: 'html',
    description: 'Get help on the available commands',
    exec: function(args, context) {
        var output = [];

        var command = canon.getCommand(args.search);
        if (command && command.exec) {
            // caught a real command
            output.push(command.description ?
                    command.description :
                    'No description for ' + args.search);
        } else {
            if (!args.search && basic.helpMessages.prefix) {
                output.push(basic.helpMessages.prefix);
            }

            if (command) {
                // We must be looking at sub-commands
                output.push('<h2>Sub-Commands of ' + command.name + '</h2>');
                output.push('<p>' + command.description + '</p>');
            }
            else if (args.search) {
                output.push('<h2>Commands starting with \'' + args.search + '\':</h2>');
            }
            else {
                output.push('<h2>Available Commands:</h2>');
            }

            var commandNames = canon.getCommandNames();
            commandNames.sort();

            output.push('<table>');
            for (var i = 0; i < commandNames.length; i++) {
                command = canon.getCommand(commandNames[i]);
                if (!args.hidden && command.hidden) {
                    continue;
                }
                if (command.description === undefined) {
                    // Ignore editor actions
                    continue;
                }
                if (args.search && command.name.indexOf(args.search) !== 0) {
                    // Filtered out by the user
                    continue;
                }
                if (!args.search && command.name.indexOf(' ') != -1) {
                    // sub command
                    continue;
                }
                if (command && command.name == args.search) {
                    // sub command, and we've already given that help
                    continue;
                }

                // todo add back a column with parameter information, perhaps?

                output.push('<tr>');
                output.push('<th class="right">' + command.name + '</th>');
                output.push('<td>' + command.description + '</td>');
                output.push('</tr>');
            }
            output.push('</table>');

            if (!args.search && basic.helpMessages.suffix) {
                output.push(basic.helpMessages.suffix);
            }
        }

        return output.join('');
    }
};


var canon = require('gcli/canon');

basic.startup = function() {
    canon.addCommand(helpCommandSpec);
};

basic.shutdown = function() {
    canon.removeCommand(helpCommandSpec);
};


});
