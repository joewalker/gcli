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

var createSystem = require('../system').createSystem;
var connectSystems = require('../system').connectSystems;

// Patch-up IE9
require('../util/legacy');

/**
 * Connect to a remote system and setup the commands/types/converters etc needed
 * to make it all work
 */
exports.createSystem = function(options) {
  options = options || {};

  var system = createSystem();

  // The items that are always needed on the client
  var items = [
    require('../items/basic').items,
    require('../items/ui').items,
    require('../items/remote').items,
    // The context command makes no sense on the server
    require('../commands/context').items,
  ].reduce(function(prev, curr) { return prev.concat(curr); }, []);
  system.addItems(items);

  // These are the commands stored on the remote side that have converters which
  // we'll need to present the data. Ideally front.specs() would transfer these,
  // that doesn't happen yet so we add them manually
  var requiredConverters = [
    require('../cli').items,
    require('../commands/clear').items,
    require('../commands/connect').items,
    require('../commands/exec').items,
    require('../commands/global').items,
    require('../commands/help').items,
    require('../commands/intro').items,
    require('../commands/lang').items,
    require('../commands/preflist').items,
    require('../commands/pref').items,
    require('../commands/test').items,
  ].reduce(function(prev, curr) { return prev.concat(curr); }, [])
   .filter(function(item) { return item.item === 'converter'; });
  system.addItems(requiredConverters);

  var connector = system.connectors.get(options.method);
  return connectSystems(system, connector, options.url).then(function() {
    return system;
  });
};
