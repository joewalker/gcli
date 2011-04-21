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
 *      Julian Viereck (julian.viereck@gmail.com)
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
var ui = exports;


var event = require('pilot/event');
var dom = require('pilot/dom');
var console = require('pilot/console');

var Requisition = require('gcli/cli').Requisition;

ui.RequestsView = require('gcli/ui/request_view').RequestsView;
ui.Popup = require('gcli/ui/popup').Popup;
ui.Inputter = require('gcli/ui/inputter').Inputter;
ui.Hinter = require('gcli/ui/hinter').Hinter;

ui.ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
ui.Menu = require('gcli/ui/menu').Menu;
ui.Templater = require('gcli/ui/domtemplate').Templater;


/**
 * A class to handle the simplest UI implementation
 */
function createView(options) {
    try {
        options = options || {};

        // The requisition depends on no UI components
        if (options.requisition == null) {
            options.requisition = new Requisition(options.env);
        }
        else if (typeof options.requisition === 'function') {
            options.requisition = new options.requisition(options);
        }

        // The inputter should depend only on the requisition
        if (options.inputter == null) {
            options.inputter = new ui.Inputter(options);
        }
        else if (typeof options.inputter === 'function') {
            options.inputter = new options.inputter(options);
        }

        // We need to init the popup children before the Popup itself
        if (options.children == null) {
            options.children = [
                new ui.Hinter(options),
                new ui.RequestsView(options)
            ];
        }
        else {
            for (var i = 0; i < options.children.length; i++) {
                if (typeof options.children[i] === 'function') {
                    options.children[i] = new options.children[i](options);
                }
            }
        }

        // The Popup has most dependencies
        if (options.popup == null) {
            options.popup = new ui.Popup(options);
        }
        else if (typeof options.popup === 'function') {
            options.popup = new options.popup(options);
        }

        options.inputter.update();
    }
    catch (ex) {
        console.error("GCLI startup error", ex);
        throw ex;
    }
}

ui.createView = createView;


});
