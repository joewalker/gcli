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

  require('gcli/index');

  require('gcli/commands/help').startup();
  require('gcli/commands/pref').startup();
  require('gcli/commands/pref_list').startup();
  require('gcli/commands/intro').startup();

  require('demo/commands/basic').startup();
  require('demo/commands/bugs').startup();
  require('demo/commands/demo').startup();

});
