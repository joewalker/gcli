/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var help = exports;


var canon = require('gcli/canon');
var util = require('gcli/util');

var Templater = require('gcli/ui/domtemplate').Templater;

var helpCss = require('text!gcli/commands/help.css');
var helpStyle = undefined;
var helpIntroHtml = require('text!gcli/commands/help_intro.html');
var helpIntroTemplate = undefined;
var helpListHtml = require('text!gcli/commands/help_list.html');
var helpListTemplate = undefined;
var helpManHtml = require('text!gcli/commands/help_man.html');
var helpManTemplate = undefined;

/**
 * Registration and de-registration.
 */
help.startup = function() {
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
 * 'help' command
 */
var helpCommandSpec = {
  name: 'help',
  params: [
    {
      name: 'search',
      type: 'string',
      description: 'Search string',
      manual: 'A search string to use in narrowing down the list of commands that are displayed to the user. Any part of the string can match, regular expressions are not supported.',
      defaultValue: null
    }
  ],
  returnType: 'html',
  description: 'Get help on the available commands',
  manual: 'Provide help either on a specific command (if a search string is provided and an exact match is found) or on the available commands (if a search string is not provided, or if no exact match is found).',

  exec: function(args, context) {
    help.onFirstUseStartup(context.document);

    var match = canon.getCommand(args.search);
    if (match) {
      var clone = helpManTemplate.cloneNode(true);
      new Templater().processNode(clone, getManTemplateContext(match));
      return clone;
    }

    var parent = util.dom.createElement(context.document, 'div');
    if (!args.search) {
      parent.appendChild(helpIntroTemplate.cloneNode(true));
    }
    parent.appendChild(helpListTemplate.cloneNode(true));
    new Templater().processNode(parent, getListTemplateContext(args, context));
    return parent;
  }
};

function getListTemplateContext(args, context) {
  return {
    onclick: function(ev) {
      var name = ev.currentTarget.querySelector('.gcli-help-name').innerHTML;
      context.requisition.update({ typed: 'help ' + name });
    },

    ondblclick: function(ev) {
      var name = ev.currentTarget.querySelector('.gcli-help-name').innerHTML;
      context.requisition.exec({ visible: true, typed: 'help ' + name });
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

function getManTemplateContext(command) {
  return {
    command: command,
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
