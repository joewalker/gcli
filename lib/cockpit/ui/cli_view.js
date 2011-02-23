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
 *   Joe Walker (jwalker@mozilla.com)
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


var event = require('pilot/event');
var dom = require('pilot/dom');
var keys = require('pilot/keys');
var canon = require('pilot/canon');

var Status = require('pilot/types').Status;
var SelectionType = require('pilot/types/basic').SelectionType;
var Templater = require('pilot/domtemplate').Templater;

var CliRequisition = require('cockpit/cli').CliRequisition;
var Hint = require('cockpit/cli').Hint;
var Argument = require('cockpit/cli').Argument;

var RequestView = require('cockpit/ui/request_view').RequestView;

/**
 * Bring in the CSS
 */
var editorCss = require('text!cockpit/ui/cli_view.css');
dom.importCssString(editorCss);

/**
 * Pull the HTML into the DOM, but don't add it to the document
 */
var reqTempl;
(function() {
    var cliViewHtml = require('text!cockpit/ui/cli_view.html');
    var templates = document.createElement('div');
    templates.innerHTML = cliViewHtml;
    reqTempl = templates.querySelector('#cptReqTempl');
    optTempl = templates.querySelector('#cptOptTempl');
})();

/**
 * On startup we need to:
 * 1. Add 3 sets of elements to the DOM for:
 * - command line output
 * - input hints
 * - completion
 * 2. Attach a set of events so the command line works
 */
exports.startup = function(data, reason) {
    var cli = new CliRequisition(data.env);
    var cliView = new CliView(cli, data.env);
};

/**
 * A class to handle the simplest UI implementation
 */
