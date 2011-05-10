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


var example = {
    metadata: {
        description: 'Commands for playing with the UI'
    },

    onestring: {
        description: 'Single string parameter',
        params: [
            { name: 'text', type: 'string', description: 'Demo param' }
        ]
    },
    onestring: function(text) {
        return 'text=' + text;
    },

    twostrings: {
        description: '2 string parameters',
        params: [
            { name: 'text1', type: 'string', description: 'First param' },
            { name: 'text2', type: 'string', description: 'Second param' }
        ]
    },
    twostrings: function(text1, text2) {
        return 'text1=\'' + text1 + '\', text2=\'' + text2 + '\'';
    }
};

exports.startup = function() {
    gcli.addCommands(example, 'example');
};

exports.shutdown = function() {
    gcli.removeCommands(example, 'example');
};


});
