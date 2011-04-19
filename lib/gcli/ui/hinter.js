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

var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var Menu = require('gcli/ui/menu').Menu;

var hinterCss = require('text!gcli/ui/hinter.css');

/**
 * We only want to import hinterCss once so this tracks whether or not we have
 * done it. Note technically it's only once per document, so perhaps we should
 * have a list of documents into which we've imported the CSS?
 */
var hinterCssImported = false;

/**
 * A container to show either an ArgFetcher or a Menu depending on the state
 * of the requisition.
 */
function Hinter(options) {
    options = options || {};

    this.doc = options.document;
    this.requ = options.requisition;

    if (!hinterCssImported) {
        dom.importCssString(hinterCss, this.doc);
        hinterCssImported = true;
    }

    this.element = dom.createElement('div', null, this.doc);
    this.element.className = 'gcliHintParent';

    this.hinter = dom.createElement('div', null, this.doc);
    this.hinter.className = 'gcliHints';
    this.element.appendChild(this.hinter);

    this.menu = options.menu || new Menu(this.doc, this.requ);
    this.hinter.appendChild(this.menu.element);

    this.argFetcher = options.argFetcher || new ArgFetcher(this.doc, this.requ);
    this.hinter.appendChild(this.argFetcher.element);

    this.onCommandChange = this.onCommandChange.bind(this);
    this.requ.addEventListener('commandChange', this.onCommandChange);

    this.onCommandChange();
}

Hinter.prototype.setHeight = function(height) {
    this.element.style.maxHeight = height + 'px';
};

/**
 * Update the hint to reflect the changed command
 */
Hinter.prototype.onCommandChange = function(ev) {
    if (!this.requ.commandAssignment.getValue()) {
        this.menu.show();
        this.argFetcher.hide();
    }
    else {
        if (ev && ev.oldValue === ev.newValue) {
            return; // Just the text has changed
        }

        this.argFetcher.completeRequisition();
        this.menu.hide();
    }
};

cliView.Hinter = Hinter;


});
