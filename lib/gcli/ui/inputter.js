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
var Templater = require('gcli/ui/domtemplate').Templater;

var inputterCss = require('text!gcli/ui/inputter.css');


/**
 * We only want to import inputterCss once so this tracks whether or not we have
 * done it. Note technically it's only once per document, so perhaps we should
 * have a list of documents into which we've imported the CSS?
 */
var inputterCssImported = false;

/**
 * A wrapper to take care of the functions concerning an input element
 */
function Inputter(options) {
    if (!inputterCssImported && !options.preStyled) {
        dom.importCssString(inputterCss, this.doc);
        inputterCssImported = true;
    }

    this.requ = options.requisition;

    // Suss out where the input element is
    this.element = options.inputElement || 'gcliInput';
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

    // Use our document if no other is supplied
    options.document = options.document || this.doc;

    if (options.completer == null) {
        options.completer = new Completer(options);
    }
    else if (typeof options.completer === 'function') {
        options.completer = new options.completer(options);
    }
    this.completer = options.completer;
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
function Completer(options) {
    this.doc = options.document;
    this.requ = options.requisition;
    this.elementCreated = false;

    this.element = options.completeElement || 'gcliComplete';
    if (typeof this.element === 'string') {
        var name = this.element;
        this.element = this.doc.getElementById(name);

        if (!this.element) {
            this.elementCreated = true;
            this.element = dom.createElement('div', null, this.doc);
            this.element.className = 'gcliCompletion VALID';
        }
    }

    if (options.inputBackgroundElement) {
        this.backgroundElement = options.inputBackgroundElement;
    }
    else {
        this.backgroundElement = this.element;
    }
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

    // If we were told which element to use, then assume it is already
    // correctly positioned. Otherwise insert it alongside the input element
    if (this.elementCreated) {
        this.inputter.appendAfter(this.element);

        Completer.copyStyles.forEach(function(style) {
            this.element.style[style] = dom.computedStyle(this.input, style);
        }, this);
        // It's not clear why backgroundColor doesn't work when used from
        // computedStyle, but it doesn't. Patches welcome!
        this.element.style.backgroundColor = this.input.style.backgroundColor;

        this.input.style.backgroundColor = 'transparent';

        // Make room for the prompt
        this.input.style.paddingLeft = '16px';

        var resizer = this.resizer.bind(this);
        event.addListener(this.doc.defaultView, 'resize', resizer);
        resizer();
    }
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
    dom.removeCssClass(this.backgroundElement, Status.VALID.toString());
    dom.removeCssClass(this.backgroundElement, Status.INCOMPLETE.toString());
    dom.removeCssClass(this.backgroundElement, Status.ERROR.toString());

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

    dom.addCssClass(this.backgroundElement, status.toString());
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


});
