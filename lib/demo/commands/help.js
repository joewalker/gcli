/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var help = exports;


// This API is NOT public it may change without warning in the future.
var canon = require('gcli/canon');

/**
 * We export a way to customize the help message with some HTML text
 */
help.helpMessages = {
  prefix: null,
  suffix: null
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
      defaultValue: null
    },
    {
      group: 'Options',
      params: [
        {
          name: 'hidden',
          type: 'boolean',
          description: 'Include hidden'
        }
      ]
    }
  ],
  returnType: 'html',
  description: 'Get help on the available commands',
  exec: function(args, context) {
    var output = [];

    var command = canon.getCommand(args.search);
    if (command && command.exec) {
      // caught a real command
      output.push(command.description ?
          command.description :
          'No description for ' + args.search);
    } else {
      if (!args.search && help.helpMessages.prefix) {
        output.push(help.helpMessages.prefix);
      }

      if (command) {
        // We must be looking at sub-commands
        output.push('<h2>Sub-Commands of ' + command.name + '</h2>');
        output.push('<p>' + command.description + '</p>');
      }
      else if (args.search) {
        output.push('<h2>Commands starting with \'' + args.search + '\':</h2>');
      }
      else {
        output.push('<h2>Available Commands:</h2>');
      }

      var commandNames = canon.getCommandNames();
      commandNames.sort();

      output.push('<table>');
      for (var i = 0; i < commandNames.length; i++) {
        command = canon.getCommand(commandNames[i]);
        if (!args.hidden && command.hidden) {
          continue;
        }
        if (command.description === undefined) {
          // Ignore editor actions
          continue;
        }
        if (args.search && command.name.indexOf(args.search) !== 0) {
          // Filtered out by the user
          continue;
        }
        if (!args.search && command.name.indexOf(' ') != -1) {
          // sub command
          continue;
        }
        if (command && command.name == args.search) {
          // sub command, and we've already given that help
          continue;
        }

        // todo add back a column with parameter information, perhaps?

        output.push('<tr>');
        output.push('<th class="right">' + command.name + '</th>');
        output.push('<td>' + command.description + '</td>');
        output.push('</tr>');
      }
      output.push('</table>');

      if (!args.search && help.helpMessages.suffix) {
        output.push(help.helpMessages.suffix);
      }
    }

    return output.join('');
  }
};


var canon = require('gcli/canon');

help.startup = function() {
  canon.addCommand(helpCommandSpec);
};

help.shutdown = function() {
  canon.removeCommand(helpCommandSpec);
};


});
