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

/**
 * Get a data block for the help_man.html/help_man.txt templates
 */
function getHelpManData(commandData, context) {
  return {
    l10n: l10n.propertyLookup,
    onclick: context.update,
    ondblclick: context.updateExec,
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
        var defaultValue = param.type.stringify(param.defaultValue);
        input = l10n.lookupFormat('helpManDefault', [ defaultValue ]);
      }
      return '(' + param.type.name + ', ' + input + ')';
    },
    getSynopsis: function(param) {
      var short = param.short ? '|-' + param.short : '';
      if (param.isPositionalAllowed) {
        return param.defaultValue !== undefined ?
            '[' + param.name + short + ']' :
            '<' + param.name + short + '>';
      }
      else {
        return param.type.name === 'boolean' ?
            '[--' + param.name + short + ']' :
            '[--' + param.name + short + ' ...]';
      }
    },
    command: commandData.command,
    subcommands: commandData.subcommands
  };
}

/**
 * Get a data block for the help_list.html/help_list.txt templates
 */
function getHelpListData(commandsData, context) {
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

  return {
    l10n: l10n.propertyLookup,
    includeIntro: commandsData.prefix == null,
    heading: heading,
    onclick: context.update,
    ondblclick: context.updateExec,
    matchingCommands: commandsData.commands
  };
}

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
           subcommand.name !== command.name &&
           !subcommand.hidden;
  });

  subcommands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  return subcommands;
}

var helpCss = '' +
  '.gcli-help-name {\n' +
  '  text-align: end;\n' +
  '}\n' +
  '\n' +
  '.gcli-help-arrow {\n' +
  '  color: #AAA;\n' +
  '}\n' +
  '\n' +
  '.gcli-help-description {\n' +
  '  margin: 0 20px;\n' +
  '  padding: 0;\n' +
  '}\n' +
  '\n' +
  '.gcli-help-parameter {\n' +
  '  margin: 0 30px;\n' +
  '  padding: 0;\n' +
  '}\n' +
  '\n' +
  '.gcli-help-header {\n' +
  '  margin: 10px 0 6px;\n' +
  '}\n';

