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

/**
 * This is a list of the standard commands that are likely to be in most
 * command lines.
 *
 * Keeping this module small helps reduce bringing in unwanted dependencies.
 */
exports.items = [
  require('../cli').items,
  require('../commands/clear').items,
  require('../commands/connect').items,
  require('../commands/context').items,
  require('../commands/global').items,
  require('../commands/help').items,
  require('../commands/intro').items,
  require('../commands/lang').items,
  require('../commands/mocks').items,
  require('../commands/pref').items,
  require('../commands/preflist').items,
  require('../commands/test').items,

].reduce(function(prev, curr) { return prev.concat(curr); }, []);
