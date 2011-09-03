/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var l10n = require('gcli/l10n');
var util = require('gcli/util');
var dom = require('gcli/util').dom;

var gcli = require('gcli/index');

var Argument = require('gcli/argument').Argument;

var types = require('gcli/types');
var Conversion = require('gcli/types').Conversion;
var Type = require('gcli/types').Type;
var SelectionType = require('gcli/types').SelectionType;
var Status = require('gcli/types').Status;

var field = require('gcli/ui/field');
var Field = require('gcli/ui/field').Field;


/**
 * Utility to create a link to a bug number
 */
function getBugLink(bugid) {
  return '<br/>To comment on this command, use <a target="_blank" ' +
      'href="https://bugzilla.mozilla.org/show_bug.cgi?id=' + bugid + '">' +
      'bug ' + bugid + '</a>.';
}

/**
 * A type for the resources in the current page
 */
function ResourceType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('ResourceType can not be customized');
  }
}

ResourceType.prototype = Object.create(types.SelectionType.prototype);

ResourceType.prototype.lookup = function() {
  var reply = [];
  for (var i = 0; i < document.styleSheets.length; i++) {
    var sheet = document.styleSheets[i];
    // When we're in chrome, replace style#i with style#Ln where n is the line
    // number of the style element in the HTML document.
    reply.push({
      name: sheet.href || 'style#' + i,
      value: sheet
    });
  }
  reply.push({
    name: 'page',
    value: window.document
  });
  // There are other page resources that we need to include here too
  return reply;
};

ResourceType.prototype.name = 'resource';


/**
 * A CSS expression that refers to a single node
 */
function NodeType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('NodeType can not be customized');
  }
}

NodeType.prototype = Object.create(Type.prototype);

NodeType.prototype.stringify = function(value) {
  return value.__gcliQuery || 'Error';
};

NodeType.prototype.parse = function(arg) {
  if (arg.text === '') {
    return new Conversion(null, arg, Status.INCOMPLETE, 'No matches');
  }

  var nodes;
  try {
    nodes = document.querySelectorAll(arg.text);
  }
  catch (ex) {
    return new Conversion(null, arg, Status.ERROR,
        l10n.lookup('node_parse_syntax'));
  }

  if (nodes.length === 0) {
    return new Conversion(null, arg, Status.INCOMPLETE, 'No matches');
  }

  if (nodes.length === 1) {
    var node = nodes.item(0);
    node.__gcliQuery = arg.text;
    return new Conversion(node, arg, Status.VALID, '');
  }

  return new Conversion(null, arg, Status.ERROR,
      'Too many matches (' + nodes.length + ')');
};

NodeType.prototype.name = 'node';

types.NodeType = NodeType;


/**
 * 'file' allows upload of a file
 */
function FileType(typeSpec) {
  if (typeSpec != null) {
    throw new Error('FileType can not be customized');
  }
}

FileType.prototype = Object.create(Type.prototype);

FileType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return value.toString();
};

FileType.prototype.parse = function(arg) {
  if (arg.text == null || arg.text === '') {
    return new Conversion(null, arg, Status.INCOMPLETE, '');
  }
  return new Conversion(arg.text, arg);
};

FileType.prototype.name = 'file';

types.FileType = FileType;


/**
 * A field that allows editing of strings
 */
function FileField(type, options) {
  this.doc = options.document;
  this.type = type;
  this.arg = new Argument();

  this.element = dom.createElement('input', null, this.doc);
  this.element.type = 'file';

  this.onInputChange = this.onInputChange.bind(this);
  this.element.addEventListener('keyup', this.onInputChange, false);

  this.fieldChanged = util.createEvent('FileField.fieldChanged');
}

FileField.prototype = Object.create(Field.prototype);

FileField.prototype.destroy = function() {
  this.element.removeEventListener('keyup', this.onKeyup, false);
};

FileField.prototype.setConversion = function(conversion) {
  this.arg = conversion.arg;
  this.element.value = conversion.arg.text;
  this.setMessage(conversion.message);
};

