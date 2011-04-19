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


/**
 * Some implementations of GCLI require an element to be visible whenever the
 * GCLI has the focus.
 * This can be somewhat tricky because the definition of 'has the focus' is
 * one where a group of elements could have the focus.
 */
function Popup(options) {
    this.doc = options.document || document;

    this.inputter = options.inputter;
    this.children = options.children;
    this.style = options.style || Popup.style.doubleColumnFirstFixedLeft;

    // Focus Management.
    this.outputHideTimeout;
    this.preventBlurTimeout;
    this.preventBlurInputFocus;

    this.showOutput = this.showOutput.bind(this);
    this.hideOutput = this.hideOutput.bind(this);
    this.preventBlur = this.preventBlur.bind(this);
    this.resizer = this.resizer.bind(this);
    this.autoHide = false;

    this.element = options.popupElement || 'gcliOutput';
    if (typeof this.element === 'string') {
        var name = this.element;
        this.element = this.doc.getElementById(name);

        if (!this.element) {
            this.autoHide = true;
            this.element = dom.createElement('div', null, this.doc);
            this.element.id = name;
            if (this.inputter) {
                this.inputter.appendAfter(this.element);
            }

            this.element.style.position = 'absolute';
            this.element.style.zIndex = '999';
        }

        // this.element.style.overflow = 'auto';
    }

    // Allow options to override the autoHide option
    if (options.autoHide != null) {
        this.autoHide = options.autoHide;
    }

    this.children.forEach(function(child) {
        if (child.element) {
            this.element.appendChild(child.element);
        }
    }, this);

    this.win = this.element.ownerDocument.defaultView;

    event.addListener(this.win, 'resize', this.resizer);
    this.resizer();

    // Attach events to this.output to check if any DOM node inside of the
    // output node is focused/clicked on. This kind of events prevent the
    // output node from getting hidden.
    // If any of the DOM nodes inside of output get blurred, hide the
    // output node. If the focus is set to a different node in output,
    // the focus event will prevent closing the output.
    // The third argument to addEventListener MUST be set to true!
    this.element.addEventListener('click', this.preventBlur, true);
    this.element.addEventListener('mousedown', this.preventBlur, true);
    this.element.addEventListener('focus', this.preventBlur, true);
    this.element.addEventListener('blur', this.hideOutput,  true);

    if (this.inputter) {
        this.inputter.sendFocusEventsToPopup(this);
    }

    if (this.style === Popup.style.doubleColumnFirstFixedLeft) {
        var left = this.children[0].element;
        left.style.position = 'absolute';
        left.style.bottom = '0';
        left.style.left = '0';
        left.style.maxWidth = '280px';

        var right = this.children[1].element;
        right.style.position = 'absolute';
        right.style.bottom = '0';
        right.style.left = '300px';
        right.style.right = '0';

        // What height should the output panel be, by default?
        this._outputHeight = 300;
    }
    else if (this.style === Popup.style.singleColumnVariable) {
        this._outputHeight = -1;
    }
    else {
        throw new Error('Invalid style setting');
    }

    // Adjust to the current outputHeight only when we created the output
    if (this.autoHide) {
        this.setOutputHeight(this._outputHeight);
    }

    // Hide the cli's output at after startup.
    this.hideOutput();
}

/**
 * A way to customize chunks of CSS in one go.
 * This is a bit of a hack, perhaps we'll move to injected CSS or something
 * later when we know more about what needs customizing.
 */
Popup.style = {
    doubleColumnFirstFixedLeft: 'doubleColumnFirstFixedLeft',
    singleColumnVariable: 'singleColumnVariable'
};

/**
 * Configuration point - how high should the output window be?
 */
Popup.prototype.setOutputHeight = function(outputHeight) {
    if (outputHeight == null) {
        this._outputHeight = outputHeight;
    }

    if (this._outputHeight === -1) {
        return;
    }

    this.element.style.height = this._outputHeight + 'px';
    this.children.forEach(function(child) {
        if (child.setHeight) {
            child.setHeight(this._outputHeight);
        }
    }, this);
};

/**
 * Tweak CSS to show the output popup
 */
Popup.prototype.showOutput = function() {
    if (this.autoHide) {
        this.element.style.display = 'inline-block';
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
            if (this.autoHide) {
                this.element.style.display = 'none';
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
    if (this.autoHide) {
        var rect = this.inputter.getDimensionRect();
        if (!rect) {
            return;
        }

        this.element.style.top = 'auto';
        var bottom = this.doc.documentElement.clientHeight - rect.top;
        this.element.style.bottom = bottom + 'px';
        this.element.style.left = rect.left + 'px';

        if (this.style === Popup.style.doubleColumnFirstFixedLeft) {
            this.element.style.width = (rect.width - 80) + 'px';
        }
    }
};

cliView.Popup = Popup;


});
