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
 *      Julian Viereck (julian.viereck@gmail.com) (original author)
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

var commands = require('gclitest/commands');
var Requisition = require('gcli/cli').Requisition;

exports.setup = function() {
    commands.setup();
};

exports.shutdown = function() {
    commands.shutdown();
};

// testing 'git commit'. Mainly the handling of cli <-> fields.
exports.testGitCommit = function() {
    var inputter = gcliUI.inputter;
    var inputterElement = inputter.element;
    var argFetcher = gcliUI.children[0].argFetcher;

    var fieldValue = {
        file:       "[  ]",
        message:    " 'hello world'",
        signoff:    " ''",
        all:        "",
        quiet:      ""
    }
    function testFields() {
        for (name in fieldValue) {
            var field = argFetcher.getInputForName(name);
            t.verifyEqual(fieldValue[name], field.getConversion().toString())
        }
    }

    inputter.setInput("git commit -m 'hello world'");
    testFields();

    inputter.setInput("git commit -qm 'hello world'");
    fieldValue.quiet = " --quiet";
    testFields();

    inputter.setInput("git commit -am 'hello world'");
    fieldValue.quiet = "";
    fieldValue.all   = " --all";
    testFields();

    // Change the 'message' field.
    var fieldMessage = argFetcher.getInputForName("message");
    fieldMessage.element.value = "hello";
    fieldMessage.onInputChange();
    fieldValue.message = " hello";
    testFields();
    t.verifyEqual("git commit -am hello", inputterElement.value);

    // Change the 'all' field. Should remove the 'a' from the '-am'.
    var fieldAll = argFetcher.getInputForName("all");
    fieldAll.element.checked = false;
    fieldAll.onInputChange();
    fieldValue.all = "";
    testFields();
    t.verifyEqual("git commit -m hello", inputterElement.value);

    // Turn the 'all' field back on.
    fieldAll.element.checked = true;
    fieldAll.onInputChange();
    fieldValue.all = " --all";
    testFields();
    t.verifyEqual("git commit -m hello --all", inputterElement.value);

    // Turn the 'all' field back on.
    inputter.setInput("git commit -m hello --all --signof");
    fieldValue.file = "[  --signof ]";
    testFields();

    // Complete adding the "signoff" param should reset the file field.
    inputter.setInput("git commit -m hello --all --signoff");
    fieldValue.file = "[  ]";
    testFields();

    // Add arg to signoff param.
    inputter.setInput("git commit -m hello --all --signoff foo");
    fieldValue.signoff = " foo";
    testFields();

    // Remove the signoff param again.
    inputter.setInput("git commit -m hello --all");
    // TODO: FIX this to be "".
    fieldValue.signoff = " ''";
    testFields();

    // Short param reading the next two args (the one for 'message' and
    // the one for 'signoff').
    // NOTE: Currenlty, the args after a short param are assigned based on
    // the param define order in the command. In this case 'message' is
    // defined before 'signoff'.
    inputter.setInput("git commit -ms hello foo --all");
    fieldValue.signoff = " foo";
    testFields();

    // This is still the same, although it's now '-sm' instead of '-ms'.
    // See note above.
    inputter.setInput("git commit -sm hello foo --all");
    testFields();

    // Testing fields -> cli for signoff.
    var fieldSignoff = argFetcher.getInputForName("signoff");
    fieldSignoff.element.value = "foo bar";
    fieldSignoff.onInputChange();
    fieldValue.signoff = " 'foo bar'";
    testFields();

    // Testing fields -> cli for message.
    var fieldMessage = argFetcher.getInputForName("message");
    fieldMessage.element.value = "hello world";
    fieldMessage.onInputChange();
    fieldValue.message = " 'hello world'";
    testFields();

    // Test cli -> fields for files at 'strange' position.
    inputter.setInput("git commit -sm 'hello world' 'foo bar' file1 --all file2");
    fieldValue.file = "[  file1,  file2 ]";
    testFields();

    // Test fields -> cli for changing files.
    var fieldFile = argFetcher.getInputForName("file");
    fieldFile.element.querySelector("input").value = "file3";
    fieldFile.onInputChange();
    fieldValue.file = "[  file3,  file2 ]";
    testFields();
    t.verifyEqual("git commit -sm 'hello world' 'foo bar' file3 file2 --all", inputterElement.value);

    // Test matching of named parameter if and only if it matches.
    inputter.setInput("git commit -sm 'hello world' 'foo bar' file3 file2 --allb");
    fieldValue.file = "[  file3,  file2,  --allb ]";
    fieldValue.all = "";
    testFields();

    // Cleanup.
    inputter.setInput("");
}

});