FileField.prototype.getConversion = function() {
  // This tweaks the prefix/suffix of the argument to fit
  this.arg = this.arg.beget(this.element.value, { prefixSpace: true });
  return this.type.parse(this.arg);
};

FileField.claim = function(type) {
  return type instanceof FileType ? Field.MATCH : Field.IF_NOTHING_BETTER;
};


/**
 * 'edit' command
 */
var editCommandSpec = {
  name: 'edit',
  description: { key: 'edit_desc' },
  manual: { key: 'edit_manual' },
  params: [
     {
       name: 'resource',
       type: 'resource',
       description: { key: 'edit_resource_desc' }
     }
   ],
   returnType: 'html',
   exec: function(args, context) {
     var element = args.resource.documentElement || args.resource.ownerNode;
     return '<textarea rows=5 cols=80 style="font-family:monospace">' +
         l10n.lookup('edit_pretend') + ':\n' +
         element.innerHTML.substring(0, 500) + '...</textarea>' +
         getBugLink(683499);
   }
};


/**
 * 'stylizer' command
 */
var stylizerCommandSpec = {
  name: 'stylizer',
  description: { key: 'stylizer_desc' },
  manual: { key: 'stylizer_manual' },
  params: [
     {
       name: 'node',
       type: 'node',
       description: { key: 'stylizer_node_desc' },
     }
   ],
   returnType: 'html',
   exec: function(args, context) {
     return l10n.lookupFormat('stylizer_reply', [ '' + args.node ]) +
         getBugLink(683502);
   }
};


var breakpoints = [];

/**
 * 'break' command
 */
var breakCommandSpec = {
  name: 'break',
  description: { key: 'break_desc' },
  manual: { key: 'break_manual' }
};

/**
 * 'break list' command
 */
var breakListCommandSpec = {
  name: 'break list',
  description: { key: 'breaklist_desc' },
  returnType: 'html',
  exec: function(args, context) {
    if (breakpoints.length === 0) {
      return l10n.lookup('breaklist_none') + getBugLink(683503);
    }

    var reply = l10n.lookup('breaklist_intro');
    reply += '<ul>';
    breakpoints.forEach(function(breakpoint) {
      reply += '<li>' + JSON.stringify(breakpoint) + '</li>';
    });
    reply += '</ul>';
    return reply + getBugLink(683503);
  }
};

/**
 * 'break add' command
 */
var breakAddCommandSpec = {
  name: 'break add',
  description: { key: 'breakadd_desc' },
  manual: { key: 'breakadd_manual' }
};

/**
 * 'break add line' command
 */
