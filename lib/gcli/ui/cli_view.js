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
var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var RequestsView = require('gcli/ui/request_view').RequestsView;

var editorCss = require('text!gcli/ui/cli_view.css');
var menuCss = require('text!gcli/ui/menu.css');
var menuHtml = require('text!gcli/ui/menu.html');


/**
 * A class to handle the simplest UI implementation
 */
function createView(options) {
    options = options || {};

    var requ = new Requisition(options.env);
    var inputter = new Inputter(requ, options);
    var doc = options.document || inputter.doc;

    var hinter = options.hinter || new Hinter(doc, requ, options);
    var requestsView = new RequestsView(doc, requ, inputter);
    var popup = new Popup(doc, inputter, requestsView);

    popup.append(hinter.element);
    popup.append(requestsView.element);
    inputter.sendFocusEventsToPopup(popup);
    inputter.update();
}

cliView.createView = createView;


/**
 * We only want to import editorCss once so this tracks whether or not we have
 * done it. Note technically it's only once per document, so perhaps we should
 * have a list of documents into which we've imported the CSS?
 * TODO: Also the contents of this CSS file should be broken up and spread
 * around the parts.
 */
var editorCssImported = false;

/**
 * A wrapper to take care of the functions concerning an input element
 */
function Inputter(requ, options) {
    if (!editorCssImported) {
        dom.importCssString(editorCss, this.doc);
        editorCssImported = true;
    }

    this.requ = requ;

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

    this.element.spellcheck = false;

    // Ensure that TAB/UP/DOWN isn't handled by the browser
    event.addCommandKeyListener(this.element, this.onCommandKey.bind(this));
    event.addListener(this.element, 'keyup', this.onKeyUp.bind(this));

    this.completer = options.completer || new Completer(this.doc, this.requ);
    this.appendAfter(this.completer.element);
    this.completer.decorate(this);

    // cursor position affects hint severity.
    event.addListener(this.element, 'mouseup', function(ev) {
        this.completer.update();
    }.bind(this));

    this.onInputChange = function() {
        this.element.value = this.requ.toString();
        this.completer.update();
    }.bind(this);
    this.requ.addEventListener('inputChange', this.onInputChange);
}

/**
 * When the input element gets/loses focus make sure we tell the popup so it
 * can show/hide accordingly.
 */
Inputter.prototype.sendFocusEventsToPopup = function(popup) {
    event.addListener(this.element, "focus", popup.showOutput);
    event.addListener(this.element, "blur", popup.hideOutput);
};

Inputter.prototype.focus = function() {
    this.element.focus();
};

Inputter.prototype.getDimensionRect = function() {
    if (!this.element.getClientRects) {
        // TODO: how can we make up for this?
        return;
    }
    var rect = this.element.getClientRects()[0];
    rect.width = rect.right - rect.left;
    rect.height = rect.bottom - rect.top;
    return rect;
};

/**
 * Utility to add an element into the DOM after the input element.
 */
Inputter.prototype.appendAfter = function(element) {
    this.element.parentNode.insertBefore(element, this.element.nextSibling);
};

/**
 * Ensure certain keys (arrows, tab, etc) that we would like to handle
 * are not handled by the browser
 */
Inputter.prototype.onCommandKey = function(ev, hashId, key) {
    if (key === 9 /*TAB*/ || key === 38 /*UP*/ || key === 40 /*DOWN*/) {
        event.stopEvent(ev);
    }
};

/**
 * Just set the input field to a value without executing anything
 */
Inputter.prototype.setInput = function(str) {
    this.element.value = str;
    this.update();
};

/**
 * The main keyboard processing loop
 */
Inputter.prototype.onKeyUp = function(ev) {
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
};

/**
 * Actually parse the input and make sure we're all up to date
 */
Inputter.prototype.update = function() {
    this.updateCli();
    this.completer.update();
};

/**
 * Update the requisition with the contents of the input element.
 */
Inputter.prototype.updateCli = function() {
    var input = {
        typed: this.element.value,
        cursor: {
            start: dom.getSelectionStart(this.element),
            end: dom.getSelectionEnd(this.element.selectionEnd)
        }
    };

    this.requ.update(input);
};

cliView.Inputter = Inputter;


/**
 * Completer is an 'input-like' element that sits  an input element annotating
 * it with visual goodness.
 */
function Completer(doc, requ) {
    this.doc = doc;
    this.requ = requ;

    this.element = dom.createElement('div', null, this.doc);
    this.element.className = 'gcliCompletion VALID';
}

/**
 * A list of the styles that decorate() should copy to make the completion
 * element look like the input element. backgroundColor is a spiritual part of
 * this list, but see comment in decorate()
 */
