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
var system = require('system');

var exitOnComplete = function() {
  var complete = page.evaluate(function() {
    return document.complete;
  });

  if (complete === true) {
    phantom.exit();
  }
};

var pageLoaded = function(status) {
  setInterval(exitOnComplete, 50);
};

page.onConsoleMessage = function() {
  console.log.apply(console, arguments);
};

if (system.args.length === 1) {
  page.open('localtest.html', pageLoaded);
} else {
  if (system.args[1] === '--http') {
    page.open('http://localhost:9999/localtest.html', pageLoaded);
  }
  else if (system.args[1] === '--shutdown') {
    page.open('http://localhost:9999/localtest.html?shutdown=true', pageLoaded);
  }
  else {
    console.error('The only option is --http to load from http');
    phantom.exit(-1);
  }
}
