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

'use strict';

/*
 * The intent of this module is to pull together all the parts needed to start
 * a command line to make it easier to get started.
 *
 * Basic usage is like this:
 *
 *     var gcli = require('gcli/index');
 *
 *     // A system is a set of commands/types/etc that the command line uses
 *     var system = gcli.createSystem();
 *     system.addItems(gcli.items);
 *     system.addItems(gcli.commandItems);
 *     system.addItems([
 *       // Your own commands go here
 *     ]);
 *
 *     // Create the UI
 *     gcli.createTerminal(system).then(function(terminal) {
 *       // Take any actions when the command line starts for example
 *       terminal.language.showIntro();
 *     });
 */

// Patch-up old browsers
require('./util/legacy');

exports.createSystem = require('./system').createSystem;

var Terminal = require('./ui/terminal').Terminal;
exports.createTerminal = Terminal.create.bind(Terminal);

/**
 * This is all the items we need for a basic GCLI (except for the commands)
 */
exports.items = [
  require('./items/basic').items,
  require('./items/ui').items,
  require('./items/remote').items,
].reduce(function(prev, curr) { return prev.concat(curr); }, []);

exports.commandItems = require('./items/standard').items;
