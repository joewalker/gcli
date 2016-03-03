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

const helpers = require('./helpers');
const assert = require('../testharness/assert');

const util = require('../util/util');
const Status = require('../types/types').Status;

exports.testCommand = function(options) {
  return helpers.audit(options, [
    {
      setup:    'tsres ',
      check: {
        predictionsContains: [ 'inline-css' ],
      }
    }
  ]);
};

exports.testAllPredictions1 = function(options) {
  if (options.isRemote || options.isNode) {
    assert.log('Can\'t directly test remote types locally.');
    return;
  }

  const context = options.requisition.conversionContext;
  const resource = options.requisition.system.types.createType('resource');
  return resource.getLookup(context).then(function(opts) {
    assert.ok(opts.length > 1, 'have all resources');

    return util.promiseEach(opts, function(prediction) {
      return checkPrediction(resource, prediction, context);
    });
  });
};

exports.testScriptPredictions = function(options) {
  if (options.isRemote || options.isNode) {
    assert.log('Can\'t directly test remote types locally.');
    return;
  }

  const context = options.requisition.conversionContext;
  const types = options.requisition.system.types;
  const resource = types.createType({ name: 'resource', include: 'text/javascript' });
  return resource.getLookup(context).then(function(opts) {
    assert.ok(opts.length > 0, 'have js resources');

    return util.promiseEach(opts, function(prediction) {
      return checkPrediction(resource, prediction, context);
    });
  });
};

exports.testStylePredictions = function(options) {
  if (options.isRemote || options.isNode) {
    assert.log('Can\'t directly test remote types locally.');
    return;
  }

  const context = options.requisition.conversionContext;
  const types = options.requisition.system.types;
  const resource = types.createType({ name: 'resource', include: 'text/css' });
  return resource.getLookup(context).then(function(opts) {
    assert.ok(opts.length >= 1, 'have css resources');

    return util.promiseEach(opts, function(prediction) {
      return checkPrediction(resource, prediction, context);
    });
  });
};

exports.testAllPredictions2 = function(options) {
  if (options.isRemote) {
    assert.log('Can\'t directly test remote types locally.');
    return;
  }

  const context = options.requisition.conversionContext;
  const types = options.requisition.system.types;

  const scriptRes = types.createType({ name: 'resource', include: 'text/javascript' });
  return scriptRes.getLookup(context).then(function(scriptOptions) {
    const styleRes = types.createType({ name: 'resource', include: 'text/css' });
    return styleRes.getLookup(context).then(function(styleOptions) {
      const allRes = types.createType({ name: 'resource' });
      return allRes.getLookup(context).then(function(allOptions) {
        assert.is(scriptOptions.length + styleOptions.length,
                  allOptions.length,
                  'split');
      });
    });
  });
};

exports.testAllPredictions3 = function(options) {
  if (options.isRemote) {
    assert.log('Can\'t directly test remote types locally.');
    return;
  }

  const context = options.requisition.conversionContext;
  const types = options.requisition.system.types;
  const res1 = types.createType({ name: 'resource' });
  return res1.getLookup(context).then(function(options1) {
    const res2 = types.createType('resource');
    return res2.getLookup(context).then(function(options2) {
      assert.is(options1.length, options2.length, 'type spec');
    });
  });
};

function checkPrediction(res, prediction, context) {
  const name = prediction.name;
  const value = prediction.value;

  return res.parseString(name, context).then(function(conversion) {
    assert.is(conversion.getStatus(), Status.VALID, 'status VALID for ' + name);
    assert.is(conversion.value, value, 'value for ' + name);

    assert.is(typeof value.loadContents, 'function', 'resource for ' + name);
    assert.is(typeof value.element, 'object', 'resource for ' + name);

    return Promise.resolve(res.stringify(value, context)).then(function(strung) {
      assert.is(strung, name, 'stringify for ' + name);
    });
  });
}
