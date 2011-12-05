/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var help = exports;


var canon = require('gcli/canon');
var util = require('gcli/util');
var l10n = require('gcli/l10n');
var domtemplate = require('gcli/ui/domtemplate');

var helpCss = require('text!gcli/commands/help.css');
var helpStyle = undefined;
var helpIntroHtml = require('text!gcli/commands/help_intro.html');
var helpIntroTemplate = undefined;
var helpListHtml = require('text!gcli/commands/help_list.html');
var helpListTemplate = undefined;
var helpManHtml = require('text!gcli/commands/help_man.html');
var helpManTemplate = undefined;

/**
 * 'help' command
 * We delay definition of helpCommandSpec until help.startup() to ensure that
 * the l10n strings have been loaded
 */
var helpCommandSpec;

/**
 * Registration and de-registration.
 */
help.startup = function() {

  helpCommandSpec = {
    name: 'help',
    description: l10n.lookup('helpDesc'),
    manual: l10n.lookup('helpManual'),
    params: [
      {
        name: 'search',
        type: 'string',
        description: l10n.lookup('helpSearchDesc'),
        manual: l10n.lookup('helpSearchManual'),
        defaultValue: null
      }
    ],
    returnType: 'html',

    exec: function(args, context) {
      help.onFirstUseStartup(context.document);

      var match = canon.getCommand(args.search);
      if (match) {
        var clone = helpManTemplate.cloneNode(true);
        domtemplate.template(clone, getManTemplateData(match, context),
                { allowEval: true, stack: 'help_man.html' });
        return clone;
      }

      var parent = util.dom.createElement(context.document, 'div');
      if (!args.search) {
        parent.appendChild(helpIntroTemplate.cloneNode(true));
      }
      parent.appendChild(helpListTemplate.cloneNode(true));
      domtemplate.template(parent, getListTemplateData(args, context),
              { allowEval: true, stack: 'help_intro.html | help_list.html' });
      return parent;
    }
  };

  canon.addCommand(helpCommandSpec);
};

help.shutdown = function() {
  canon.removeCommand(helpCommandSpec);

  helpListTemplate = undefined;
  helpStyle.parentElement.removeChild(helpStyle);
  helpStyle = undefined;
};

/**
 * Called when the command is executed
 */
help.onFirstUseStartup = function(document) {
  if (!helpIntroTemplate) {
    helpIntroTemplate = util.dom.createElement(document, 'div');
    util.dom.setInnerHtml(helpIntroTemplate, helpIntroHtml);
  }
  if (!helpListTemplate) {
    helpListTemplate = util.dom.createElement(document, 'div');
    util.dom.setInnerHtml(helpListTemplate, helpListHtml);
  }
  if (!helpManTemplate) {
    helpManTemplate = util.dom.createElement(document, 'div');
    util.dom.setInnerHtml(helpManTemplate, helpManHtml);
  }
  if (!helpStyle && helpCss != null) {
    helpStyle = util.dom.importCss(helpCss, document);
  }
};

/**
 * Find an element within the passed element with the class gcli-help-command
 * and update the requisition to contain this text.
 */
function updateCommand(element, context) {
  context.requisition.update({
    typed: element.querySelector('.gcli-help-command').textContent
  });
}

/**
 * Find an element within the passed element with the class gcli-help-command
 * and execute this text.
 */
function executeCommand(element, context) {
  context.requisition.exec({
    visible: true,
    typed: element.querySelector('.gcli-help-command').textContent
  });
}

/**
 * Create a block of data suitable to be passed to the help_list.html template
 */
function getListTemplateData(args, context) {
  return {
    l10n: l10n.propertyLookup,
    lang: context.document.defaultView.navigator.language,

    onclick: function(ev) {
      updateCommand(ev.currentTarget, context);
    },

    ondblclick: function(ev) {
      executeCommand(ev.currentTarget, context);
    },

    getHeading: function() {
      return args.search == null ?
              'Available Commands:' :
              'Commands starting with \'' + args.search + '\':';
    },

    getMatchingCommands: function() {
      var matching = canon.getCommands().filter(function(command) {
        if (args.search && command.name.indexOf(args.search) !== 0) {
          // Filtered out because they don't match the search
          return false;
        }
        if (!args.search && command.name.indexOf(' ') != -1) {
          // We don't show sub commands with plain 'help'
          return false;
        }
        return true;
      });
      matching.sort();
      return matching;
    }
  };
}

/**
 * Create a block of data suitable to be passed to the help_man.html template
 */
function getManTemplateData(command, context) {
  return {
    l10n: l10n.propertyLookup,
    lang: context.document.defaultView.navigator.language,

    command: command,

    onclick: function(ev) {
      updateCommand(ev.currentTarget, context);
    },

    getTypeDescription: function(param) {
      var input = '';
      if (param.defaultValue === undefined) {
        input = 'required';
      }
      else if (param.defaultValue === null) {
        input = 'optional';
      }
      else {
        input = param.defaultValue;
      }
      return '(' + param.type.name + ', ' + input + ')';
    }
  };
}

});
