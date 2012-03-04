/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var util = require('gcli/util');
var settings = require('gcli/settings');
var l10n = require('gcli/l10n');
var canon = require('gcli/canon');

/**
 * Record how much help the user wants from the tooltip
 */
var Eagerness = {
  NEVER: 1,
  SOMETIMES: 2,
  ALWAYS: 3
};
var eagerHelperSettingSpec = {
  name: 'eagerHelper',
  type: {
    name: 'selection',
    lookup: [
      { name: 'never', value: Eagerness.NEVER },
      { name: 'sometimes', value: Eagerness.SOMETIMES },
      { name: 'always', value: Eagerness.ALWAYS },
    ]
  },
  defaultValue: 1,
  description: l10n.lookup('eagerHelperDesc'),
  ignoreTypeDifference: true
};
var eagerHelper;

/**
 * Register (and unregister) the hide-intro setting
 */
exports.startup = function() {
  eagerHelper = settings.addSetting(eagerHelperSettingSpec);
};

exports.shutdown = function() {
  settings.removeSetting(eagerHelperSettingSpec);
  eagerHelper = undefined;
};

/**
 * FocusManager solves the problem of tracking focus among a set of nodes.
 * The specific problem we are solving is when the hint element must be visible
 * if either the command line or any of the inputs in the hint element has the
 * focus, and invisible at other times, without hiding and showing the hint
 * element even briefly as the focus changes between them.
 * It does this simply by postponing the hide events by 250ms to see if
 * something else takes focus.
 * @param options Object containing user customization properties, including:
 * - blurDelay (default=150ms)
 * - slowTypingDelay (default=3000ms)
 * - debug (default=false)
 * - commandOutputManager (default=canon.commandOutputManager)
 * @param components Object that links to other UI components. GCLI provided:
 * - document
 */
function FocusManager(options, components) {
  options = options || {};

  this._document = components.document || document;
  this._debug = options.debug || false;
  this._blurDelay = options.blurDelay || 150;
  this._window = this._document.defaultView;

  this._commandOutputManager = options.commandOutputManager ||
      canon.commandOutputManager;
  this._commandOutputManager.onOutput.add(this._outputted, this);

  this._blurDelayTimeout = null; // Result of setTimeout in delaying a blur
  this._monitoredElements = [];  // See addMonitoredElement()

  this._isError = false;
  this._hasFocus = false;
  this._helpRequested = false;
  this._recentOutput = false;

  // Be more helpful if the user pauses
  // this._slowTyping = false;
  // this._keyPressTimeout = null;
  // this._onSlowTyping = this._onSlowTyping.bind(this);
  // this._slowTypingDelay = options.slowTypingDelay || 3000;

  this.onVisibilityChange = util.createEvent('FocusManager.onVisibilityChange');

  this._focused = this._focused.bind(this);
  this._document.addEventListener('focus', this._focused, true);

  eagerHelper.onChange.add(this._eagerHelperChanged, this);

  this._isTooltipVisible = undefined;
  this._isOutputVisible = undefined;
  this._checkShow();
}

/**
 * Avoid memory leaks
 */
