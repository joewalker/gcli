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

var t = require('test/assert');


exports.testWorking = function() {
    // There are lots of requirement tests that we could be doing here
    // The fact that we can get anything at all working is a testament to
    // require doing what it should - we don't need to test the
    var requireable = require('gclitest/requirable');
    t.verifyEqual('thing1', requireable.thing1);
    t.verifyEqual(2, requireable.thing2);
    t.verifyUndefined(requireable.thing3);
};

exports.testLeakage = function() {
    var requireable = require('gclitest/requirable');
    t.verifyUndefined(requireable.setup);
    t.verifyUndefined(requireable.shutdown);
    t.verifyUndefined(requireable.testWorking);
};

exports.testMultiImport = function() {
    var r1 = require('gclitest/requirable');
    var r2 = require('gclitest/requirable');
    t.verifyTrue(r1 === r2);
};

exports.testUncompilable = function() {
    /*
    // This test is commented out because it breaks the RequireJS module
    // loader ...
    // It's not totally clear how a module loader should perform with unusable
    // modules, however at least it should go into a flat spin ...
    // GCLI mini_require reports an error as it should
    try {
        var unrequireable = require('gclitest/unrequirable');
        fail();
    }
    catch (ex) {
        console.log(ex);
    }
    */
};

exports.testRecursive = function() {
    // See Bug 658583
    /*
    var recurse = require('gclitest/recurse');
    */
};


});