var breakAddLineCommandSpec = {
  name: 'break add line',
  description: { key: 'breakaddline_desc' },
  params: [
    {
      name: 'file',
      type: 'string',
      description: { key: 'breakaddline_file_desc' }
    },
    {
      name: 'line',
      type: { name: 'number', min: 0, step: 10 },
      description: { key: 'breakaddline_line_desc' }
    },
    {
      group: 'Options',
      params: [
        {
         name: 'if',
         type: 'string',
         description: { key: 'breakadd_if_desc' },
         defaultValue: null
        },
      ]
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    args.type = 'line';
    breakpoints.push(args);
    return l10n.lookup('breakadd_added') + getBugLink(683503);
  }
};

/**
 * 'break add function' command
 */
var breakAddFunctionCommandSpec = {
  name: 'break add function',
  description: { key: 'breakaddfunc_desc' },
  params: [
    {
      name: 'function',
      type: 'javascript',
      description: { key: 'breakaddfunc_function_desc' }
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    args.type = 'function';
    breakpoints.push(args);
    return l10n.lookup('breakadd_added') + getBugLink(683503);
  }
};

/**
 * 'break add xhr' command
 */
var breakAddXhrCommandSpec = {
  name: 'break add xhr',
  description: { key: 'breakaddxhr_desc' },
  returnType: 'html',
  exec: function(args, context) {
    args.type = 'xhr';
    breakpoints.push(args);
    return l10n.lookup('breakadd_added') + getBugLink(683503);
  }
};

/**
 * 'break add event' command
 */
var breakAddEventCommandSpec = {
  name: 'break add event',
  description: { key: 'breakaddevent_desc' },
  params: [
    {
      name: 'event',
      type: {
        name: 'selection',
        data: [
          'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mousemove',
          'mouseout', 'keydown', 'keypress', 'keyup', 'load', 'unload', 'abort',
          'error', 'resize', 'scroll', 'select', 'change', 'submit', 'reset',
          'focus', 'blur', 'DOMFocusIn', 'DOMFocusOut', 'DOMActivate',
          'DOMSubtreeModified', 'DOMNodeInserted', 'DOMNodeRemoved',
          'DOMNodeRemovedFromDocument', 'DOMNodeInsertedIntoDocument',
          'DOMAttrModified', 'DOMCharacterDataModified',
          'touchstart', 'touchend', 'touchenter', 'touchleave', 'touchmove',
          'touchcancel'
        ]
      },
      description: { key: 'breakaddevent_event_desc' }
    },
    {
      name: 'node',
      type: 'node',
      description: { key: 'breakaddevent_node_desc' }
    },
  ],
  returnType: 'html',
  exec: function(args, context) {
    args.type = 'event';
    args.node = args.node.__gcliQuery;
    breakpoints.push(args);
    return l10n.lookup('breakadd_added') + getBugLink(683503);
  }
};

/**
 * 'break next' command
 */
var breakNextCommandSpec = {
  name: 'break next',
  description: { key: 'breaknext_desc' },
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('breaknext_reply') + getBugLink(683503);
  }
};

/**
 * 'break del' command
 */
var breakDelCommandSpec = {
  name: 'break del',
  description: { key: 'breakdel_desc' },
  params: [
    {
      name: 'breakid',
      type: {
        name: 'number',
        min: 0,
        max: function() { return breakpoints.length - 1; }
      },
      description: { key: 'breakdel_breakid_desc' }
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    breakpoints.splice(args.breakid, 1);
    return l10n.lookup('breakdel_removed') + getBugLink(683503);
  }
};

/**
 * 'step' command
 */
var stepCommandSpec = {
  name: 'step',
  description: { key: 'step_desc' },
  manual: { key: 'step_manual' }
};

/**
 * 'step up' command
 */
var stepUpCommandSpec = {
  name: 'step up',
  description: { key: 'stepup_desc' },
  manual: { key: 'stepup_manual' },
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('step_insult') + getBugLink(683505);
  }
};

/**
 * 'step in' command
 */
var stepInCommandSpec = {
  name: 'step in',
  description: { key: 'stepin_desc' },
  manual: { key: 'stepin_manual' },
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('step_insult') + getBugLink(683505);
  }
};

/**
 * 'step next' command
 */
var stepNextCommandSpec = {
  name: 'step next',
  description: { key: 'stepnext_desc' },
  manual: { key: 'stepnext_manual' },
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('step_insult') + getBugLink(683505);
  }
};

/**
 * 'step on' command
 */
var stepNextCommandSpec = {
  name: 'step on',
  description: { key: 'stepon_desc' },
  manual: { key: 'stepon_manual' },
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('step_insult') + getBugLink(683505);
  }
};

/**
 * 'step to' command
 */
