/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
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
  if (options.useFakeWindow) {
    console.log('Skipping resource tests: options.useFakeWindow = true');
    return;
  }

  var resource1 = types.getType('resource');
  var predictions1 = resource1.parseString('').getPredictions();
  test.ok(predictions1.length > 1, 'have resources');
  predictions1.forEach(function(prediction) {
    checkPrediction(resource1, prediction);
  });

  var resource2 = types.getType({ name: 'resource', include: 'text/javascript' });
  var predictions2 = resource2.parseString('').getPredictions();
  test.ok(predictions2.length > 1, 'have resources');
  predictions2.forEach(function(prediction) {
    checkPrediction(resource2, prediction);
  });

  var resource3 = types.getType({ name: 'resource', include: 'text/css' });
  var predictions3 = resource3.parseString('').getPredictions();
  // jsdom fails to support digging into stylesheets
  if (!options.isNode) {
    test.ok(predictions3.length > 1, 'have resources');
  }
  predictions3.forEach(function(prediction) {
    checkPrediction(resource3, prediction);
  });

  var resource4 = types.getType({ name: 'resource' });
  var predictions4 = resource4.parseString('').getPredictions();

  test.is(predictions1.length, predictions4.length, 'type spec');
  // Bug 734045
  // test.is(predictions2.length + predictions3.length, predictions4.length, 'split');
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
