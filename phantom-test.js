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

var page = require('webpage').create();

var pageLoaded = function(status) {
  setInterval(function() {
    var complete = page.evaluate(function() {
      return document.complete;
    });

    if (complete === true) {
      phantom.exit();
    }
  }, 50);
};

page.onConsoleMessage = function() {
  console.log.apply(console, arguments);
};

page.open('localtest.html', pageLoaded);