var stepToCommandSpec = {
  name: 'step to',
  description: { key: 'stepto_desc' },
  manual: { key: 'stepto_manual' },
  params: [
    {
      name: 'line',
      type: { name: 'number', min: 0, step: 10 },
      description: { key: 'stepto_line_desc' }
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('step_insult') + getBugLink(683505);
  }
};

/**
 * 'highlight' command
 */
var highlightCommandSpec = {
  name: 'highlight',
  description: { key: 'highlight_desc' },
  manual: { key: 'highlight_manual' },
  params: [
     {
       name: 'node',
       type: 'node',
       description: { key: 'highlight_node_desc' }
     }
   ],
   returnType: 'html',
   exec: function(args, context) {
     return l10n.lookupFormat('highlight_reply', [ '' + args.node ]) +
         getBugLink(683506);
   }
};

/**
 * 'inspect' command
 */
var inspectCommandSpec = {
  name: 'inspect',
  description: { key: 'inspect_desc' },
  manual: { key: 'inspect_manual' },
  params: [
     {
       name: 'node',
       type: 'node',
       description: { key: 'inspect_node_desc' }
     }
   ],
   returnType: 'html',
   exec: function(args, context) {
     return l10n.lookupFormat('inspect_reply', [ '' + args.node ]) +
         getBugLink(683508);
   }
};

/**
 * 'doctor' command
 */
var doctorCommandSpec = {
  name: 'doctor',
  description: { key: 'doctor_desc' },
  manual: { key: 'doctor_manual' },
  params: [
     {
       name: 'node',
       type: 'node',
       description: { key: 'doctor_node_desc' }
     }
   ],
   returnType: 'html',
   exec: function(args, context) {
     return l10n.lookupFormat('doctor_reply', [ '' + args.node ]) +
         getBugLink(683509);
   }
};

/**
 * 'echo' command
 */
var echo = {
  name: 'echo',
  description: { key: 'echo_desc' },
  params: [
    {
      name: 'message',
      type: 'string',
      description: { key: 'echo_message_desc' }
    }
  ],
  returnType: 'string',
  exec: function echo(args, context) {
    return args.message;
  }
};


/**
 * 'console' command
 */
var consoleCommandSpec = {
  name: 'console',
  description: { key: 'console_desc' },
  manual: { key: 'console_manual' }
};

/**
 * 'console clear' command
 */
var consoleClearCommandSpec = {
  name: 'console clear',
  description: { key: 'consoleclear_desc' },
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('consoleclear_reply') + getBugLink(683510);
  }
};

/**
 * 'console close' command
 */
var consoleCloseCommandSpec = {
  name: 'console close',
  description: { key: 'consoleclose_desc' },
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('consoleclose_reply') + getBugLink(683510);
  }
};

/**
 * 'console filter' command
 */
var consoleFilterCommandSpec = {
  name: 'console filter',
  description: { key: 'consolefilter_desc' },
  params: [
    {
      name: 'category',
      type: {
        name: 'selection',
        data: [ 'net', 'css', 'js', 'page' ]
      },
      description: { key: 'consolefilter_category_desc' }
    },
    {
      name: 'level',
      type: {
        name: 'selection',
        data: [ 'error', 'warning', 'log', 'debug' ]
      },
      description: { key: 'consolefilter_level_desc' }
    },
    {
      name: 'display',
      type: {
        name: 'selection',
        data: [ 'show', 'hide' ]
      },
      description: { key: 'consolefilter_display_desc' }
    },
  ],
  returnType: 'html',
  exec: function(args, context) {
    return l10n.lookup('consolefilter_reply') + getBugLink(683510);
  }
};


/**
 * 'scratchpad' command
 */
