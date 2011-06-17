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
 * The Original Code is Mozilla Skywriter.
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
var gcli = exports;


var ui = require('gcli/ui/index');
var canon = require('gcli/canon');
var cli = require('gcli/cli');
var Promise = require('gcli/promise').Promise;


gcli.createView = createStartupChecker(ui.createView);

gcli.addCommand = createStartupChecker(canon.addCommand);
gcli.removeCommand = createStartupChecker(canon.removeCommand);

gcli.createRequisition = createStartupChecker(function createRequisition() {
  return new cli.Requisition();
});

gcli.createPromise = createStartupChecker(function createPromise() {
    return new Promise();
});

// createStartupChecker is not required here because this function is only
// available from within a command execution.
gcli.getEnvironment = cli.getEnvironment;

/*
 * We would like a better defined API with minimal surface area.
 */
gcli.ui = ui;

/**
 * Not all environments have easy access to the current document, or we might
 * wish to work in the non-default document.
 */
gcli.getDocument = function() {
    return doc;
};

var doc = undefined;
var started = false;

function createStartupChecker(func) {
    return function() {
        if (!started) {
            gcli.startup();
        }
        return func.apply(null, arguments);
    };
}

gcli.startup = function(options) {
    doc = (options && options.document) ? options.document : document;
    started = true;

    require('gcli/types').startup();
    require('gcli/commands/help').startup();
    require('gcli/cli').startup();
};

gcli.shutdown = function() {
    doc = undefined;
    started = false;

    require('gcli/cli').shutdown();
    require('gcli/commands/help').shutdown();
    require('gcli/types').shutdown();
};


});
