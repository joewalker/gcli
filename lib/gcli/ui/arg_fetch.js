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
var argFetch = exports;


var dom = require('pilot/dom');
var field = require('gcli/ui/field');
var Templater = require('gcli/ui/domtemplate').Templater;

var editorCss = require('text!gcli/ui/arg_fetch.css');
var argFetchHtml = require('text!gcli/ui/arg_fetch.html');


/**
 *
 */
function ArgFetcher(doc, requ) {
    this.doc = doc;
    this.requ = requ;

    // FF can be really hard to debug if doc is null, so we check early on
    if (!this.doc) {
        throw new Error('No document');
    }

    this.element =  dom.createElement('div', null, this.doc);
    this.element.className = 'gcliCliEle';
    // We cache the fields we create so we can destroy them later
    this.fields = [];

    this.tmpl = new Templater();

    // Pull the HTML into the DOM, but don't add it to the document
    if (!ArgFetcher.reqTempl) {
        dom.importCssString(editorCss, this.doc);

        var templates = dom.createElement('div', null, this.doc);
        dom.setInnerHtml(templates, argFetchHtml);
        ArgFetcher.reqTempl = templates.querySelector('#gcliReqTempl');
    }
}

/**
 *
 */
ArgFetcher.prototype.hide = function() {
    this.element.style.display = 'none';
};

/**
 *
 */
ArgFetcher.prototype.completeRequisition = function() {
    this.fields.forEach(function(field) { field.destroy(); });
    this.fields = [];

    var reqEle = ArgFetcher.reqTempl.cloneNode(true);
    this.tmpl.processNode(reqEle, this);
    dom.clearElement(this.element);
    this.element.appendChild(reqEle);
    this.element.style.display = 'block';
};

/**
 * Called by the template process in #onCommandChange() to get an instance
 * of field for each assignment.
 */
ArgFetcher.prototype.getInputFor = function(assignment) {
    var newField = field.getField(this.doc,
            assignment.param.type,
            !assignment.param.isPositionalAllowed(),
            assignment.param.name,
            this.requ);

    // TODO remove on delete
    newField.addEventListener('change', function(ev) {
        assignment.setConversion(ev.conversion);
    });
    assignment.addEventListener('assignmentChange', function(ev) {
        // Don't report an event if the value is unchanged
        if (ev.oldConversion != null &&
                ev.conversion.valueEquals(ev.oldConversion)) {
            return;
        }

        newField.setConversion(ev.conversion);
    });

    this.fields.push(newField);
    newField.setConversion(this.assignment.conversion);

    // HACK: we add the field as a property of the assignment so that
    // #linkMessageElement() can tell the field how to report errors.
    assignment.field = newField;

    return newField.element;
};

/**
 * Called by the template to setup an mutable message field
 */
ArgFetcher.prototype.linkMessageElement = function(assignment, element) {
    // HACK: See #getInputFor()
    var field = assignment.field;
    if (field == null) {
        console.error('Missing field for ' + JSON.stringify(assignment));
        return 'Missing field';
    }
    field.setMessageElement(element);
    return '';
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onFormOk = function(ev) {
    this.requ.exec();
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onFormCancel = function(ev) {
    this.requ.clear();
};

/**
 * Event handler added by the template menu.html
 */
ArgFetcher.prototype.onGroupToggle = function(ev) {
    var group = ev.target.parentNode.parentNode;
    dom.toggleCssClass(group, 'gcliGroupHidden');
};

argFetch.ArgFetcher = ArgFetcher;


});
