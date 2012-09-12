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
var help = exports;


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');
var util = require('gcli/util');
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
      manual: l10n.lookup('helpSearchManual2'),
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
 * Create a block of data suitable to be passed to the help_list.html template
 */
function getListTemplateData(args, context) {
  var matchingCommands = canon.getCommands().filter(function(command) {
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
  matchingCommands.sort(function(c1, c2) {
    return c1.name.localeCompare(c2.name);
  });

  var heading;
  if (matchingCommands.length === 0) {
    heading = l10n.lookupFormat('helpListNone', [ args.search ]);
  }
  else if (args.search == null) {
    heading = l10n.lookup('helpListAll');
  }
  else {
    heading = l10n.lookupFormat('helpListPrefix', [ args.search ]);
  }

  return {
    l10n: l10n.propertyLookup,
    includeIntro: args.search == null,
    matchingCommands: matchingCommands,
    heading: heading,

    onclick: function(ev) {
      util.updateCommand(ev.currentTarget, context);
    },

    ondblclick: function(ev) {
      util.executeCommand(ev.currentTarget, context);
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
      util.updateCommand(ev.currentTarget, context);
    },

    ondblclick: function(ev) {
      util.executeCommand(ev.currentTarget, context);
    },

    describe: function(item, element) {
      var text = item.manual || item.description;
      var parent = element.ownerDocument.createElement('div');
      util.setContents(parent, text);
      return parent.childNodes;
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
    }
  };

  Object.defineProperty(manTemplateData, 'subcommands', {
    get: function() {
      var matching = canon.getCommands().filter(function(subcommand) {
        return subcommand.name.indexOf(command.name) === 0 &&
                subcommand.name !== command.name;
      });
      matching.sort(function(c1, c2) {
        return c1.name.localeCompare(c2.name);
      });
      return matching;
    },
    enumerable: true
  });

  return manTemplateData;
}

});
