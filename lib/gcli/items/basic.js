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
 * This is a list of the types and converters that will be needed in almost all
 * command lines. The types are listed in 2 sets because delegate and selection
 * are depended on by others, (e.g boolean depends on selection) and array is
 * built into cli.js parsing somewhat.
 *
 * Keeping this module small helps reduce bringing in unwanted dependencies.
 */
exports.items = [
  require('../types/delegate').items,
  require('../types/selection').items,
  require('../types/array').items,

  require('../types/boolean').items,
  require('../types/command').items,
  require('../types/date').items,
  require('../types/javascript').items,
  require('../types/node').items,
  require('../types/number').items,
  require('../types/resource').items,
  require('../types/setting').items,
  require('../types/string').items,
  require('../types/union').items,
  require('../types/url').items,

  require('../converters/converters').items,
  require('../converters/basic').items,
  require('../converters/html').items,
  require('../converters/terminal').items,

].reduce(function(prev, curr) { return prev.concat(curr); }, []);
