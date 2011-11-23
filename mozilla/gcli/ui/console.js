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
    document: options.contentDocument,
    requisition: options.requisition,
    inputElement: options.inputElement,
    completeElement: options.completeElement,
    completionPrompt: '',
    backgroundElement: options.backgroundElement,
    focusManager: this.focusManager
  });

  this.menu = new CommandMenu({
    document: options.contentDocument,
    requisition: options.requisition,
    menuClass: 'gcliterm-menu'
  });
  this.hintElement.appendChild(this.menu.element);

  this.argFetcher = new ArgFetcher({
    document: options.contentDocument,
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
  var parentRect = this.consoleWrap.getBoundingClientRect();
  var parentHeight = parentRect.bottom - parentRect.top - 64;

  if (parentHeight < 100) {
    this.hintElement.classList.add('gcliterm-hint-nospace');
  }
  else {
    this.hintElement.classList.remove('gcliterm-hint-nospace');

    var isMenuVisible = this.menu.element.style.display !== 'none';
    if (isMenuVisible) {
      this.menu.setMaxHeight(parentHeight);

      // Magic numbers. We have 2 options - lots of complex dom math to derive
      // the height of a menu item (19 pixels) and the vertical padding
      // (22 pixels), or we could just hard-code. The former is *slightly* more
      // resilient to refactoring (but still breaks with dom structure changes),
      // the latter is simpler, faster and easier.
      var idealMenuHeight = (19 * this.menu.items.length) + 22;

      if (idealMenuHeight > parentHeight) {
        this.hintElement.style.overflowY = 'scroll';
        this.hintElement.style.borderBottomColor = 'threedshadow';
      }
      else {
        this.hintElement.style.overflowY = null;
        this.hintElement.style.borderBottomColor = 'white';
      }
    }
    else {
      this.argFetcher.setMaxHeight(parentHeight);

      this.hintElement.style.overflowY = null;
      this.hintElement.style.borderBottomColor = 'white';
    }
  }
};

exports.Console = Console;

});