FocusManager.prototype.destroy = function() {
  eagerHelper.onChange.remove(this._eagerHelperChanged, this);

  this._document.removeEventListener('focus', this._focused, true);
  delete this._focused;
  delete this._document;
  delete this._window;

  // delete this._onSlowTyping;

  this._commandOutputManager.onOutput.remove(this._outputted, this);
  delete this._commandOutputManager;

  for (var i = 0; i < this._monitoredElements.length; i++) {
    var monitor = this._monitoredElements[i];
    console.error('Hanging monitored element: ', monitor.element);

    monitor.element.removeEventListener('focus', monitor.onFocus, true);
    monitor.element.removeEventListener('blur', monitor.onBlur, true);
  }

  if (this._blurDelayTimeout) {
    this._window.clearTimeout(this._blurDelayTimeout);
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
    onFocus: function() { this._reportFocus(where); }.bind(this),
    onBlur: function() { this._reportBlur(where); }.bind(this)
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
 * Monitor for new command executions
 */
FocusManager.prototype.updatePosition = function(dimensions) {
  var ev = {
    tooltipVisible: this._isTooltipVisible,
    outputVisible: this._isOutputVisible
  };
  this.onVisibilityChange(ev);
};

/**
 * Monitor for new command executions
 */
FocusManager.prototype._outputted = function(ev) {
  this._recentOutput = true;
  this._helpRequested = false;
  this._checkShow();
};

/**
 * We take a focus event anywhere to be an indication that we might be about
 * to lose focus
 */
FocusManager.prototype._focused = function() {
  this._reportBlur('document');
};

/**
 * Some component has received a 'focus' event. This sets the internal status
 * straight away and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype._reportFocus = function(where) {
  if (this._debug) {
    console.log('FocusManager._reportFocus(' + (where || 'unknown') + ')');
  }

  // this._resetSlowTypingAlarm();

  if (this._blurDelayTimeout) {
    if (this._debug) {
      console.log('FocusManager.cancelBlur');
    }
    this._window.clearTimeout(this._blurDelayTimeout);
    this._blurDelayTimeout = null;
  }

  if (!this._hasFocus) {
    this._hasFocus = true;
  }
  this._checkShow();
};

/**
 * Some component has received a 'blur' event. This waits for a while to see if
 * we are going to get any subsequent 'focus' events and then sets the internal
 * status and informs the listeners
 * @param where Optional source string for debugging only
 */
FocusManager.prototype._reportBlur = function(where) {
  if (this._debug) {
    console.log('FocusManager._reportBlur(' + where + ')');
  }

  // this._cancelSlowTypingAlarm();

  if (this._hasFocus) {
    if (this._blurDelayTimeout) {
      if (this._debug) {
        console.log('FocusManager.blurPending');
      }
      return;
    }

    this._blurDelayTimeout = this._window.setTimeout(function() {
      if (this._debug) {
        console.log('FocusManager.blur');
      }
      this._hasFocus = false;
      this._checkShow();
      this._blurDelayTimeout = null;
    }.bind(this), this._blurDelay);
  }
};

/**
 * Called on keypress or new focus. Sets off a timer to explode if the user
 * stops typing.
 */
FocusManager.prototype._resetSlowTypingAlarm = function() {
  // this._cancelSlowTypingAlarm();
  // this._keyPressTimeout = this._window.setTimeout(this._onSlowTyping,
  //                                                 this._slowTypingDelay);
};

/**
 * Don't kick off a slow typing alarm
 */
FocusManager.prototype._cancelSlowTypingAlarm = function() {
  // if (this._keyPressTimeout) {
  //   this._window.clearTimeout(this._keyPressTimeout);
  //   this._keyPressTimeout = null;
  // }
  // this._slowTyping = false;
};

/**
 * Called from the key-press timeout
 */
FocusManager.prototype._onSlowTyping = function() {
  // this._slowTyping = true;
  // this._checkShow();
};

/**
 * The setting has changed
 */
FocusManager.prototype._eagerHelperChanged = function() {
  this._checkShow();
};

/**
 * The inputter tells us about keyboard events so we can decide to delay
 * showing the tooltip element, (or if the keypress is F1, show it now)
 */
FocusManager.prototype.onKeyUp = function(ev) {
  // this._resetSlowTypingAlarm();
  // this._slowTyping = false;
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Generally called for something like a F1 key press, when the user explicitly
 * wants help
 */
FocusManager.prototype.helpRequest = function() {
  if (this._debug) {
    console.log('FocusManager.helpRequest');
  }

  // this._cancelSlowTypingAlarm();
  // this._slowTyping = true;
  this._helpRequested = true;
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Generally called for something like a ESC key press, when the user explicitly
 * wants to get rid of the help
 */
FocusManager.prototype.removeHelp = function() {
  if (this._debug) {
    console.log('FocusManager.removeHelp');
  }

  // this._cancelSlowTypingAlarm();
  // this._slowTyping = false;
  this._importantFieldFlag = false;
  this._isError = false;
  this._helpRequested = false;
  this._recentOutput = false;
  this._checkShow();
};

/**
 * Set to true whenever a field thinks it's output is important
 */
FocusManager.prototype.setImportantFieldFlag = function(flag) {
  if (this._debug) {
    console.log('FocusManager.setImportantFieldFlag', flag);
  }
  this._importantFieldFlag = flag;
  this._checkShow();
};

/**
 * Set to true whenever a field thinks it's output is important
 */
FocusManager.prototype.setError = function(isError) {
  if (this._debug) {
    console.log('FocusManager._isError', isError);
  }
  this._isError = isError;
  this._checkShow();
};

/**
 * Helper to compare the current showing state with the value calculated by
 * _shouldShow() and take appropriate action
 */
FocusManager.prototype._checkShow = function() {
  var fire = false;
  var ev = {
    tooltipVisible: this._isTooltipVisible,
    outputVisible: this._isOutputVisible
  };

  var showTooltip = this._shouldShowTooltip();
  if (this._isTooltipVisible !== showTooltip.visible) {
    ev.tooltipVisible = this._isTooltipVisible = showTooltip.visible;
    fire = true;
  }

  var showOutput = this._shouldShowOutput();
  if (this._isOutputVisible !== showOutput.visible) {
    ev.outputVisible = this._isOutputVisible = showOutput.visible;
    fire = true;
  }

  if (fire) {
    if (this._debug) {
      console.debug('FocusManager.onVisibilityChange', ev);
    }
    this.onVisibilityChange(ev);
  }
};

/**
 * Calculate if we should be showing or hidden taking into account all the
 * available inputs
 */
FocusManager.prototype._shouldShowTooltip = function() {
  if (eagerHelper.value === Eagerness.NEVER) {
    return { visible: false, reason: 'eagerHelper !== NEVER' };
  }

  if (eagerHelper.value === Eagerness.ALWAYS) {
    return { visible: true, reason: 'eagerHelper !== ALWAYS' };
  }

  if (this._isError) {
    return { visible: true, reason: 'isError' };
  }

  if (this._helpRequested) {
    return { visible: true, reason: 'helpRequested' };
  }

  if (this._importantFieldFlag) {
    return { visible: true, reason: 'importantFieldFlag' };
  }

  // if (this._slowTyping) {
  //   return { visible: true, reason: 'slowTyping' };
  // }

  return { visible: false, reason: 'default' };
};

/**
 * Calculate if we should be showing or hidden taking into account all the
 * available inputs
 */
FocusManager.prototype._shouldShowOutput = function() {
  if (this._recentOutput) {
    return { visible: true, reason: 'recentOutput' };
  }

  return { visible: false, reason: 'default' };
};

exports.FocusManager = FocusManager;


});
