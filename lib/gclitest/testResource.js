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


var assert = require('test/assert');
var util = require('util/util');

var resource = require('gcli/types/resource');
var types = require('gcli/types');
var Status = require('gcli/types').Status;

var helpers = require('gclitest/helpers');


var tempDocument = undefined;

exports.setup = function(options) {
  helpers.setup(options);

  tempDocument = resource.getDocument();
  resource.setDocument(options.window.document);
};

exports.shutdown = function(options) {
  helpers.shutdown(options);

  resource.setDocument(tempDocument);
  tempDocument = undefined;
};

exports.testAllPredictions1 = function() {
  // firefox doesn't support digging into scripts/stylesheets
  if (helpers.options.isFirefox) {
    assert.skip('Skipping checks due to jsdom/firefox document.stylsheets support.');
    return;
  }

  var resource = types.getType('resource');
  return resource.getLookup().then(function(opts) {
    assert.ok(opts.length > 1, 'have all resources');

    return util.promiseEach(opts, function(prediction) {
      return checkPrediction(resource, prediction);
    });
  });
};

exports.testScriptPredictions = function() {
  // firefox doesn't support digging into scripts
  if (helpers.options.isFirefox) {
    assert.skip('Skipping checks due to jsdom/firefox document.stylsheets support.');
    return;
  }

  var resource = types.getType({ name: 'resource', include: 'text/javascript' });
  return resource.getLookup().then(function(opts) {
    assert.ok(opts.length > 1, 'have js resources');

    return util.promiseEach(opts, function(prediction) {
      return checkPrediction(resource, prediction);
    });
  });
};

exports.testStylePredictions = function() {
  // jsdom/firefox don't support digging into stylesheets
  if (helpers.options.isFirefox || helpers.options.isJsdom) {
    assert.skip('Skipping checks due to jsdom/firefox document.stylsheets support.');
    return;
  }

  var resource = types.getType({ name: 'resource', include: 'text/css' });
  return resource.getLookup().then(function(opts) {
    assert.ok(opts.length >= 1, 'have css resources');

    return util.promiseEach(opts, function(prediction) {
      return checkPrediction(resource, prediction);
    });
  });
};

exports.testAllPredictions2 = function() {
  var scriptRes = types.getType({ name: 'resource', include: 'text/javascript' });
  return scriptRes.getLookup().then(function(scriptOptions) {
    var styleRes = types.getType({ name: 'resource', include: 'text/css' });
    return styleRes.getLookup().then(function(styleOptions) {
      var allRes = types.getType({ name: 'resource' });
      return allRes.getLookup().then(function(allOptions) {
        assert.is(scriptOptions.length + styleOptions.length,
                  allOptions.length,
                  'split');
      });
    });
  });
};

exports.testAllPredictions3 = function() {
  var res1 = types.getType({ name: 'resource' });
  return res1.getLookup().then(function(options1) {
    var res2 = types.getType('resource');
    return res2.getLookup().then(function(options2) {
      assert.is(options1.length, options2.length, 'type spec');
    });
  });
};

function checkPrediction(res, prediction) {
  var name = prediction.name;
  var value = prediction.value;

  return res.parseString(name).then(function(conversion) {
    assert.is(conversion.getStatus(), Status.VALID, 'status VALID for ' + name);
    assert.is(conversion.value, value, 'value for ' + name);

    var strung = res.stringify(value);
    assert.is(strung, name, 'stringify for ' + name);

    assert.is(typeof value.loadContents, 'function', 'resource for ' + name);
    assert.is(typeof value.element, 'object', 'resource for ' + name);
  });
}


});
