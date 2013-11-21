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

exports.items = [
  require('./commands/clear').items,
  require('./commands/connect').items,
  require('./commands/context').items,
  require('./commands/exec').items,
  require('./commands/global').items,
  require('./commands/help').items,
  require('./commands/intro').items,
  require('./commands/lang').items,
  require('./commands/preflist').items,
  require('./commands/pref').items,
  require('./commands/test').items,

  require('./commands/demo/alert').items,
  require('./commands/demo/bugs').items,
  require('./commands/demo/demo').items,
  require('./commands/demo/echo').items,
  require('./commands/demo/edit').items,
  // require('./commands/demo/git').items,
  // require('./commands/demo/hg').items,
  require('./commands/demo/sleep').items,
  require('./commands/demo/theme').items,

].reduce(function(prev, curr) { return prev.concat(curr); }, []);
