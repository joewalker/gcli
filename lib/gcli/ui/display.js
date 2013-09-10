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

var util = require('util/util');
var domtemplate = require('util/domtemplate');

var settings = require('gcli/settings');
var CommandOutputManager = require('gcli/canon').CommandOutputManager;
var Requisition = require('gcli/cli').Requisition;

var intro = require('gcli/ui/intro');
var Terminal = require('gcli/ui/terminal').Terminal;


/**
 * createDisplay() calls 'new Display()' but returns an object which exposes a
 * much restricted set of functions rather than all those exposed by Display.
 * This allows for robust testing without exposing too many internals.
 * @param options See Display() for a description of the available options.
 */
exports.createDisplay = function(options) {
  if (options.settings != null) {
    settings.setDefaults(options.settings);
  }
  var display = new Display(options);
  var requisition = display.requisition;
  return {
    /**
     * The exact shape of the object returned by exec is likely to change in
     * the near future. If you do use it, please expect your code to break.
     */
    exec: requisition.exec.bind(requisition),
    update: requisition.update.bind(requisition),
    updateExec: requisition.updateExec.bind(requisition),
    destroy: display.destroy.bind(display)
  };
};

/**
 * View is responsible for generating the web UI for GCLI.
 */
function Display(options) {
  var doc = options.document || document;

  this.commandOutputManager = options.commandOutputManager;
  if (this.commandOutputManager == null) {
    this.commandOutputManager = new CommandOutputManager();
  }

  this.requisition = new Requisition(options.environment || {}, doc,
                                     this.commandOutputManager);

  this.terminal = new Terminal(options, {
    requisition: this.requisition,
    document: doc
  });

  intro.maybeShowIntro(this.commandOutputManager,
                       this.requisition.conversionContext);
}

/**
 * Call the destroy functions of the components that we created
 */
Display.prototype.destroy = function() {
  this.terminal.destroy();
  this.requisition.destroy();

  this.commandOutputManager = undefined;
  this.terminal = undefined;
  this.requisition = undefined;
};

exports.Display = Display;

});
