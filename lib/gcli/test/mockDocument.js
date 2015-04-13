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

var nodetype = require('../types/node');
var jsdom = require('jsdom').jsdom;

var usingMockDocument = false;

/**
 * Registration and de-registration.
 */
exports.setup = function(requisition) {
  if (requisition.environment.window == null) {
    var document = jsdom('' +
         '<html>' +
         '<head>' +
         '  <style>#gcli-root { color: red; }</style>' +
         '  <script>var t = 42;</script>' +
         '</head>' +
         '<body>' +
         '<div id="gcli-root"></div>' +
         '</body>' +
         '</html>');
    requisition.environment.window = document.defaultView;

    usingMockDocument = true;
  }
};

exports.shutdown = function(requisition) {
  if (usingMockDocument) {
    requisition.environment.window = undefined;
  }
};
