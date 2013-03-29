/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(function(require, exports, module) {

'use strict';

var l10n = require('util/l10n');
var canon = require('gcli/canon');
var gcli = require('gcli/index');

// Storing the HTML on exports allows other builds to alter the help template
// but still allowing dryice to do it's dependency thing properly
exports.helpManHtml = require('text!gcli/commands/help_man.html');
exports.helpListHtml = require('text!gcli/commands/help_list.html');
exports.helpCss = require('text!gcli/commands/help.css');

/**
 * Convert a command into a man page
 */
var commandConverterSpec = {
  from: 'commandData',
  to: 'view',
  exec: function(commandData, context) {
    return context.createView({
      html: exports.helpManHtml,
      options: { allowEval: true, stack: 'help_man.html' },
      data: {
        l10n: l10n.propertyLookup,
        onclick: function(ev) {
          context.update(ev.currentTarget);
        },
        ondblclick: function(ev) {
          context.updateExec(ev.currentTarget);
        },
        describe: function(item) {
          return item.manual || item.description;
        },
        getTypeDescription: function(param) {
          var input = '';
          if (param.defaultValue === undefined) {
            input = l10n.lookup('helpManRequired');
          }
          else if (param.defaultValue === null) {
            input = l10n.lookup('helpManOptional');
          }
          else {
            input = param.defaultValue;
          }
          return '(' + param.type.name + ', ' + input + ')';
        },
        command: commandData.command,
        subcommands: commandData.subcommands
      },
      css: exports.helpCss,
      cssId: 'gcli-help'
    });
  }
};

/**
 * Convert a list of commands into a formatted list
 */
var commandsConverterSpec = {
  from: 'commandsData',
  to: 'view',
  exec: function(commandsData, context) {
    var heading;
    if (commandsData.commands.length === 0) {
      heading = l10n.lookupFormat('helpListNone', [ commandsData.prefix ]);
    }
    else if (commandsData.prefix == null) {
      heading = l10n.lookup('helpListAll');
    }
    else {
      heading = l10n.lookupFormat('helpListPrefix', [ commandsData.prefix ]);
    }

    return context.createView({
      html: exports.helpListHtml,
      options: { allowEval: true, stack: 'help_list.html' },
      data: {
        l10n: l10n.propertyLookup,
        includeIntro: commandsData.prefix == null,
        heading: heading,

        onclick: function(ev) {
          context.update(ev.currentTarget);
        },

        ondblclick: function(ev) {
          context.updateExec(ev.currentTarget);
        },

        matchingCommands: commandsData.commands
      },
      css: exports.helpCss,
      cssId: 'gcli-help'
    });
  }
};

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
      manual: l10n.lookup('helpSearchManual3'),
      defaultValue: null
    }
  ],

  exec: function(args, context) {
    var command = canon.getCommand(args.search || undefined);
    if (command) {
      return context.typedData('commandData', {
        command: command,
        subcommands: getSubCommands(command)
      });
    }

    return context.typedData('commandsData', {
      prefix: args.search,
      commands: getMatchingCommands(args.search)
    });
  }
};

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(helpCommandSpec);
  gcli.addConverter(commandConverterSpec);
  gcli.addConverter(commandsConverterSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(helpCommandSpec);
  gcli.removeConverter(commandConverterSpec);
  gcli.removeConverter(commandsConverterSpec);
};

/**
 * Create a block of data suitable to be passed to the help_list.html template
 */
function getMatchingCommands(prefix) {
  var commands = canon.getCommands().filter(function(command) {
    if (command.hidden) {
      return false;
    }

    if (prefix && command.name.indexOf(prefix) !== 0) {
      // Filtered out because they don't match the search
      return false;
    }
    if (!prefix && command.name.indexOf(' ') != -1) {
      // We don't show sub commands with plain 'help'
      return false;
    }
    return true;
  });
  commands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  return commands;
}

/**
 * Find all the sub commands of the given command
 */
function getSubCommands(command) {
  if (command.exec != null) {
    return [];
  }

  var subcommands = canon.getCommands().filter(function(subcommand) {
    return subcommand.name.indexOf(command.name) === 0 &&
            subcommand.name !== command.name;
  });

  subcommands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  return subcommands;
}

});
