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
var requestView = exports;


var dom = require("pilot/dom");
var event = require("pilot/event");

var canon = require('gcli/canon');
var Templater = require("gcli/ui/domtemplate").Templater;

var requestViewCss = require("text!gcli/ui/request_view.css");
var requestViewHtml = require('text!gcli/ui/request_view.html');


/**
 * Work out the path for images.
 * TODO: This should probably live in some utility area somewhere
 */
function imageUrl(path) {
    try {
        return require('text!gcli/ui/' + path);
    }
    catch (ex) {
        var filename = module.id.split('/').pop() + '.js';
        var imagePath;

        if (module.uri.substr(-filename.length) !== filename) {
            console.error('Can\'t work out path from module.uri/module.id');
            return path;
        }

        if (module.uri) {
            var end = module.uri.length - filename.length - 1;
            return module.uri.substr(0, end) + '/' + path;
        }

        return filename + '/' + path;
    }
}


/**
 * A wrapper for a set of rows|command outputs.
 * Register with the canon to be notified of new requests
 */
function RequestsView(options) {
    this.doc = options.document;
    this.inputter = options.inputter;
    this.requ = options.requisition;
    this.reportList = options.reportList || canon.globalReportList;

    this.element = options.requestElement || 'gcliReports';
    if (typeof this.element === 'string') {
        var name = this.element;
        this.element = this.doc.getElementById(name);

        if (!this.element) {
            this.autoHide = true;

            this.element = dom.createElement('div', null, this.doc);
        }
    }

    dom.addCssClass(this.element, 'gcliReports');

    this.reportList.addEventListener('output', function(ev) {
        if (!ev.request.view) {
            ev.request.view = new RequestView(ev.request, this);
        }
        ev.request.view.onRequestChange(ev);
    }.bind(this));
}

RequestsView.prototype.setHeight = function(height) {
    this.element.style.height = height + 'px';
};

requestView.RequestsView = RequestsView;


/**
 * Adds a row to the CLI output display
 */
function RequestView(request, requestsView) {
    this.request = request;
    this.requestsView = requestsView;

    this.imageUrl = imageUrl;

    // Elements attached to this by the templater. For info only
    this.rowin = null;
    this.rowout = null;
    this.output = null;
    this.hide = null;
    this.show = null;
    this.duration = null;
    this.throb = null;

    // Setup the template on first use
    if (!RequestView._row) {
        dom.importCssString(requestViewCss, this.requestsView.doc);

        var templates = dom.createElement('div', null, this.requestsView.doc);
        dom.setInnerHtml(templates, requestViewHtml);
        RequestView._row = templates.querySelector('.gcliRow');
    }

    new Templater().processNode(RequestView._row.cloneNode(true), this);

    this.requestsView.element.appendChild(this.rowin);
    this.requestsView.element.appendChild(this.rowout);
};

RequestView.prototype = {
    /**
     * A single click on an invocation line in the console copies the command
     * to the command line
     */
    copyToInput: function() {
        if (this.requestsView.inputter) {
            this.requestsView.inputter.setInput(this.request.typed);
        }
    },

    /**
     * A double click on an invocation line in the console executes the command
     */
    execute: function(ev) {
        if (this.requestsView.requ) {
            this.requestsView.requ.exec({ typed: this.request.typed });
        }
    },

    hideOutput: function(ev) {
        this.output.style.display = 'none';
        dom.addCssClass(this.hide, 'cmd_hidden');
        dom.removeCssClass(this.show, 'cmd_hidden');

        event.stopPropagation(ev);
    },

    showOutput: function(ev) {
        this.output.style.display = 'block';
        dom.removeCssClass(this.hide, 'cmd_hidden');
        dom.addCssClass(this.show, 'cmd_hidden');

        event.stopPropagation(ev);
    },

    remove: function(ev) {
        this.requestsView.element.removeChild(this.rowin);
        this.requestsView.element.removeChild(this.rowout);
        event.stopPropagation(ev);
    },

    onRequestChange: function(ev) {
        dom.setInnerHtml(this.duration, this.request.duration ?
            'completed in ' + (this.request.duration / 1000) + ' sec ' :
            '');

        dom.clearElement(this.output);

        // TODO: do conversion to HTML here?
        var node;
        if (this.request.output != null) {
            node = dom.createElement('p', null, this.requestsView.doc);
            dom.setInnerHtml(node, this.request.output.toString());
            this.output.appendChild(node);
        }

        // We need to see the output of the latest command entered
        // Certain browsers have a bug such that scrollHeight is too small
        // when content does not fill the client area of the element
        var scrollHeight = Math.max(this.requestsView.element.scrollHeight,
              this.requestsView.element.clientHeight);
        this.requestsView.element.scrollTop =
              scrollHeight - this.requestsView.element.clientHeight;

        dom.setCssClass(this.output, 'cmd_error', this.request.error);

        this.throb.style.display = this.request.completed ? 'none' : 'block';
    }
};

requestView.RequestView = RequestView;


});
