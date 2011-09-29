/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');

/**
 * FocusManager solves the problem of tracking focus among a set of nodes.
 * The specific problem we are solving is when the hint element must be visible
 * if either the command line or any of the inputs in the hint element has the
 * focus, and invisible at other times, without hiding and showing the hint
 * element even briefly as the focus changes between them.
 * It does this simply by postponing the hide events by 250ms to see if
 * something else takes focus.
 * @param options An optional object containing configuration values. Valid
 * properties on the options object are:
 * - document
 * - blurDelay
 * - debug
 * - initialFocus
 */
function FocusManager(options) {
  options = options || {};

  this._debug = options.debug || false;
  this._blurDelayTimeout = null; // Result of setTimeout in delaying a blur
  this._monitoredElements = [];  // See addMonitoredElement()

  this.hasFocus = false;
  this.blurDelay = options.blurDelay || 250;
  this.document = options.document || document;

  this.onFocus = util.createEvent('FocusManager.onFocus');
  this.onBlur = util.createEvent('FocusManager.onBlur');

  // We take a focus event anywhere to be an indication that we might be about
  // to lose focus
  this._onDocumentFocus = function() {
    this.reportBlur('document');
  }.bind(this);
  this.document.addEventListener('focus', this._onDocumentFocus, true);
}

/**
 * Avoid memory leaks
 */
FocusManager.prototype.destroy = function() {
  this.document.removeEventListener('focus', this._onDocumentFocus, true);
  delete this.document;

  for (var i = 0; i < this._monitoredElements.length; i++) {
    var monitor = this._monitoredElements[i];
    console.error('Hanging monitored element: ', monitor.element);

    monitor.element.removeEventListener('focus', monitor.onFocus, true);
    monitor.element.removeEventListener('blur', monitor.onBlur, true);
  }

  if (this._blurDelayTimeout) {
    clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }
};

/**
 * The easy way to include an element in the set of things that are part of the
 * aggregate focus. Using [add|remove]MonitoredElement() is a simpler way of
 * option than calling report[Focus|Blur]()
 * @param element The element on which to track focus|blur events
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.addMonitoredElement = function(element, where) {
  if (this._debug) {
    console.log('FocusManager.addMonitoredElement(' + (where || 'unknown') + ')');
  }

  var monitor = {
    element: element,
    where: where,
    onFocus: function() { this.reportFocus(where); }.bind(this),
    onBlur: function() { this.reportBlur(where); }.bind(this)
  };

  element.addEventListener('focus', monitor.onFocus, true);
  element.addEventListener('blur', monitor.onBlur, true);
  this._monitoredElements.push(monitor);
};

/**
 * Undo the effects of addMonitoredElement()
 * @param element The element to stop tracking
 */
FocusManager.prototype.removeMonitoredElement = function(element) {
  var monitor;
  var matchIndex;

  for (var i = 0; i < this._monitoredElements.length; i++) {
    if (this._monitoredElements[i].element === element) {
      monitor = this._monitoredElements[i];
      matchIndex = i;
    }
  }

  if (!monitor) {
    if (this._debug) {
      console.error('Missing monitor for element. ', element);
    }
    return;
  }

  this._monitoredElements.splice(matchIndex, 1);
  element.removeEventListener('focus', monitor.onFocus, true);
  element.removeEventListener('blur', monitor.onBlur, true);
};

/**
 * Some component has received a 'focus' event. This sets the internal status
 * straight away and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.reportFocus = function(where) {
  if (this._debug) {
    console.log('FocusManager.reportFocus(' + (where || 'unknown') + ')');
  }

  if (this._blurDelayTimeout) {
    if (this._debug) {
      console.log('FocusManager.cancelBlur');
    }
    clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }

  if (!this.hasFocus) {
    this.hasFocus = true;
    this.onFocus();
  }
};

/**
 * Some component has received a 'blur' event. This waits for a while to see if
 * we are going to get any subsequent 'focus' events and then sets the internal
 * status and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype.reportBlur = function(where) {
  if (this._debug) {
    console.log('FocusManager.reportBlur(' + where + ')');
  }

  if (this.hasFocus) {
    if (this._blurDelayTimeout) {
      if (this._debug) {
        console.log('FocusManager.blurPending');
      }
      return;
    }

    this._blurDelayTimeout = setTimeout(function() {
      if (this._debug) {
        console.log('FocusManager.blur');
      }
      this.hasFocus = false;
      this.onBlur();
      this._blurDelayTimeout = null;
    }.bind(this), this.blurDelay);
  }
};

exports.FocusManager = FocusManager;


});
