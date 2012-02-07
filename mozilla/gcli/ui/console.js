/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

var Inputter = require('gcli/ui/inputter').Inputter;
var ArgFetcher = require('gcli/ui/arg_fetch').ArgFetcher;
var CommandMenu = require('gcli/ui/menu').CommandMenu;
var FocusManager = require('gcli/ui/focus').FocusManager;

/**
 * Console is responsible for generating the UI for GCLI, this implementation
 * is a special case for use inside Firefox
 */
function Console(options) {
  this.hintElement = options.hintElement;
  this.gcliTerm = options.gcliTerm;
  this.consoleWrap = options.consoleWrap;
  this.requisition = options.requisition;

  // Create a FocusManager for the various parts to register with
  this.focusManager = new FocusManager({ document: options.chromeDocument });
  this.focusManager.onFocus.add(this.gcliTerm.show, this.gcliTerm);
  this.focusManager.onBlur.add(this.gcliTerm.hide, this.gcliTerm);
  this.focusManager.addMonitoredElement(this.gcliTerm.hintNode, 'gcliTerm');

  this.inputter = new Inputter({
    document: options.chromeDocument,
    requisition: options.requisition,
    inputElement: options.inputElement,
    completeElement: options.completeElement,
    completionPrompt: '',
    backgroundElement: options.backgroundElement,
    focusManager: this.focusManager,
    scratchpad: options.scratchpad
  });

  this.menu = new CommandMenu({
    document: options.chromeDocument,
    requisition: options.requisition,
    menuClass: 'gcliterm-menu'
  });
  this.hintElement.appendChild(this.menu.element);

  this.argFetcher = new ArgFetcher({
    document: options.chromeDocument,
    requisition: options.requisition,
    argFetcherClass: 'gcliterm-argfetcher'
  });
  this.hintElement.appendChild(this.argFetcher.element);

  this.chromeWindow = options.chromeDocument.defaultView;
  this.resizer = this.resizer.bind(this);
  this.chromeWindow.addEventListener('resize', this.resizer, false);
  this.requisition.commandChange.add(this.resizer, this);
}

/**
 * Called when the page to which we're attached changes
 */
Console.prototype.reattachConsole = function(options) {
  this.chromeWindow.removeEventListener('resize', this.resizer, false);
  this.chromeWindow = options.chromeDocument.defaultView;
  this.chromeWindow.addEventListener('resize', this.resizer, false);

  this.focusManager.document = options.chromeDocument;
  this.inputter.document = options.chromeDocument;
  this.inputter.completer.document = options.chromeDocument;
  this.menu.document = options.chromeDocument;
  this.argFetcher.document = options.chromeDocument;
};

/**
 * Avoid memory leaks
 */
Console.prototype.destroy = function() {
  this.chromeWindow.removeEventListener('resize', this.resizer, false);
  delete this.resizer;
  delete this.chromeWindow;
  delete this.consoleWrap;

  this.hintElement.removeChild(this.menu.element);
  this.menu.destroy();
  this.hintElement.removeChild(this.argFetcher.element);
  this.argFetcher.destroy();

  this.inputter.destroy();

  this.focusManager.removeMonitoredElement(this.gcliTerm.hintNode, 'gcliTerm');
  this.focusManager.onFocus.remove(this.gcliTerm.show, this.gcliTerm);
  this.focusManager.onBlur.remove(this.gcliTerm.hide, this.gcliTerm);
  this.focusManager.destroy();

  delete this.gcliTerm;
  delete this.hintElement;
};

/**
 * Called on chrome window resize, or on divider slide
 */
Console.prototype.resizer = function() {
  // Bug 705109: There are several numbers hard-coded in this function.
  // This is simpler than calculating them, but error-prone when the UI setup,
  // the styling or display settings change.

  var parentRect = this.consoleWrap.getBoundingClientRect();
  // Magic number: 64 is the size of the toolbar above the output area
  var parentHeight = parentRect.bottom - parentRect.top - 64;

  // Magic number: 100 is the size at which we decide the hints are too small
  // to be useful, so we hide them
  if (parentHeight < 100) {
    this.hintElement.classList.add('gcliterm-hint-nospace');
  }
  else {
    this.hintElement.classList.remove('gcliterm-hint-nospace');

    var isMenuVisible = this.menu.element.style.display !== 'none';
    if (isMenuVisible) {
      this.menu.setMaxHeight(parentHeight);

      // Magic numbers: 19 = height of a menu item, 22 = total vertical padding
      // of container
      var idealMenuHeight = (19 * this.menu.items.length) + 22;
      if (idealMenuHeight > parentHeight) {
        this.hintElement.classList.add('gcliterm-hint-scroll');
      }
      else {
        this.hintElement.classList.remove('gcliterm-hint-scroll');
      }
    }
    else {
      this.argFetcher.setMaxHeight(parentHeight);

      this.hintElement.style.overflowY = null;
      this.hintElement.style.borderBottomColor = 'white';
    }
  }

  // We also try to make the max-width of any GCLI elements so they don't
  // extend outside the scroll area.
  var doc = this.hintElement.ownerDocument;

  var outputNode = this.hintElement.parentNode.parentNode.children[1];
  var outputs = outputNode.getElementsByClassName('gcliterm-msg-body');
  var listItems = outputNode.getElementsByClassName('hud-msg-node');

  // This is an top-side estimate. We could try to calculate it, maybe using
  // something along these lines http://www.alexandre-gomes.com/?p=115 However
  // experience has shown this to be hard to get to work reliably
  // Also we don't need to be precise. If we use a number that is too big then
  // the only down-side is too great a right margin
  var scrollbarWidth = 20;

  if (listItems.length > 0) {
    var parentWidth = outputNode.getBoundingClientRect().width - scrollbarWidth;
    var otherWidth;
    var body;

    for (var i = 0; i < listItems.length; ++i) {
      var listItem = listItems[i];
      // a.k.a 'var otherWidth = 132'
      otherWidth = 0;
      body = null;

      for (var j = 0; j < listItem.children.length; j++) {
        var child = listItem.children[j];

        if (child.classList.contains('gcliterm-msg-body')) {
          body = child.children[0];
        }
        else {
          otherWidth += child.getBoundingClientRect().width;
        }

        var styles = doc.defaultView.getComputedStyle(child, null);
        otherWidth += parseInt(styles.borderLeftWidth, 10) +
                      parseInt(styles.borderRightWidth, 10) +
                      parseInt(styles.paddingLeft, 10) +
                      parseInt(styles.paddingRight, 10) +
                      parseInt(styles.marginLeft, 10) +
                      parseInt(styles.marginRight, 10);
      }

      if (body) {
        body.style.width = (parentWidth - otherWidth) + 'px';
      }
    }
  }
};

exports.Console = Console;

});
