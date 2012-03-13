/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var canon = require('gcli/canon');
var l10n = require('gcli/l10n');


/**
 * A cache of the remote systems that we are connected to
 */
var connections = {};

/**
 * Where we store the script tag that loads socket.io.js
 */
var scriptTag;

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  canon.addCommand(connectCommandSpec);
};

exports.shutdown = function() {
  canon.removeCommand(connectCommandSpec);

  if (scriptTag) {
    if (scriptTag.parentNode) {
      scriptTag.parentNode.removeChild(this.style);
    }
    scriptTag = undefined;
  }

  Object.keys(connections).forEach(function(url) {
    connections[url].disconnect();
  });
};


/**
 * 'connect' command
 */
var connectCommandSpec = {
  name: 'connect',
  description: l10n.lookup('connectDesc'),
  manual: l10n.lookup('connectManual'),
  params: [
    {
      name: 'name',
      type: 'string',
      defaultValue: null,
      description: l10n.lookup('connectNameDesc'),
      manual: l10n.lookup('connectNameManual')
    },
    {
      name: 'url',
      type: 'string',
      defaultValue: 'http://localhost:9999',
      description: l10n.lookup('connectUrlDesc'),
      manual: l10n.lookup('connectUrlManual')
    }
  ],

  exec: function(args, context) {
    var promise = context.createPromise();

    if (connections[url]) {
      throw new Error('Already connected to \'' + url + '\'');
    }

    var url = args.url + '/socket.io/socket.io.js';

    if (scriptTag) {
      connections[url] = new Listener(args.name, args.url, promise);
    } else {
      scriptTag = addScriptTag(url, context.document, function() {
        connections[url] = new Listener(args.name, args.url, promise);
      }.bind(this));
    }

    return promise;
  }
};

/**
 * Manage a connection with a remote system over socket.io / web sockets
 * @param name The name given to this connection
 * @param url The address of the remote server (scheme://host:port)
 * @param promise The promise to
 */
function Listener(name, url, promise) {
  this.name = name;
  this.promise = promise;
  this.socket = io.connect(url);
  this.socket.emit('join');

  this.socket.on('addCommands', this.addCommands.bind(this));
  this.socket.on('reply', this.reply.bind(this));
  this.socket.on('progress', this.progress.bind(this));

  this.promises = {};
  this.nextExecId = 0;

  if (this.name !== null) {
    canon.addCommand({
      name: this.name,
      description: 'Commands on ' + url
    });
  }
}

/**
 * The remote server has sent us an 'addCommand' message
 */
Listener.prototype.addCommands = function(commandSpecs) {
  var names = Object.keys(commandSpecs);

  names.forEach(function(name) {
    var commandSpec = commandSpecs[name];
    var originalName = commandSpec.name;

    commandSpec.exec = function(args, context) {
      var promise = context.createPromise();
      var id = '' + (this.nextExecId++);
      this.socket.emit('exec', {
        id: id,
        command: originalName,
        args: args
      });
      this.promises[id] = promise;
      return promise;
    }.bind(this);

    if (this.name !== null) {
      commandSpec.name = this.name + ' ' + commandSpec.name;
    }
    canon.addCommand(commandSpec);

    return commandSpec.name;
  }.bind(this));

  this.promise.resolve('Added ' + names.join(', '));
};

/**
 *
 */
Listener.prototype.reply = function(replySpec) {
  var promise = this.promises[replySpec.id];
  promise.resolve(replySpec.reply);
  delete this.promises[replySpec.id];
};

/**
 *
 */
Listener.prototype.progress = function(progressSpec) {
  var promise = this.promises[progressSpec.id];
  promise.progress(progressSpec.progress);
};


/**
 * Utility to allow us to add a script tag asynchronously.
 * @param src Either a string to use as the src of the new script tag or an
 * array of strings, we'll create one for each.
 * @param doc The document element to work from
 * @param callback A function to be called when the script tag has loaded or
 * in the case of an array, when all script tags have loaded.
 * @param context 'this' for the callback
 * @return The added script tag, or if src is an array, an array of added
 * script tags
 */
function addScriptTag(src, doc, callback, context) {
  doc = doc || document;

  if (src == null) {
    if (callback) {
      callback.call(context);
    }
    return null;
  }

  if (Array.isArray(src)) {
    var outstanding = src.length;
    var scriptTags = src.map(function(s) {
      return this.addScriptTag(s, function() {
        outstanding--;
        if (outstanding === 0 && callback) {
          callback.call(context);
        }
      });
    }, this);

    if (src.length === 0 && callback) {
      callback.call(context);
    }
    return scriptTags;
  }

  var script = doc.createElement('script');
  script.onload = function() {
    if (callback) {
      callback.call(context);
    }
  };
  script.onreadystatechange = function() {
    if (script.readyState == 'loaded' || script.readyState == 'complete') {
      script.onload();
    }
  };
  script.type = 'text/javascript';
  script.src = src;
  doc.head.appendChild(script);

  return script;
}


});