function CliView(cli, env) {
    this.cli = cli;
    this.doc = document;
    this.win = dom.getParentWindow(this.doc);

    // TODO: we should have a better way to specify command lines???
    this.element = this.doc.getElementById('cockpitInput');
    if (!this.element) {
        // console.log('No element with an id of cockpit. Bailing on cli');
        return;
    }

    this.settings = env.settings;
    this.hintDirection = this.settings.getSetting('hintDirection');
    this.outputDirection = this.settings.getSetting('outputDirection');
    this.outputHeight = this.settings.getSetting('outputHeight');
    this.tmpl = new Templater();

    // If the requisition tells us something has changed, we use this to know
    // if we should ignore it
    this.isUpdating = false;

    this.createElements();
    this.update();
}
CliView.prototype = {
    /**
     * Create divs for completion, hints and output
     */
    createElements: function() {
        var input = this.element;

        this.element.spellcheck = false;

        this.output = this.doc.getElementById('cockpitOutput');
        this.popupOutput = (this.output == null);
        if (!this.output) {
            this.output = this.doc.createElement('div');
            this.output.id = 'cockpitOutput';
            this.output.className = 'cptFocusPopup';
            input.parentNode.insertBefore(this.output, input.nextSibling);

            var setMaxOutputHeight = function() {
                this.output.style.maxHeight = this.outputHeight.get() + 'px';
            }.bind(this);
            this.outputHeight.addEventListener('change', setMaxOutputHeight);
            setMaxOutputHeight();
        }

        this.completer = this.doc.createElement('div');
        this.completer.className = 'cptCompletion VALID';
        this.completer.style.color = dom.computedStyle(input, 'color');
        this.completer.style.fontSize = dom.computedStyle(input, 'fontSize');
        this.completer.style.fontFamily = dom.computedStyle(input, 'fontFamily');
        this.completer.style.fontWeight = dom.computedStyle(input, 'fontWeight');
        this.completer.style.fontStyle = dom.computedStyle(input, 'fontStyle');
        input.parentNode.insertBefore(this.completer, input.nextSibling);

        // Transfer background styling to the completer.
        this.completer.style.backgroundColor = input.style.backgroundColor;
        input.style.backgroundColor = 'transparent';

        this.hinter = this.doc.createElement('div');
        this.hinter.className = 'cptHints cptFocusPopup';
        input.parentNode.insertBefore(this.hinter, input.nextSibling);

        this.menu =  this.doc.createElement('div');
        this.menu.className = 'cptMenu';
        this.hinter.appendChild(this.menu);

        this.cliEle =  this.doc.createElement('div');
        this.cliEle.className = 'cptCliEle';
        this.hinter.appendChild(this.cliEle);

        var resizer = this.resizer.bind(this);
        event.addListener(this.win, 'resize', resizer);
        this.hintDirection.addEventListener('change', resizer);
        this.outputDirection.addEventListener('change', resizer);
        resizer();

        canon.addEventListener('output',  function(ev) {
            new RequestView(ev.request, this);
        }.bind(this));
        // Ensure that TAB/UP/DOWN isn't handled by the browser
        event.addCommandKeyListener(input, function(ev, hashId, key) {
            if (key === keys.TAB || key === keys.UP || key === keys.DOWN) {
                event.stopEvent(ev);
            }
        }.bind(this));
        event.addListener(input, 'keyup', this.onKeyUp.bind(this));

        // cursor position affects hint severity. TODO: shortcuts for speed
        event.addListener(input, 'mouseup', function(ev) {
            this.isUpdating = true;
            this.update();
            this.isUpdating = false;
        }.bind(this));

        var li = this.onCommandChange.bind(this);
        this.cli.commandAssignment.addEventListener('assignmentChange', li);
    },

    /**
     * We need to see the output of the latest command entered
     */
    scrollOutputToBottom: function() {
        // Certain browsers have a bug such that scrollHeight is too small
        // when content does not fill the client area of the element
        var scrollHeight = Math.max(this.output.scrollHeight,
                this.output.clientHeight);
        this.output.scrollTop = scrollHeight - this.output.clientHeight;
    },

    /**
     * To be called on window resize or any time we want to align the elements
     * with the input box.
     */
    resizer: function() {
        var rect = this.element.getClientRects()[0];

        this.completer.style.top = rect.top + 'px';
        var height = rect.bottom - rect.top;
        this.completer.style.height = height + 'px';
        this.completer.style.lineHeight = height + 'px';
        this.completer.style.left = rect.left + 'px';
        var width = rect.right - rect.left;
        this.completer.style.width = width + 'px';

        if (this.hintDirection.get() === 'below') {
            this.hinter.style.top = rect.bottom + 'px';
            this.hinter.style.bottom = 'auto';
        }
        else {
            this.hinter.style.top = 'auto';
            var bottom = this.doc.documentElement.clientHeight - rect.top;
            this.hinter.style.bottom = bottom + 'px';
        }
        this.hinter.style.left = (rect.left + 30) + 'px';
        this.hinter.style.maxWidth = (width - 110) + 'px';

        if (this.popupOutput) {
            if (this.outputDirection.get() === 'below') {
                this.output.style.top = rect.bottom + 'px';
                this.output.style.bottom = 'auto';
            }
            else {
                this.output.style.top = 'auto';
                var bottom = this.doc.documentElement.clientHeight - rect.top;
                this.output.style.bottom = bottom + 'px';
            }
            this.output.style.left = rect.left + 'px';
            this.output.style.width = (width - 80) + 'px';
        }
    },

    /**
     * The main keyboard processing loop
     */
    onKeyUp: function(ev) {
        // RETURN does a special exec/highlight thing
        if (ev.keyCode === keys.RETURN) {
            var worst = this.cli.getStatus();
            // Deny RETURN unless the command might work
            if (worst === Status.VALID) {
                this.cli.exec();
                this.element.value = '';
            }

            // Idea: If the user has pressed return, but the input can't work,
            // then highlight the error region.
            // This has the problem that the habit of pressing return to get to
            // the error is very dangerous, and also that it requires a new
            // API into CliRequisition
            /*
            else {
                var position = this.cli.getFirstNonValidPosition();
                dom.setSelectionStart(this.element, position.start);
                dom.setSelectionEnd(this.element, position.end);
            }
            */
        }

        this.update();

        // Special actions which delegate to the assignment
        var start = dom.getSelectionStart(this.element);
        var current = this.cli.getAssignmentAt(start, true);
        if (current) {
            // TAB does a special complete thing
            if (ev.keyCode === keys.TAB) {
                current.complete();
                this.update();
            }

            // UP/DOWN look for some history
            if (ev.keyCode === keys.UP) {
                current.increment();
                this.update();
            }
            if (ev.keyCode === keys.DOWN) {
                current.decrement();
                this.update();
            }
        }
    },

    /**
     * Actually parse the input and make sure we're all up to date
     */
    update: function() {
        this.isUpdating = true;
        var input = {
            typed: this.element.value,
            cursor: {
                start: dom.getSelectionStart(this.element),
                end: dom.getSelectionEnd(this.element.selectionEnd)
            }
        };
        this.cli.update(input);

        var current = this.cli.getAssignmentAt(input.cursor.start, true);
        var predictions = current.getPredictions();

        // Update the completer with prompt/error marker/TAB info
        dom.removeCssClass(this.completer, Status.VALID.toString());
        dom.removeCssClass(this.completer, Status.INCOMPLETE.toString());
        dom.removeCssClass(this.completer, Status.ERROR.toString());

        var completion = '<span class="cptPrompt">&gt;</span> ';
        if (this.element.value.length > 0) {
            var scores = this.cli.getInputStatusMarkup();
            completion += this.markupStatusScore(scores);
        }

        // Display the '-> prediction' at the end of the completer
        if (this.element.value.length > 0 && predictions &&
                predictions.length > 0) {
            var tab = predictions[0];
            completion += ' &nbsp;&#x21E5; ' + (tab.name ? tab.name : tab);
        }
        this.completer.innerHTML = completion;
        var status = this.cli.getStatus();
        dom.addCssClass(this.completer, status.toString());

        /*
        if (hint.length === 0) {
            dom.addCssClass(this.hinter, 'cptNoPopup');
        }
        else {
            dom.removeCssClass(this.hinter, 'cptNoPopup');
        }
        */

        this.isUpdating = false;
    },

    /*
     * TODO: there are a number of calls to this.update() in this file which
     * shouldn't be needed because the prior action should have done everything
     * required. make this work properly
     */

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
                completion += '<span class=' + scores[i].toString() + '>';
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

    getInputFor: function(assignment) {
        var input;
        if (assignment.param.type instanceof SelectionType) {
            input = this.doc.createElement('select');
            var predictions = assignment.getPredictions();
            predictions.forEach(function(prediction) {
                var option = this.doc.createElement('option');
                option.innerHTML = prediction.name;
                input.appendChild(option);
            }, this);
        }
        else {
            input = this.doc.createElement('input');
            input.type = 'text';
            input.value = assignment.arg ? assignment.arg.text : '';
            input.placeholder = assignment.param.defaultValue || '';

            input.addEventListener('keyup', function() {
                var arg = assignment.arg.beget(input.value);
                assignment.setArgument(arg);
                this.onAssignmentChange(assignment);
                this.update();
            }.bind(this), false);

            assignment.addEventListener('assignmentChange', function() {
                input.value = assignment.arg.text;
            }.bind(this));
        }

        return input;
    },

    /**
     * Update the hint to reflect the changed command
     */
    onCommandChange: function(ev) {
        if (!this.cli.commandAssignment.value) {
            var predictions = ev.assignment.getPredictions();
            var options = optTempl.cloneNode(true);
            this.tmpl.processNode(options, { items: predictions });
            this.menu.innerHTML = '';
            this.menu.appendChild(options);

            this.menu.style.display = 'block';
            this.cliEle.style.display = 'none';
        }
        else {
            var reqEle = reqTempl.cloneNode(true);
            this.tmpl.processNode(reqEle, this);
            this.cliEle.innerHTML = '';
            this.cliEle.appendChild(reqEle);

            this.cliEle.style.display = 'block';
            this.menu.style.display = 'none';
        }
    },

    /**
     * Update the input element to reflect the changed argument
     */
    onAssignmentChange: function(assignment) {
        if (this.isUpdating) {
            return;
        }

        var curStart = this.element.selectionStart;
        var curEnd = this.element.selectionEnd;
        var argStart = assignment.arg.start;
        var argEnd = assignment.arg.end;

        // Do we need to fix the cursor when we've made the change? The answer
        // is yes if the cursor (or selection) is in the affected region of text
        // (technically it's probably only the cursor we care about but I'm not
        // sure we can tell which end of a selection the cursor is when we only
        // have element.selectionStart and element.selectionEnd. The case when
        // the user presses TAB when there is a selection is a little weird, but
        // there is also non-TAB induced changes. For now we'll fix the cursor
        // for all clashes between updated region and selection / cursor)

        // We're non-overlapping if the cursor is wholly before or after the
        // argument.
        var fixCursor = (argStart > curEnd) || (argEnd < curStart);

        // Fix the input text
        var prefix, suffix;
        if (argStart === Argument.AT_CURSOR) {
            prefix = this.element.value.substring(0, curStart);
            suffix = this.element.value.substring(curEnd);
        }
        else {
            prefix = this.element.value.substring(0, argStart);
            suffix = this.element.value.substring(argEnd);
        }
        var inserted = assignment.arg.text;
        this.element.value = prefix + inserted + suffix;

        // Fix the cursor.
        if (fixCursor) {
            var insertEnd = (prefix + inserted).length;
            this.element.selectionStart = insertEnd;
            this.element.selectionEnd = insertEnd;
        }
    }
};
exports.CliView = CliView;


});
