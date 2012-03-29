/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var help = exports;


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var view = require('gcli/ui/view');

// Storing the HTML on exports allows other builds to alter the help template
// but still allowing dryice to do it's dependency thing properly
exports.helpManHtml = require('text!gcli/commands/help_man.html');
exports.helpListHtml = require('text!gcli/commands/help_list.html');
exports.helpCss = require('text!gcli/commands/help.css');

/**
 * 'help' command
 */
var helpCommandSpec = {
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
    var match = canon.getCommand(args.search || undefined);
    if (match) {
      return view.createView({
        html: exports.helpManHtml,
        options: { allowEval: true, stack: 'help_man.html' },
        data: getManTemplateData(match, context),
        css: exports.helpCss,
        cssId: 'gcli-help'
      });
    }

    return view.createView({
      html: exports.helpListHtml,
      options: { allowEval: true, stack: 'help_list.html' },
      data: getListTemplateData(args, context),
      css: exports.helpCss,
      cssId: 'gcli-help'
    });
  }
};

/**
 * Registration and de-registration.
 */
help.startup = function() {
  canon.addCommand(helpCommandSpec);
};

help.shutdown = function() {
  canon.removeCommand(helpCommandSpec);
};

/**
 * Find an element within the passed element with the class gcli-help-command
 * and update the requisition to contain this text.
 */
function updateCommand(element, context) {
  var typed = element.querySelector('.gcli-help-command').textContent;
  context.update(typed);
}

/**
 * Find an element within the passed element with the class gcli-help-command
 * and execute this text.
 */
function executeCommand(element, context) {
  context.exec({
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
    includeIntro: args.search == null,

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
        if (command.hidden) {
          return false;
        }

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
  var manTemplateData = {
    l10n: l10n.propertyLookup,
    command: command,

    onclick: function(ev) {
      updateCommand(ev.currentTarget, context);
    },

    ondblclick: function(ev) {
      executeCommand(ev.currentTarget, context);
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

  Object.defineProperty(manTemplateData, 'subcommands', {
    get: function() {
      var matching = canon.getCommands().filter(function(subcommand) {
        return subcommand.name.indexOf(command.name) === 0 &&
                subcommand.name !== command.name;
      });
      matching.sort();
      return matching;
    },
    enumerable: true
  });

  return manTemplateData;
}

});
