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
var cliView = exports;


var event = require('pilot/event');
var dom = require('pilot/dom');
var console = require('pilot/console');

var Conversion = require('gcli/types').Conversion;
var Argument = require('gcli/argument').Argument;

var Templater = require('gcli/ui/domtemplate').Templater;

var menuCss = require('text!gcli/ui/menu.css');
var menuHtml = require('text!gcli/ui/menu.html');


/**
 * Menu is a display of the commands that are possible given the state of a
 * requisition.
 */
function Menu(doc, requ) {
    this.doc = doc;
    this.requ = requ;

    this.element =  dom.createElement('div', null, this.doc);
    this.element.className = 'gcliMenu';
    this.tmpl = new Templater();

    // Pull the HTML into the DOM, but don't add it to the document
    if (!Menu.optTempl) {
        dom.importCssString(menuCss, this.doc);

        var templates = dom.createElement('div', null, this.doc);
        dom.setInnerHtml(templates, menuHtml);
        Menu.optTempl = templates.querySelector('#gcliOptTempl');
    }
}

Menu.prototype.hide = function() {
    this.element.style.display = 'none';
};

Menu.prototype.show = function() {
    var predictions = this.requ.commandAssignment.getPredictions();
    var items = [];
    predictions.forEach(function(command) {
        if (command.description && !command.hidden) {
            items.push({
                name: command.name,
                description: command.description,
                click: function() {
                    var type = this.requ.commandAssignment.param.type;
                    var text = type.stringify(command);
                    var arg = new Argument(text);
                    var conversion = new Conversion(command, arg);
                    this.requ.commandAssignment.setConversion(conversion);
                }.bind(this)
            });
        }
    }, this);
    var options = Menu.optTempl.cloneNode(true);
    this.tmpl.processNode(options, { items: items });

    dom.clearElement(this.element);
    this.element.appendChild(options);

    this.element.style.display = 'block';
};

cliView.Menu = Menu;


});
