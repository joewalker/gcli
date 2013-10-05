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

require('./index');
var gcli = require('./api').getApi();

gcli.addItems(require('./commands/clear').items);
gcli.addItems(require('./commands/connect').items);
gcli.addItems(require('./commands/context').items);
gcli.addItems(require('./commands/exec').items);
gcli.addItems(require('./commands/global').items);
gcli.addItems(require('./commands/help').items);
gcli.addItems(require('./commands/intro').items);
gcli.addItems(require('./commands/lang').items);
gcli.addItems(require('./commands/preflist').items);
gcli.addItems(require('./commands/pref').items);

gcli.addItems(require('./commands/demo/alert').items);
gcli.addItems(require('./commands/demo/bugs').items);
gcli.addItems(require('./commands/demo/demo').items);
gcli.addItems(require('./commands/demo/echo').items);
gcli.addItems(require('./commands/demo/edit').items);
// gcli.addItems(require('./commands/demo/it').items);
// gcli.addItems(require('./commands/demo/hg').items);
gcli.addItems(require('./commands/demo/sleep').items);
gcli.addItems(require('./commands/demo/theme').items);
