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


var Q = require('gcli/promise');
var resource = require('gcli/types/resource');
var types = require('gcli/types');
var Status = require('gcli/types').Status;

var assert = require('test/assert');

var tempDocument = undefined;

exports.setup = function(options) {
  tempDocument = resource.getDocument();
  resource.setDocument(options.window.document);
};

exports.shutdown = function(options) {
  resource.setDocument(tempDocument);
  tempDocument = undefined;
};

exports.testAllPredictions1 = function(options) {
  // firefox doesn't support digging into scripts/stylesheets
  if (options.isFirefox) {
    assert.log('Skipping checks due to jsdom/firefox document.stylsheets support.');
    return
  }

  var resource = types.getType('resource');
  resource.getLookup().then(assert.checkCalled(function(options) {
    assert.ok(options.length > 1, 'have all resources');

    options.forEach(function(prediction) {
      checkPrediction(resource, prediction);
    });
  }));
};

exports.testScriptPredictions = function(options) {
  // firefox doesn't support digging into scripts
  if (options.isFirefox) {
    assert.log('Skipping checks due to jsdom/firefox document.stylsheets support.');
    return
  }

  var resource = types.getType({ name: 'resource', include: 'text/javascript' });
  resource.getLookup().then(assert.checkCalled(function(options) {
    assert.ok(options.length > 1, 'have js resources');

    options.forEach(function(prediction) {
      checkPrediction(resource, prediction);
    });
  }));
};

exports.testStylePredictions = function(options) {
  // jsdom/firefox don't support digging into stylesheets
  if (options.isFirefox) {
    assert.log('Skipping checks due to jsdom/firefox document.stylsheets support.');
    return
  }

  var resource = types.getType({ name: 'resource', include: 'text/css' });
  resource.getLookup().then(assert.checkCalled(function(options) {
    assert.ok(options.length >= 1, 'have css resources');

    options.forEach(function(prediction) {
      checkPrediction(resource, prediction);
    });
  }));
};

exports.testAllPredictions2 = function(options) {
  var scriptRes = types.getType({ name: 'resource', include: 'text/javascript' });
  scriptRes.getLookup().then(assert.checkCalled(function(scriptOptions) {
    var styleRes = types.getType({ name: 'resource', include: 'text/css' });
    styleRes.getLookup().then(assert.checkCalled(function(styleOptions) {
      var allRes = types.getType({ name: 'resource' });
      allRes.getLookup().then(assert.checkCalled(function(allOptions) {
        assert.is(scriptOptions.length + styleOptions.length,
                  allOptions.length,
                  'split');
      }));
    }));
  }));
};

exports.testAllPredictions3 = function(options) {
  var res1 = types.getType({ name: 'resource' });
  res1.getLookup().then(assert.checkCalled(function(options1) {
    var res2 = types.getType('resource');
    res2.getLookup().then(assert.checkCalled(function(options2) {
      assert.is(options1.length, options2.length, 'type spec');
    }));
  }));
};

function checkPrediction(res, prediction) {
  var name = prediction.name;
  var value = prediction.value;

  res.parseString(name).then(assert.checkCalled(function(conversion) {
    assert.is(conversion.getStatus(), Status.VALID, 'status VALID for ' + name);
    assert.is(conversion.value, value, 'value for ' + name);

    var strung = res.stringify(value);
    assert.is(strung, name, 'stringify for ' + name);

    assert.is(typeof value.loadContents, 'function', 'resource for ' + name);
    assert.is(typeof value.element, 'object', 'resource for ' + name);
  }, this), console.error);
}


});
