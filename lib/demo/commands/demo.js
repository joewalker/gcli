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
 * Parent Command
 */
var gcliTop = {
    name: 'gcli',
    description: 'Commands for playing with the UI'
};


/**
 * 'gcli onestring' command
 */
var gcliOnestring = {
    name: 'gcli onestring',
    description: 'Single string parameter',
    params: [
        { name: 'text', type: 'string', description: 'Demo param' }
    ],
    returnType: 'html',
    exec: function(text) {
        return motivate() + 'text=' + text;
    }
};

/**
 * 'gcli twostrings' command
 */
var gcliTwostrings = {
    name: 'gcli twostrings',
    description: '2 string parameters',
    params: [
        { name: 'p1', type: 'string', description: 'First param' },
        { name: 'p2', type: 'string', description: 'Second param' }
    ],
    returnType: 'html',
    exec: function(args, env) {
        return motivate() +
            'p1=\'' + args.p1 + '\', p2=\'' + args.p2 + '\'';
    }
};

/**
 * 'gcli twonums' command
 */
var gcliTwonums = {
    name: 'gcli twonums',
    description: '2 numeric parameters',
    params: [
        {
          name: 'p1',
          type: { name: 'number', min: 0, max: 10 },
          description: 'First param'
        },
        {
          name: 'p2',
          type: { name: 'number', min: -20, max: 42, step: 5 },
          description: 'Second param'
        }
    ],
    returnType: 'html',
    exec: function(args, env) {
        return motivate() +
            'p1=' + args.p1 + ', p2=' + args.p2;
    }
};

/**
 * 'gcli selboolnum' command
 */
var gcliSelboolnum = {
    name: 'gcli selboolnum',
    description: 'A selection, a boolean and a number',
    params: [
        {
            name: 'p1',
            type: {
                name: 'selection',
                lookup: {
                    'firefox': 4,
                    'chrome': 12,
                    'ie': 9,
                    'opera': 10,
                    'safari': 5
                }
            },
            description: 'First param'
        },
        {
          name: 'p2',
          type: { name: 'number', min: -4, max: 42, step: 5 },
          description: 'Third param'
        },
        {
            name: 'p3',
            type: 'boolean',
            description: 'Second param'
        }
    ],
    returnType: 'html',
    exec: function(args, env) {
        return motivate() +
            'p1=' + args.p1 + ', p2=' + args.p2 + ', p3=' + args.p3;
    }
};


var messages = [
    'GCLI wants you to trick it out in some way.</br>',
    'GCLI is your web command line.</br>',
    'GCLI would love to be like Zsh on the Web.</br>',
    'GCLI is written on the Web platform, so you can tweak it.</br>'
];
function motivate() {
    var index = Math.floor(Math.random() * messages.length);
    return messages[index];
}


exports.startup = function() {
    gcli.addCommand(gcliTop);
    gcli.addCommand(gcliOnestring);
    gcli.addCommand(gcliTwostrings);
    gcli.addCommand(gcliTwonums);
    gcli.addCommand(gcliSelboolnum);
};

exports.shutdown = function() {
    gcli.removeCommand(gcliTop);
    gcli.removeCommand(gcliOnestring);
    gcli.removeCommand(gcliTwostrings);
    gcli.removeCommand(gcliTwonums);
    gcli.removeCommand(gcliSelboolnum);
};


});