Completer.copyStyles = [
    'color', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle'
];

/**
 * Make ourselves visually similar to the input element, and make the input
 * element transparent so our background shines through
 */
Completer.prototype.decorate = function(inputter) {
    this.inputter = inputter;
    this.input = inputter.element;

    Completer.copyStyles.forEach(function(style) {
        this.element.style[style] = dom.computedStyle(this.input, style);
    }, this);
    // It's not clear why backgroundColor doesn't work when used from
    // computedStyle, but it doesn't. Comment patches welcome!
    this.element.style.backgroundColor = this.input.style.backgroundColor;

    this.input.style.backgroundColor = 'transparent';

    var resizer = this.resizer.bind(this);
    event.addListener(this.doc.defaultView, 'resize', resizer);
    resizer();
};

/**
 * Ensure that the completion element is the same size and the inputter element
 */
Completer.prototype.resizer = function() {
    var rect = this.inputter.getDimensionRect();
    if (!rect) {
        console.log('Skipping resize, missing getClientRects');
        return;
    }

    this.element.style.top = rect.top + 'px';
    this.element.style.height = rect.height + 'px';
    this.element.style.lineHeight = rect.height + 'px';
    this.element.style.left = rect.left + 'px';
    this.element.style.width = rect.width + 'px';
};

/**
 * Bring the completion element up to date with what the requisition says
 */
Completer.prototype.update = function() {
    var start = dom.getSelectionStart(this.input);
    var current = this.requ.getAssignmentAt(start);
    var predictions = current.getPredictions();

    // Update the completer element with prompt/error marker/TAB info
    dom.removeCssClass(this.element, Status.VALID.toString());
    dom.removeCssClass(this.element, Status.INCOMPLETE.toString());
    dom.removeCssClass(this.element, Status.ERROR.toString());

    var completion = '<span class="gcliPrompt">&gt;</span> ';
    if (this.input.value.length > 0) {
        var scores = this.requ.getInputStatusMarkup();
        completion += this.markupStatusScore(scores);
    }

    // Display the '-> prediction' at the end of the completer element
    if (this.input.value.length > 0 && predictions.length > 0) {
        var tab = predictions[0];
        tab = tab.name ? tab.name : tab;
        completion += ' &#xa0;<span class="gcliCompl">&#x21E5; ' +
                tab + '</span>';
    }
    dom.setInnerHtml(this.element, '<span>' + completion + '</span>');
    var status = this.requ.getStatus();

    dom.addCssClass(this.element, status.toString());
};

/**
 * Mark-up an array of Status values with spans
 */
Completer.prototype.markupStatusScore = function(scores) {
    var completion = '';
    // Create mark-up
    var i = 0;
    var lastStatus = -1;
    while (true) {
        if (lastStatus !== scores[i]) {
            completion += '<span class="' + scores[i].toString() + '">';
            lastStatus = scores[i];
        }
        completion += this.input.value[i];
        i++;
        if (i === this.input.value.length) {
            completion += '</span>';
            break;
        }
        if (lastStatus !== scores[i]) {
            completion += '</span>';
        }
    }

    return completion;
};

cliView.Completer = Completer;


/**
 * Some implementations of GCLI require an element to be visible whenever the
 * GCLI has the focus.
 * This can be somewhat tricky because the definition of 'has the focus' is
 * one where a group of elements could have the focus.
 */
function Popup(doc, inputter, requestsView) {
    this.doc = doc;
    this.inputter = inputter;
    this.requestsView = requestsView;

    // What height should the output panel be, by default?
    this._outputHeight = 300;

    // Focus Management.
    this.outputHideTimeout;
    this.preventBlurTimeout;
    this.preventBlurInputFocus;

    this.showOutput = this.showOutput.bind(this);
    this.hideOutput = this.hideOutput.bind(this);
    this.preventBlur = this.preventBlur.bind(this);
    this.resizer = this.resizer.bind(this);

    this.output = this.doc.getElementById('gcliOutput');
    this.popupOutput = (this.output == null);

    if (!this.output) {
        this.output = dom.createElement('div', null, this.doc);
        this.output.id = 'gcliOutput';
        this.inputter.appendAfter(this.output);
    }
    else {
        this.output.className = 'gcliFocusPopup';
    }

    this.win = this.output.ownerDocument.defaultView;

    event.addListener(this.win, 'resize', this.resizer);
    this.resizer();

    // Adjust to the current outputHeight only when we created the output
    if (this.popupOutput) {
        this.setOutputHeight(this._outputHeight);
    }

    // Attach events to this.output to check if any DOM node inside of the
    // output node is focused/clicked on. This kind of events prevent the
    // output node from getting hidden.
    // If any of the DOM nodes inside of output get blurred, hide the
    // output node. If the focus is set to a different node in output,
    // the focus event will prevent closing the output.
    // The third argument to addEventListener MUST be set to true!
    this.output.addEventListener('click', this.preventBlur, true);
    this.output.addEventListener('mousedown', this.preventBlur, true);
    this.output.addEventListener('focus', this.preventBlur, true);
    this.output.addEventListener('blur', this.hideOutput,  true);

    // Hide the cli's output at after startup.
    this.hideOutput();
}

