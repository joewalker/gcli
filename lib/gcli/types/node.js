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
/* eslint no-unused-vars: 0 */

'use strict';

const Highlighter = require('../util/host').Highlighter;
const l10n = require('../util/l10n');
const util = require('../util/util');
const Status = require('./types').Status;
const Conversion = require('./types').Conversion;
const BlankArgument = require('./types').BlankArgument;

/**
 * Helper functions to be attached to the prototypes of NodeType and
 * NodeListType to allow terminal to tell us which nodes should be highlighted
 */
function onEnter(assignment) {
  /* global context:false */
  // TODO: GCLI doesn't support passing a context to notifications of cursor
  // position, so onEnter/onLeave/onChange are disabled below until we fix this
  assignment.highlighter = new Highlighter(context.environment.window.document);
  assignment.highlighter.nodelist = assignment.conversion.matches;
}

/** @see #onEnter() */
function onLeave(assignment) {
  if (!assignment.highlighter) {
    return;
  }

  assignment.highlighter.destroy();
  delete assignment.highlighter;
}
/** @see #onEnter() */
function onChange(assignment) {
  if (assignment.conversion.matches == null) {
    return;
  }
  if (!assignment.highlighter) {
    return;
  }

  assignment.highlighter.nodelist = assignment.conversion.matches;
}

/**
 * The exported 'node' and 'nodelist' types
 */
exports.items = [
  {
    // The 'node' type is a CSS expression that refers to a single node
    item: 'type',
    name: 'node',

    getSpec: function(commandName, paramName) {
      return {
        name: 'remote',
        commandName: commandName,
        paramName: paramName
      };
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return value.__gcliQuery || 'Error';
    },

    parse: function(arg, context) {
      let reply;

      if (arg.text === '') {
        reply = new Conversion(undefined, arg, Status.INCOMPLETE);
      }
      else {
        try {
          const nodes = context.environment.window.document.querySelectorAll(arg.text);
          if (nodes.length === 0) {
            reply = new Conversion(undefined, arg, Status.INCOMPLETE,
                                   l10n.lookup('nodeParseNone'));
          }
          else if (nodes.length === 1) {
            const node = nodes.item(0);
            node.__gcliQuery = arg.text;

            reply = new Conversion(node, arg, Status.VALID, '');
          }
          else {
            const msg = l10n.lookupFormat('nodeParseMultiple', [ nodes.length ]);
            reply = new Conversion(undefined, arg, Status.ERROR, msg);
          }

          reply.matches = nodes;
        }
        catch (ex) {
          reply = new Conversion(undefined, arg, Status.ERROR,
                                 l10n.lookup('nodeParseSyntax'));
        }
      }

      return Promise.resolve(reply);
    },

    // onEnter: onEnter,
    // onLeave: onLeave,
    // onChange: onChange
  },
  {
    // The 'nodelist' type is a CSS expression that refers to a node list
    item: 'type',
    name: 'nodelist',

    // The 'allowEmpty' option ensures that we do not complain if the entered
    // CSS selector is valid, but does not match any nodes. There is some
    // overlap between this option and 'defaultValue'. What the user wants, in
    // most cases, would be to use 'defaultText' (i.e. what is typed rather than
    // the value that it represents). However this isn't a concept that exists
    // yet and should probably be a part of GCLI if/when it does.
    // All NodeListTypes have an automatic defaultValue of an empty NodeList so
    // they can easily be used in named parameters.
    allowEmpty: false,

    constructor: function() {
      if (typeof this.allowEmpty !== 'boolean') {
        throw new Error('Legal values for allowEmpty are [true|false]');
      }
    },

    getSpec: function(commandName, paramName) {
      return {
        name: 'remote',
        commandName: commandName,
        paramName: paramName,
        blankIsValid: true
      };
    },

    getBlank: function(context) {
      let emptyNodeList = [];
      if (context != null && context.environment.window != null) {
        const doc = context.environment.window.document;
        emptyNodeList = util.createEmptyNodeList(doc);
      }
      return new Conversion(emptyNodeList, new BlankArgument(), Status.VALID);
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }
      return value.__gcliQuery || 'Error';
    },

    parse: function(arg, context) {
      let reply;
      try {
        if (arg.text === '') {
          reply = new Conversion(undefined, arg, Status.INCOMPLETE);
        }
        else {
          const nodes = context.environment.window.document.querySelectorAll(arg.text);

          if (nodes.length === 0 && !this.allowEmpty) {
            reply = new Conversion(undefined, arg, Status.INCOMPLETE,
                                   l10n.lookup('nodeParseNone'));
          }
          else {
            nodes.__gcliQuery = arg.text;
            reply = new Conversion(nodes, arg, Status.VALID, '');
          }

          reply.matches = nodes;
        }
      }
      catch (ex) {
        reply = new Conversion(undefined, arg, Status.ERROR,
                               l10n.lookup('nodeParseSyntax'));
      }

      return Promise.resolve(reply);
    },

    // onEnter: onEnter,
    // onLeave: onLeave,
    // onChange: onChange
  }
];
