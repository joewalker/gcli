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


var Requisition = require('gcli/cli').Requisition;
var Status = require('gcli/types').Status;
var javascript = require('gcli/types/javascript');
var canon = require('gcli/canon');

var test = require('test/assert');

var debug = false;
var requ;

var assign;
var status;
var statuses;
var tempWindow;


exports.setup = function(options) {
  tempWindow = javascript.getGlobalObject();
  javascript.setGlobalObject(options.window);

  Object.defineProperty(options.window, 'donteval', {
    get: function() {
      test.ok(false, 'donteval should not be used');
      return { cant: '', touch: '', 'this': '' };
    },
    enumerable: true,
    configurable : true
  });
};

exports.shutdown = function(options) {
  delete options.window.donteval;

  javascript.setGlobalObject(tempWindow);
  tempWindow = undefined;
};

function input(typed) {
  if (!requ) {
    requ = new Requisition();
  }
  var cursor = { start: typed.length, end: typed.length };
  requ.update(typed);

  if (debug) {
    console.log('####### TEST: typed="' + typed +
        '" cur=' + cursor.start +
        ' cli=', requ);
  }

  status = requ.getStatus();
  statuses = requ.getInputStatusMarkup(cursor.start).map(function(s) {
    return Array(s.string.length + 1).join(s.status.toString()[0]);
  }).join('');

  if (requ.commandAssignment.value) {
    assign = requ.getAssignment(0);
  }
  else {
    assign = undefined;
  }
}

function predictionsHas(name) {
  return assign.getPredictions().some(function(prediction) {
    return name === prediction.name;
  }, this);
}

function check(expStatuses, expStatus, expAssign, expPredict) {
  test.is('{', requ.commandAssignment.value.name, 'is exec');

  test.is(expStatuses, statuses, 'unexpected status markup');
  test.is(expStatus.toString(), status.toString(), 'unexpected status');
  test.is(expAssign, assign.value, 'unexpected assignment');

  if (expPredict != null) {
    var contains;
    if (Array.isArray(expPredict)) {
      expPredict.forEach(function(p) {
        contains = predictionsHas(p);
        test.ok(contains, 'missing prediction ' + p);
      });
    }
    else if (typeof expPredict === 'number') {
      contains = true;
      test.is(assign.getPredictions().length, expPredict, 'prediction count');
      if (assign.getPredictions().length !== expPredict) {
        assign.getPredictions().forEach(function(prediction) {
          test.log('actual prediction: ', prediction);
        });
      }
    }
    else {
      contains = predictionsHas(expPredict);
      test.ok(contains, 'missing prediction ' + expPredict);
    }

    if (!contains) {
      test.log('Predictions: ' + assign.getPredictions().map(function(p) {
        return p.name;
      }).join(', '));
    }
  }
}

exports.testBasic = function(options) {
  if (!canon.getCommand('{')) {
    test.log('Skipping exec tests because { is not registered');
    return;
  }

  input('{');
  check('V', Status.ERROR, undefined);

  input('{ ');
  check('VV', Status.ERROR, undefined);

  input('{ w');
  check('VVI', Status.ERROR, 'w', 'window');

  input('{ windo');
  check('VVIIIII', Status.ERROR, 'windo', 'window');

  input('{ window');
  check('VVVVVVVV', Status.VALID, 'window');

  input('{ window.d');
  check('VVIIIIIIII', Status.ERROR, 'window.d', 'window.document');

  input('{ window.document.title');
  check('VVVVVVVVVVVVVVVVVVVVVVV', Status.VALID, 'window.document.title', 0);

  input('{ d');
  check('VVI', Status.ERROR, 'd', 'document');

  input('{ document.title');
  check('VVVVVVVVVVVVVVVV', Status.VALID, 'document.title', 0);

  test.ok('donteval' in options.window, 'donteval exists');

  input('{ don');
  check('VVIII', Status.ERROR, 'don', 'donteval');

  input('{ donteval');
  check('VVVVVVVVVV', Status.VALID, 'donteval', 0);

  /*
  // This is a controversial test - technically we can tell that it's an error
  // because 'donteval.' is a syntax error, however donteval is unsafe so we
  // are playing safe by bailing out early. It's enough of a corner case that
  // I don't think it warrants fixing
  input('{ donteval.');
  check('VVIIIIIIIII', Status.ERROR, 'donteval.', 0);
  */

  input('{ donteval.cant');
  check('VVVVVVVVVVVVVVV', Status.VALID, 'donteval.cant', 0);

  input('{ donteval.xxx');
  check('VVVVVVVVVVVVVV', Status.VALID, 'donteval.xxx', 0);
};


});