/**
 * Configuration point - how high should the output window be?
 */
Popup.prototype.setOutputHeight = function(outputHeight) {
    this._outputHeight = outputHeight;

    this.output.style.height = this._outputHeight + 'px';
    if (this.requestsView) {
        this.requestsView.setHeight(this._outputHeight);
    }
    if (this.hinter) {
        this.hinter.setHeight(this._outputHeight);
    }
};

/**
 *
 */
Popup.prototype.append = function(element) {
    this.output.appendChild(element);
};

/**
 * Tweak CSS to show the output popup
 */
Popup.prototype.showOutput = function() {
    if (this.popupOutput) {
        dom.addCssClass(this.output, "gcliFocusPopup");
        // Ensure that no outputHideTimer is called.
        this.preventBlur();
    }
};

/**
 * Hide the popup using a CSS tweak
 */
Popup.prototype.hideOutput = function() {
    if (this.preventBlurTimeout) {
        // We are not allowed to blur. Check if we are allowed to
        // focus the input element again which is in some situations
        // necessary to ensure that one DOM node has the focus.
        // Call input.focus after the current call stack is empty.
        if (!this.preventBlurInputFocus && this.inputter) {
            this.win.setTimeout(function() {
                this.inputter.focus();
            }.bind(this), 0);
        }
        return;
    }
    else {
        // Set's a timer to hide the output element. This timer might
        // get canceled due to calls to preventBlur.
        this.outputHideTimeout = this.win.setTimeout(function() {
            if (this.popupOutput) {
                dom.removeCssClass(this.output, "gcliFocusPopup");
            }
        }.bind(this), 100);
    }
};

/**
 * If you click from the input element to the popup, we don't want to
 * hide the popup (which we normally do on input blur) so we attach
 * this to a number of related events, and it prevents the popup from
 * getting hidden
 */
Popup.prototype.preventBlur = function(ev) {
    // Prevent hiding the output element.
    this.win.clearTimeout(this.outputHideTimeout);

    if (ev) {
        // If this function was called by an event, check if the
        // element that was clicked/focused has a blur event. If so,
        // set this.preventBlurInputFocus in order to prevent hideOutput()
        // from focusing the input element.
        var isInput = ev.target.tagName === 'INPUT' &&
                ev.target.type !== 'submit' && ev.target.type !== 'button';
        if (ev.target.tagName === 'SELECT' || isInput) {
            this.preventBlurInputFocus = true;
        }
    }

    // Setup a timer to prevent hiding the output node until the call
    // stack is finished. This is necessary, as mousedown/click events
    // occurred sometimes before the input.blur event, but the
    // input.blur event should be prevented.
    if (this.preventBlurTimeout) {
        this.win.clearTimeout(this.preventBlurTimeout);
    }
    this.preventBlurTimeout = this.win.setTimeout(function() {
        this.preventBlurTimeout = null;
        this.preventBlurInputFocus = false;

        // If blurring was prevented due to selecting/focusing a check
        // box, the focus has to be set to the input element again such
        // that one DOM element on the cli has the focus (the checkbox
        // DOM input element doesn't have a blur event).
        if (ev && ev.target.type === 'checkbox' && this.inputter) {
            this.inputter.focus();
        }
    }.bind(this), 0);
};

/**
 * To be called on window resize or any time we want to align the elements
 * with the input box.
 */
Popup.prototype.resizer = function() {
    if (this.popupOutput) {
        var rect = this.inputter.getDimensionRect();
        if (!rect) {
            return;
        }

        this.output.style.top = 'auto';
        var bottom = this.doc.documentElement.clientHeight - rect.top;
        this.output.style.bottom = bottom + 'px';
        this.output.style.left = rect.left + 'px';
        this.output.style.width = (rect.width - 80) + 'px';
    }
};

cliView.Popup = Popup;


/**
 * A container to show either an ArgFetcher or a Menu depending on the state
 * of the requisition.
 */
function Hinter(doc, requ, options) {
    options = options || {};

    this.doc = doc;
    this.requ = requ;

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
