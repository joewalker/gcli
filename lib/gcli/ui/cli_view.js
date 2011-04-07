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

var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var Argument = require('gcli/argument').Argument;

var Requisition = require('gcli/cli').Requisition;
var Hint = require('gcli/cli').Hint;

var Templater = require('gcli/ui/domtemplate').Templater;
var RequestView = require('gcli/ui/request_view').RequestView;
var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;

var editorCss = require('text!gcli/ui/cli_view.css');
var cliViewHtml = require('text!gcli/ui/cli_view.html');


/**
 * A class to handle the simplest UI implementation
 */
function CliView(options) {
    options = options || {};

    this.requ = new Requisition(options.env);
    this.tmpl = new Templater();

    // Suss out where the input element is
    this.element = options.input || 'gcliInput';
    if (typeof this.element === 'string') {
        this.doc = options.document || document;
        var name = this.element;
        this.element = this.doc.getElementById(name);
        if (!this.element) {
            throw new Error('No element with id=' + name + '.');
        }
    }
    else {
        // Assume we've been passed in the correct node
        this.doc = this.element.ownerDocument;
    }

    this.win = options.window || dom.getParentWindow(this.doc);
    this.env = options.env;
    this.argFetcher = options.argFetcher || new ArgFetcher(this.doc, this.requ);
    this.outputListener = options.outputListener || RequestView;

    this.createElements();
    this.update();

    // Pull the HTML into the DOM, but don't add it to the document
    if (!CliView.optTempl) {
        dom.importCssString(editorCss, this.doc);

        var templates = dom.createElement('div', null, this.doc);
        dom.setInnerHtml(templates, cliViewHtml);
        CliView.optTempl = templates.querySelector('#gcliOptTempl');
    }
}
CliView.prototype = {
    /**
     * What height should the output panel be?
     */
    _outputHeight: 300,

    /**
     * Create divs for completion, hints and output
     */
    createElements: function() {
        var input = this.element;

        this.element.spellcheck = false;

        this.output = this.doc.getElementById('gcliOutput');
        this.popupOutput = (this.output == null);

        this.requests = dom.createElement('div', null, this.doc);
        this.requests.className = 'gcliRequests';

        this.hintParent = dom.createElement('div', null, this.doc);
        this.hintParent.className = 'gcliHintParent';

        if (!this.output) {
            this.output = dom.createElement('div', null, this.doc);
            this.output.id = 'gcliOutput';
            input.parentNode.insertBefore(this.output, input.nextSibling);

            // Adjust to the current outputHeight
            this.setOutputHeight(this._outputHeight);
        }
        else {
            this.output.className = 'gcliFocusPopup';
        }

        this.output.appendChild(this.requests);
        this.output.appendChild(this.hintParent);

        this.hinter = dom.createElement('div', null, this.doc);
        this.hinter.className = 'gcliHints';
        this.hintParent.appendChild(this.hinter);

        this.completer = dom.createElement('div', null, this.doc);
        this.completer.className = 'gcliCompletion VALID';
        this.completer.style.color = dom.computedStyle(input, 'color');
        this.completer.style.fontSize = dom.computedStyle(input, 'fontSize');
        this.completer.style.fontFamily = dom.computedStyle(input, 'fontFamily');
        this.completer.style.fontWeight = dom.computedStyle(input, 'fontWeight');
        this.completer.style.fontStyle = dom.computedStyle(input, 'fontStyle');
        input.parentNode.insertBefore(this.completer, input.nextSibling);

        // Transfer background styling to the completer.
        this.completer.style.backgroundColor = input.style.backgroundColor;
        input.style.backgroundColor = 'transparent';

        this.menu =  dom.createElement('div', null, this.doc);
        this.menu.className = 'gcliMenu';
        this.hinter.appendChild(this.menu);

        this.hinter.appendChild(this.argFetcher.element);

        var resizer = this.resizer.bind(this);
        event.addListener(this.win, 'resize', resizer);
        resizer();

        this.outputListener.startup({
            doc: this.doc,
            cliView: this,
            requests: this.requests
        });

        // Ensure that TAB/UP/DOWN isn't handled by the browser
        event.addCommandKeyListener(input, this.onCommandKey.bind(this));
        event.addListener(input, 'keyup', this.onKeyUp.bind(this));

        // cursor position affects hint severity. TODO: shortcuts for speed
        event.addListener(input, 'mouseup', function(ev) {
            this.updateGui();
        }.bind(this));

        this.onCommandChange = this.onCommandChange.bind(this);
        this.requ.addEventListener('commandChange', this.onCommandChange);

        this.onInputChange = function(ev) {
            this.element.value = this.requ.toString();
            this.updateGui();
        }.bind(this);
        this.requ.addEventListener('inputChange', this.onInputChange);

        // Focus Management.
        var outputHideTimeout;
        var preventBlurTimeout;
        var preventBlurInputFocus;

        // Tweak CSS to show the output popup.
        var showOutput = function() {
            if (this.popupOutput) {
                dom.addCssClass(this.output, "gcliFocusPopup");
                // Ensure that no outputHideTimer is called.
                preventBlur();
            }
        }.bind(this);

        // Hide the popup using a CSS tweak
        var hideOutput = function() {
            if (preventBlurTimeout) {
                // We are not allowed to blur. Check if we are allowed to
                // focus the input element again which is in some situations
                // necessary to ensure that one DOM node has the focus.
                // Call input.focus after the current call stack is empty.
                if (!preventBlurInputFocus) {
                    this.win.setTimeout(function() {
                        input.focus();
                    }.bind(this), 0);
                }
                return;
            }
            else {
                // Set's a timer to hide the output element. This timer might
                // get canceled due to calls to preventBlur.
                outputHideTimeout = this.win.setTimeout(function() {
                    if (this.popupOutput) {
                        dom.removeCssClass(this.output, "gcliFocusPopup");
                    }
                }.bind(this), 100);
            }
        }.bind(this);

        // If you click from the input element to the popup, we don't want to
        // hide the popup (which we normally do on input blur) so we attach
        // this to a number of related events, and it prevents the popup from
        // getting hidden
        var preventBlur = function(ev) {
            // Prevent hiding the output element.
            this.win.clearTimeout(outputHideTimeout);

            if (ev) {
                // If this function was called by an event, check if the
                // element that was clicked/focused has a blur event. If so,
                // set preventBlurInputFocus in order to prevent hideOutput()
                // from focusing the input element.
                if (ev.target.tagName === 'SELECT' || (
                        ev.target.tagName === 'INPUT' &&
                        ev.target.type !== 'submit' &&
                        ev.target.type !== 'button'
                    )
                ) {
                    preventBlurInputFocus = true;
                }
            }

            // Setup a timer to prevent hiding the output node until the call
            // stack is finished. This is necessary, as mousedown/click events
            // occurred sometimes before the input.blur event, but the
            // input.blur event should be prevented.
            if (preventBlurTimeout) {
                this.win.clearTimeout(preventBlurTimeout);
            }
            preventBlurTimeout = this.win.setTimeout(function() {
                preventBlurTimeout = null;
                preventBlurInputFocus = false;

                // If blurring was prevented due to selecting/focusing a check
                // box, the focus has to be set to the input element again such
                // that one DOM element on the cli has the focus (the checkbox
                // DOM input element doesn't have a blur event).
                if (ev && ev.target.type === 'checkbox') {
                    input.focus();
                }
            }.bind(this), 0);
        }.bind(this);

        // Attach events to this.output to check if any DOM node inside of the
        // output node is focused/clicked on. This kind of events prevent the
        // output node from getting hidden.
        // If any of the DOM nodes inside of output get blurred, hide the
        // output node. If the focus is set to a different node in output,
        // the focus event will prevent closing the output.
        // The third argument to addEventListener MUST be set to true!
        this.output.addEventListener('click', preventBlur, true);
        this.output.addEventListener('mousedown', preventBlur, true);
        this.output.addEventListener('focus', preventBlur, true);
        this.output.addEventListener('blur', hideOutput,  true);

        // And the events for the cli's input element itself.
        event.addListener(input, "focus", showOutput);
        event.addListener(input, "blur", hideOutput);

        // Hide the cli's output at after startup.
        hideOutput();
    },

    setOutputHeight: function(outputHeight) {
        this._outputHeight = outputHeight;

        this.output.style.height = this._outputHeight + 'px';
        this.requests.style.height = this._outputHeight + 'px';
        this.hintParent.style.maxHeight = this._outputHeight + 'px';
    },

    setInput: function(str) {
        this.element.value = str;
        this.update();
    },

    execute: function(str) {
        this.requ.update({ typed: str, cursor: { start:0, end:0 } });
        this.requ.exec();
    },

    /**
     * To be called on window resize or any time we want to align the elements
     * with the input box.
     */
    resizer: function() {
        if (!this.element.getClientRects) {
            console.log('Skipping resize, missing getClientRects');
        }

        var rect = this.element.getClientRects()[0];

        this.completer.style.top = rect.top + 'px';
        var height = rect.bottom - rect.top;
        this.completer.style.height = height + 'px';
        this.completer.style.lineHeight = height + 'px';
        this.completer.style.left = rect.left + 'px';
        var width = rect.right - rect.left;
        this.completer.style.width = width + 'px';

        if (this.popupOutput) {
            this.output.style.top = 'auto';
            var bottom = this.doc.documentElement.clientHeight - rect.top;
            this.output.style.bottom = bottom + 'px';
            this.output.style.left = rect.left + 'px';
            this.output.style.width = (width - 80) + 'px';
        }
    },

    /**
     * Ensure certain keys (arrows, tab, etc) that we would like to handle
     * are not handled by the browser
     */
    onCommandKey: function(ev, hashId, key) {
        if (key === 9 /*TAB*/ || key === 38 /*UP*/ || key === 40 /*DOWN*/) {
            event.stopEvent(ev);
        }
    },

    /**
     * The main keyboard processing loop
     */
    onKeyUp: function(ev) {
        // RETURN does a special exec/highlight thing
        if (ev.keyCode === 13 /*RETURN*/) {
            var worst = this.requ.getStatus();
            // Deny RETURN unless the command might work
            if (worst === Status.VALID) {
                this.requ.exec();
                this.element.value = '';
            }

            // Idea: If the user has pressed return, but the input can't work,
            // then highlight the error region.
            // This has the problem that the habit of pressing return to get to
            // the error is very dangerous, and also that it requires a new
            // API into Requisition
            /*
            else {
                var position = this.requ.getFirstNonValidPosition();
                dom.setSelectionStart(this.element, position.start);
                dom.setSelectionEnd(this.element, position.end);
            }
            */
        }

        this.update();

        // Special actions which delegate to the assignment
        var start = dom.getSelectionStart(this.element);
        var current = this.requ.getAssignmentAt(start);
        if (current) {
            // TAB does a special complete thing
            if (ev.keyCode === 9 /*TAB*/) {
                current.complete();
            }

            // UP/DOWN look for some history
            if (ev.keyCode === 38 /*UP*/) {
                current.increment();
            }
            if (ev.keyCode === 40 /*DOWN*/) {
                current.decrement();
            }
        }
    },

    /**
     * Actually parse the input and make sure we're all up to date
     */
    update: function() {
        this.updateCli();
        this.updateGui();
    },

    /**
     *
     */
    updateCli: function() {
        var input = {
            typed: this.element.value,
            cursor: {
                start: dom.getSelectionStart(this.element),
                end: dom.getSelectionEnd(this.element.selectionEnd)
            }
        };

        this.requ.update(input);
    },

    /**
     *
     */
    updateGui: function() {
        var start = dom.getSelectionStart(this.element);
        var current = this.requ.getAssignmentAt(start);
        var predictions = current.getPredictions();

        // Update the completer with prompt/error marker/TAB info
        dom.removeCssClass(this.completer, Status.VALID.toString());
        dom.removeCssClass(this.completer, Status.INCOMPLETE.toString());
        dom.removeCssClass(this.completer, Status.ERROR.toString());

        var completion = '<span class="gcliPrompt">&gt;</span> ';
        if (this.element.value.length > 0) {
            var scores = this.requ.getInputStatusMarkup();
            completion += this.markupStatusScore(scores);
        }

        // Display the '-> prediction' at the end of the completer
        if (this.element.value.length > 0 && predictions.length > 0) {
            var tab = predictions[0];
            tab = tab.name ? tab.name : tab;
            completion += ' &#xa0;<span class="gcliCompl">&#x21E5; ' +
                    tab + '</span>';
        }
        dom.setInnerHtml(this.completer, '<span>' + completion + '</span>');
        var status = this.requ.getStatus();

        dom.addCssClass(this.completer, status.toString());
    },

    /**
     * Mark-up an array of Status values with spans
     */
    markupStatusScore: function(scores) {
        var completion = '';
        // Create mark-up
        var i = 0;
        var lastStatus = -1;
        while (true) {
            if (lastStatus !== scores[i]) {
                completion += '<span class="' + scores[i].toString() + '">';
                lastStatus = scores[i];
            }
            completion += this.element.value[i];
            i++;
            if (i === this.element.value.length) {
                completion += '</span>';
                break;
            }
            if (lastStatus !== scores[i]) {
                completion += '</span>';
            }
        }

        return completion;
    },

    /**
     * Update the hint to reflect the changed command
     */
    onCommandChange: function(ev) {
        if (!this.requ.commandAssignment.getValue()) {
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
            var options = CliView.optTempl.cloneNode(true);
            this.tmpl.processNode(options, { items: items });
            dom.clearElement(this.menu);
            this.menu.appendChild(options);

            this.menu.style.display = 'block';
            this.argFetcher.hide();
        }
        else {
            if (ev.oldValue === ev.newValue) {
                return; // Just the text has changed
            }

            this.argFetcher.completeRequisition();
            this.menu.style.display = 'none';
        }
    },

    /**
     * Update the input element to reflect the changed argument
     */
    onAssignmentChange: function(assignment) {
        // Cursor position fixing: We were being fancy in keeping the cursor
        // in the same place relative to any changes earlier on the CLI.
        // See the following for links to how we we've done this over time.
        // https://github.com/joewalker/cockpit/blob/c5ccdd110774a914fb90f27bc85c6719dc3bec26/lib/cockpit/ui/cli_view.js#L374
        // https://github.com/joewalker/cockpit/blob/0ab81bcdc6e4839c41de7cfab0bdf18b01e6b11c/lib/cockpit/ui/cli_view.js#L373
        // If/when we wish to restore this functionality, these might be
        // interesting sources of reference.

        // Fix the input text
        var curStart = this.element.selectionStart;
        this.element.value = this.requ.toString();
        this.element.selectionStart = curStart;
    }
};
cliView.CliView = CliView;


});