exports.items = [
  {
    // 'help' command
    item: 'command',
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
      var command = canon.getCommand(args.search);
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
  },
  {
    // Convert a command into an HTML man page
    item: 'converter',
    from: 'commandData',
    to: 'view',
    exec: function(commandData, context) {
      return {
        html:
          '<div>\n' +
          '  <p class="gcli-help-header">\n' +
          '    ${l10n.helpManSynopsis}:\n' +
          '    <span class="gcli-out-shortcut" data-command="${command.name}"\n' +
          '        onclick="${onclick}" ondblclick="${ondblclick}">\n' +
          '      ${command.name}\n' +
          '      <span foreach="param in ${command.params}">${getSynopsis(param)} </span>\n' +
          '    </span>\n' +
          '  </p>\n' +
          '\n' +
          '  <p class="gcli-help-description">${describe(command)}</p>\n' +
          '\n' +
          '  <div if="${command.exec}">\n' +
          '    <div foreach="groupName in ${command.paramGroups}">\n' +
          '      <p class="gcli-help-header">${groupName}:</p>\n' +
          '      <ul class="gcli-help-parameter">\n' +
          '        <li if="${command.params.length === 0}">${l10n.helpManNone}</li>\n' +
          '        <li foreach="param in ${command.paramGroups[groupName]}">\n' +
          '          <code>${getSynopsis(param)}</code> <em>${getTypeDescription(param)}</em>\n' +
          '          <br/>\n' +
          '          ${describe(param)}\n' +
          '        </li>\n' +
          '      </ul>\n' +
          '    </div>\n' +
          '  </div>\n' +
          '\n' +
          '  <div if="${!command.exec}">\n' +
          '    <p class="gcli-help-header">${l10n.subCommands}:</p>\n' +
          '    <ul class="gcli-help-${subcommands}">\n' +
          '      <li if="${subcommands.length === 0}">${l10n.subcommandsNone}</li>\n' +
          '      <li foreach="subcommand in ${subcommands}">\n' +
          '        ${subcommand.name}: ${subcommand.description}\n' +
          '        <span class="gcli-out-shortcut" data-command="help ${subcommand.name}"\n' +
          '            onclick="${onclick}" ondblclick="${ondblclick}">\n' +
          '          help ${subcommand.name}\n' +
          '        </span>\n' +
          '      </li>\n' +
          '    </ul>\n' +
          '  </div>\n' +
          '\n' +
          '</div>\n',
        options: { allowEval: true, stack: 'commandData->view' },
        data: getHelpManData(commandData, context),
        css: helpCss,
        cssId: 'gcli-help'
      };
    }
  },
  {
    // Convert a command into a string based man page
    item: 'converter',
    from: 'commandData',
    to: 'stringView',
    exec: function(commandData, context) {
      return {
        html:
          '<div>## ${command.name}\n' +
          '\n' +
          '# ${l10n.helpManSynopsis}: ${command.name} <loop foreach="param in ${command.params}">${getSynopsis(param)} </loop>\n' +
          '\n' +
          '# ${l10n.helpManDescription}:\n' +
          '\n' +
          '${command.manual || command.description}\n' +
          '\n' +
          '<loop foreach="groupName in ${command.paramGroups}">\n' +
          '<span if="${command.exec}"># ${groupName}:\n' +
          '\n' +
          '<span if="${command.params.length === 0}">${l10n.helpManNone}</span><loop foreach="param in ${command.paramGroups[groupName]}">* ${param.name}: ${getTypeDescription(param)}\n' +
          '  ${param.manual || param.description}\n' +
          '</loop>\n' +
          '</span>\n' +
          '</loop>\n' +
          '\n' +
          '<span if="${!command.exec}"># ${l10n.subCommands}:\n' +
          '\n' +
          '<span if="${subcommands.length === 0}">${l10n.subcommandsNone}</span>\n' +
          '<loop foreach="subcommand in ${subcommands}">* ${subcommand.name}: ${subcommand.description}\n' +
          '</loop>\n' +
          '</div>\n',
        options: { allowEval: true, stack: 'commandData->stringView' },
        data: getHelpManData(commandData, context)
      };
    }
  },
  {
    // Convert a list of commands into a formatted list
    item: 'converter',
    from: 'commandsData',
    to: 'view',
    exec: function(commandsData, context) {
      return {
        html:
          '<div>\n' +
          '  <div if="${includeIntro}">\n' +
          '    <p>GCLI is an experiment to create a highly usable command line for web developers.</p>\n' +
          '    <p>\n' +
          '      Useful links:\n' +
          '      <a href=\'https://github.com/joewalker/gcli\'>Source</a> (Apache-2.0),\n' +
          '      <a href=\'https://github.com/joewalker/gcli/blob/master/docs/index.md\'>Documentation</a> (for users/embedders),\n' +
          '      <a href=\'https://wiki.mozilla.org/DevTools/Features/GCLI\'>Mozilla feature page</a> (for GCLI in the web console).\n' +
          '    </p>\n' +
          '  </div>\n' +
          '\n' +
          '  <p>${heading}</p>\n' +
          '\n' +
          '  <table>\n' +
          '    <tr foreach="command in ${matchingCommands}">\n' +
          '      <td class="gcli-help-name">${command.name}</td>\n' +
          '      <td class="gcli-help-arrow">-</td>\n' +
          '      <td>\n' +
          '        ${command.description}\n' +
          '        <span class="gcli-out-shortcut"\n' +
          '            onclick="${onclick}" ondblclick="${ondblclick}"\n' +
          '            data-command="help ${command.name}">help ${command.name}</span>\n' +
          '      </td>\n' +
          '    </tr>\n' +
          '  </table>\n' +
          '</div>\n',
        options: { allowEval: true, stack: 'commandsData->view' },
        data: getHelpListData(commandsData, context),
        css: helpCss,
        cssId: 'gcli-help'
      };
    }
  },
  {
    // Convert a list of commands into a formatted list
    item: 'converter',
    from: 'commandsData',
    to: 'stringView',
    exec: function(commandsData, context) {
      return {
        html:
          '<pre><span if="${includeIntro}">## Welcome to GCLI\n' +
          '\n' +
          'GCLI is an experiment to create a highly usable JavaScript command line for developers.\n' +
          '\n' +
          'Useful links:\n' +
          '- Source (Apache-2.0): https://github.com/joewalker/gcli\n' +
          '- Documentation: https://github.com/joewalker/gcli/blob/master/docs/index.md</span>\n' +
          '\n' +
          '# ${heading}\n' +
          '\n' +
          '<loop foreach="command in ${matchingCommands}">${command.name} &#x2192; ${command.description}\n' +
          '</loop></pre>',
        options: { allowEval: true, stack: 'commandsData->stringView' },
        data: getHelpListData(commandsData, context)
      };
    }
  }
];

});
