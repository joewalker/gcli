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


var gcli = require('gcli/index');

/**
 * Registration and de-registration.
 */
exports.startup = function() {
  gcli.addCommand(echo);
  gcli.addCommand(alert);
  gcli.addCommand(edit);
  gcli.addCommand(sleep);
};

exports.shutdown = function() {
  gcli.removeCommand(echo);
  gcli.removeCommand(alert);
  gcli.removeCommand(edit);
  gcli.removeCommand(sleep);
};


/**
 * Arm window.alert with metadata
 */
var alert = {
  name: 'alert',
  description: 'Show an alert dialog',
  params: [
    {
      name: 'message',
      type: 'string',
      description: 'Message to display'
    }
  ],
  exec: function(args, context) {
    window.alert(args.message);
  }
};

/**
 * 'echo' command
 */
var echo = {
  name: 'echo',
  description: {
    root: 'Show a message',
    fr_fr: 'Afficher un message',
  },
  params: [
    {
      name: 'message',
      type: 'string',
      description: {
        root: 'The message to output',
        fr_fr: 'Le message à afficher'
      }
    }
  ],
  returnType: 'string',
  exec: function echo(args, context) {
    return args.message;
  }
};

/**
 * 'edit' command
 */
var edit = {
  name: 'edit',
  description: 'Edit a file',
  params: [
    {
      name: 'resource',
      type: { name: 'resource', include: 'text/css' },
      description: 'The resource to edit'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    var deferred = context.defer();
    args.resource.loadContents(function(data) {
      deferred.resolve('<p>This is just a demo</p>' +
                      '<textarea rows=5 cols=80>' + data + '</textarea>');
    });
    return deferred.promise;
  }
};

/**
 * 'sleep' command
 */
var sleep = {
  name: 'sleep',
  description: 'Wait for a while',
  params: [
    {
      name: 'length',
      type: { name: 'number', min: 1 },
      description: 'How long to wait (s)'
    }
  ],
  returnType: 'html',
  exec: function(args, context) {
    var deferred = context.defer();
    window.setTimeout(function() {
      deferred.resolve('done');
    }, args.length * 1000);
    return deferred.promise;
  }
};


});
