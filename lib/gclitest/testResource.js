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


var resource = require('gcli/types/resource');
var types = require('gcli/types');
var Status = require('gcli/types').Status;

var test = require('test/assert');

var tempDocument;

exports.setup = function(options) {
  tempDocument = resource.getDocument();
  resource.setDocument(options.window.document);
};

exports.shutdown = function(options) {
  resource.setDocument(tempDocument);
  tempDocument = undefined;
};

exports.testPredictions = function(options) {
  if (options.window.isFake || options.isFirefox) {
    test.log('Skipping resource tests: window.isFake || isFirefox');
    return;
  }

  var resource1 = types.getType('resource');
  var options1 = resource1.getLookup();
  test.ok(options1.length > 1, 'have resources');
  options1.forEach(function(prediction) {
    checkPrediction(resource1, prediction);
  });

  var resource2 = types.getType({ name: 'resource', include: 'text/javascript' });
  var options2 = resource2.getLookup();
  test.ok(options2.length > 1, 'have resources');
  options2.forEach(function(prediction) {
    checkPrediction(resource2, prediction);
  });

  var resource3 = types.getType({ name: 'resource', include: 'text/css' });
  var options3 = resource3.getLookup();
  // jsdom fails to support digging into stylesheets
  if (!options.isNode) {
    test.ok(options3.length >= 1, 'have resources');
  }
  else {
    test.log('Running under Node. ' +
             'Skipping checks due to jsdom document.stylsheets support.');
  }
  options3.forEach(function(prediction) {
    checkPrediction(resource3, prediction);
  });

  var resource4 = types.getType({ name: 'resource' });
  var options4 = resource4.getLookup();

  test.is(options1.length, options4.length, 'type spec');
  test.is(options2.length + options3.length, options4.length, 'split');
};

function checkPrediction(res, prediction) {
  var name = prediction.name;
  var value = prediction.value;

  var conversion = res.parseString(name);
  test.is(conversion.getStatus(), Status.VALID, 'status VALID for ' + name);
  test.is(conversion.value, value, 'value for ' + name);

  var strung = res.stringify(value);
  test.is(strung, name, 'stringify for ' + name);

  test.is(typeof value.loadContents, 'function', 'resource for ' + name);
  test.is(typeof value.element, 'object', 'resource for ' + name);
}

});