var scratchpadCommandSpec = {
  name: 'scratchpad',
  description: { key: 'scratchpad_desc' },
  params: [
    {
      group: 'Options',
      params: [
        {
          name: 'file',
          type: 'file',
          description: { key: 'scratchpad_file_desc' },
          defaultValue: null
        },
        {
          name: 'script',
          type: 'string',
          description: { key: 'scratchpad_script_desc' },
          defaultValue: null
        },
        {
          name: 'chrome',
          type: 'boolean',
          description: { key: 'scratchpad_chrome_desc' }
        }
      ]
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    // See Bug 659268 - we shouldn't need to do this
    if (args.file && args.script) {
      throw new Error(l10n.lookup('scratchpad_onesource'));
    }
    if (args.file) {
      return '<textarea rows=5 cols=80 style="font-family:monospace">' +
          l10n.lookupFormat('scratchpad_filepretend', [ args.file ]) +
          '</textarea>' +
          getBugLink(683513);
    }
    if (args.script) {
      return '<textarea rows=5 cols=80 style="font-family:monospace">' +
          l10n.lookup('scratchpad_scriptpretend') +
          ':\n' + args.script + '</textarea>' +
          getBugLink(683513);
    }
    return '<textarea rows=5 cols=80 style="font-family:monospace">' +
        l10n.lookup('scratchpad_emptypretend') + '</textarea>' +
        getBugLink(683513);
  }
};


exports.startup = function() {
  require('devtools/nls/strings');
  l10n.registerStringsSource('devtools/nls/strings');

  types.registerType(ResourceType);
  types.registerType(NodeType);
  types.registerType(FileType);

  field.addField(FileField);

  gcli.addCommand(editCommandSpec);
  gcli.addCommand(stylizerCommandSpec);
  gcli.addCommand(breakCommandSpec);
  gcli.addCommand(breakListCommandSpec);
  gcli.addCommand(breakAddCommandSpec);
  gcli.addCommand(breakAddLineCommandSpec);
  gcli.addCommand(breakAddFunctionCommandSpec);
  gcli.addCommand(breakAddXhrCommandSpec);
  gcli.addCommand(breakAddEventCommandSpec);
  gcli.addCommand(breakNextCommandSpec);
  gcli.addCommand(breakDelCommandSpec);
  gcli.addCommand(stepCommandSpec);
  gcli.addCommand(stepUpCommandSpec);
  gcli.addCommand(stepInCommandSpec);
  gcli.addCommand(stepNextCommandSpec);
  gcli.addCommand(stepToCommandSpec);
  gcli.addCommand(highlightCommandSpec);
  gcli.addCommand(inspectCommandSpec);
  gcli.addCommand(doctorCommandSpec);
  gcli.addCommand(consoleCommandSpec);
  gcli.addCommand(consoleClearCommandSpec);
  gcli.addCommand(consoleCloseCommandSpec);
  gcli.addCommand(consoleFilterCommandSpec);
  gcli.addCommand(scratchpadCommandSpec);
};

exports.startup();

exports.shutdown = function() {
  gcli.removeCommand(scratchpadCommandSpec);
  gcli.removeCommand(consoleFilterCommandSpec);
  gcli.removeCommand(consoleCloseCommandSpec);
  gcli.removeCommand(consoleClearCommandSpec);
  gcli.removeCommand(consoleCommandSpec);
  gcli.removeCommand(doctorCommandSpec);
  gcli.removeCommand(inspectCommandSpec);
  gcli.removeCommand(highlightCommandSpec);
  gcli.removeCommand(stepToCommandSpec);
  gcli.removeCommand(stepNextCommandSpec);
  gcli.removeCommand(stepInCommandSpec);
  gcli.removeCommand(stepUpCommandSpec);
  gcli.removeCommand(stepCommandSpec);
  gcli.removeCommand(breakDelCommandSpec);
  gcli.removeCommand(breakNextCommandSpec);
  gcli.removeCommand(breakAddEventCommandSpec);
  gcli.removeCommand(breakAddXhrCommandSpec);
  gcli.removeCommand(breakAddFunctionCommandSpec);
  gcli.removeCommand(breakAddLineCommandSpec);
  gcli.removeCommand(breakAddCommandSpec);
  gcli.removeCommand(breakListCommandSpec);
  gcli.removeCommand(breakCommandSpec);
  gcli.removeCommand(stylizerCommandSpec);
  gcli.removeCommand(editCommandSpec);

  field.removeField(FileField);

  types.unregisterType(FileType);
  types.unregisterType(NodeType);
  types.unregisterType(ResourceType);

  l10n.unregisterStringsSource('devtools/nls/strings');
};


});
