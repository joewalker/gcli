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


var canon = require('gcli/canon');
var util = require('gcli/util');
var Q = require('gcli/promise');

var types = require('gcli/types');
var Type = require('gcli/types').Type;
var Status = require('gcli/types').Status;
var Conversion = require('gcli/types').Conversion;
var SelectionType = require('gcli/types/selection').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;

var options = undefined;

/**
 * Registration and de-registration.
 */
exports.setup = function(opts) {
  options = opts;

  // setup/shutdown need to register/unregister types, however that means we
  // need to re-initialize exports.option1 and exports.option2 with the
  // actual types
  exports.option1.type = types.getType('string');
  exports.option2.type = types.getType('number');

  types.registerType(exports.optionType);
  types.registerType(exports.optionValue);
  types.registerType(exports.SlowNumType);

  canon.addCommand(exports.tsv);
  canon.addCommand(exports.tsr);
  canon.addCommand(exports.tso);
  canon.addCommand(exports.tse);
  canon.addCommand(exports.tsj);
  canon.addCommand(exports.tsb);
  canon.addCommand(exports.tss);
  canon.addCommand(exports.tsu);
  canon.addCommand(exports.tsn);
  canon.addCommand(exports.tsnDif);
  canon.addCommand(exports.tsnExt);
  canon.addCommand(exports.tsnExte);
  canon.addCommand(exports.tsnExten);
  canon.addCommand(exports.tsnExtend);
  canon.addCommand(exports.tsnDeep);
  canon.addCommand(exports.tsnDeepDown);
  canon.addCommand(exports.tsnDeepDownNested);
  canon.addCommand(exports.tsnDeepDownNestedCmd);
  canon.addCommand(exports.tselarr);
  canon.addCommand(exports.tsm);
  canon.addCommand(exports.tsg);
  canon.addCommand(exports.tshidden);
  canon.addCommand(exports.tscook);
  canon.addCommand(exports.tslong);
  canon.addCommand(exports.tsslow);
};

exports.shutdown = function(opts) {
  canon.removeCommand(exports.tsv);
  canon.removeCommand(exports.tsr);
  canon.removeCommand(exports.tso);
  canon.removeCommand(exports.tse);
  canon.removeCommand(exports.tsj);
  canon.removeCommand(exports.tsb);
  canon.removeCommand(exports.tss);
  canon.removeCommand(exports.tsu);
  canon.removeCommand(exports.tsn);
  canon.removeCommand(exports.tsnDif);
  canon.removeCommand(exports.tsnExt);
  canon.removeCommand(exports.tsnExte);
  canon.removeCommand(exports.tsnExten);
  canon.removeCommand(exports.tsnExtend);
  canon.removeCommand(exports.tsnDeep);
  canon.removeCommand(exports.tsnDeepDown);
  canon.removeCommand(exports.tsnDeepDownNested);
  canon.removeCommand(exports.tsnDeepDownNestedCmd);
  canon.removeCommand(exports.tselarr);
  canon.removeCommand(exports.tsm);
  canon.removeCommand(exports.tsg);
  canon.removeCommand(exports.tshidden);
  canon.removeCommand(exports.tscook);
  canon.removeCommand(exports.tslong);
  canon.removeCommand(exports.tsslow);

  types.deregisterType(exports.SlowNumType);
  types.deregisterType(exports.optionType);
  types.deregisterType(exports.optionValue);
};


function SlowSelType(typeSpec) {
}

SlowSelType.prototype = Object.create(Type.prototype);

SlowSelType.prototype.stringify = function(value) {
  if (value == null) {
    return '';
  }
  return '' + value;
};

SlowSelType.prototype.parse = function(arg) {
  var predictions = function() {
    var deferred = Q.defer();
    window.setTimeout(function() {
      deferred.resolve([
        { name: '1', value: 1 },
        { name: '10', value: 10 },
        { name: '100', value: 100 },
        { name: '1000', value: 1000 }
      ]);
    }.bind(this), 100);
    return deferred.promise;
  };

  if (arg.text.replace(/^\s*-?/, '').length === 0) {
    return new Conversion(undefined, arg, Status.INCOMPLETE, '', predictions);
  }
  var value = parseInt(arg.text, 10);
  if (isNaN(value)) {
    return new Conversion(undefined, arg, Status.ERROR, 'nan', predictions);
  }
  return new Conversion(value, arg);
};

SlowSelType.prototype.name = 'slowsel';

exports.SlowNumType = SlowSelType;


exports.option1 = { type: types.getType('string') };
exports.option2 = { type: types.getType('number') };

var lastOption = undefined;

exports.optionType = new SelectionType({
  name: 'optionType',
  lookup: [
    { name: 'option1', value: exports.option1 },
    { name: 'option2', value: exports.option2 }
  ],
  noMatch: function() {
    lastOption = undefined;
  },
  stringify: function(option) {
    lastOption = option;
    return SelectionType.prototype.stringify.call(this, option);
  },
  parse: function(arg) {
    var conversion = SelectionType.prototype.parse.call(this, arg);
    lastOption = conversion.value;
    return conversion;
  }
});

exports.optionValue = new DeferredType({
  name: 'optionValue',
  defer: function() {
    if (lastOption && lastOption.type) {
      return lastOption.type;
    }
    else {
      return types.getType('blank');
    }
  }
});

exports.onCommandExec = util.createEvent('commands.onCommandExec');

function createExec(name) {
  return function(args, context) {
    var data = {
      command: exports[name],
      args: args,
      context: context
    };
    exports.onCommandExec(data);
    return data;
  };
}

exports.tsv = {
  name: 'tsv',
  params: [
    { name: 'optionType', type: 'optionType' },
    { name: 'optionValue', type: 'optionValue' }
  ],
  exec: createExec('tsv')
};

exports.tsr = {
  name: 'tsr',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsr')
};

exports.tso = {
  name: 'tso',
  params: [ { name: 'text', type: 'string', defaultValue: null } ],
  exec: createExec('tso')
};

exports.tse = {
  name: 'tse',
  params: [
    { name: 'node', type: 'node' },
    {
      group: 'options',
      params: [
        { name: 'nodes', type: { name: 'nodelist' } },
        { name: 'nodes2', type: { name: 'nodelist', allowEmpty: true } }
      ]
    }
  ],
  exec: createExec('tse')
};

exports.tsj = {
  name: 'tsj',
  params: [ { name: 'javascript', type: 'javascript' } ],
  exec: createExec('tsj')
};

exports.tsb = {
  name: 'tsb',
  params: [ { name: 'toggle', type: 'boolean' } ],
  exec: createExec('tsb')
};

exports.tss = {
  name: 'tss',
  exec: createExec('tss')
};

exports.tsu = {
  name: 'tsu',
  params: [ { name: 'num', type: { name: 'number', max: 10, min: -5, step: 3 } } ],
  exec: createExec('tsu')
};

exports.tsn = {
  name: 'tsn'
};

exports.tsnDif = {
  name: 'tsn dif',
  description: 'tsn dif',
  params: [ { name: 'text', type: 'string', description: 'tsn dif text' } ],
  exec: createExec('tsnDif')
};

exports.tsnExt = {
  name: 'tsn ext',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExt')
};

exports.tsnExte = {
  name: 'tsn exte',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('')
};

exports.tsnExten = {
  name: 'tsn exten',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExte')
};

exports.tsnExtend = {
  name: 'tsn extend',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExtend')
};

exports.tsnDeep = {
  name: 'tsn deep'
};

exports.tsnDeepDown = {
  name: 'tsn deep down'
};

exports.tsnDeepDownNested = {
  name: 'tsn deep down nested'
};

exports.tsnDeepDownNestedCmd = {
  name: 'tsn deep down nested cmd',
  exec: createExec('tsnDeepDownNestedCmd')
};

exports.tshidden = {
  name: 'tshidden',
  hidden: true,
  params: [
    {
      group: 'Options',
      params: [
        {
          name: 'visible',
          type: 'string',
          defaultValue: null,
          description: 'visible'
        },
        {
          name: 'invisiblestring',
          type: 'string',
          description: 'invisiblestring',
          defaultValue: null,
          hidden: true
        },
        {
          name: 'invisibleboolean',
          type: 'boolean',
          description: 'invisibleboolean',
          hidden: true
        }
      ]
    }
  ],
  exec: createExec('tshidden')
};

exports.tselarr = {
  name: 'tselarr',
  params: [
    { name: 'num', type: { name: 'selection', data: [ '1', '2', '3' ] } },
    { name: 'arr', type: { name: 'array', subtype: 'string' } }
  ],
  exec: createExec('tselarr')
};

exports.tsm = {
  name: 'tsm',
  description: 'a 3-param test selection|string|number',
  params: [
    { name: 'abc', type: { name: 'selection', data: [ 'a', 'b', 'c' ] } },
    { name: 'txt', type: 'string' },
    { name: 'num', type: { name: 'number', max: 42, min: 0 } }
  ],
  exec: createExec('tsm')
};

exports.tsg = {
  name: 'tsg',
  description: 'a param group test',
  params: [
    {
      name: 'solo',
      type: { name: 'selection', data: [ 'aaa', 'bbb', 'ccc' ] },
      description: 'solo param'
    },
    {
      group: 'First',
      params: [
        {
          name: 'txt1',
          type: 'string',
          defaultValue: null,
          description: 'txt1 param'
        },
        {
          name: 'bool',
          type: 'boolean',
          description: 'bool param'
        }
      ]
    },
    {
      group: 'Second',
      params: [
        {
          name: 'txt2',
          type: 'string',
          defaultValue: 'd',
          description: 'txt2 param'
        },
        {
          name: 'num',
          type: { name: 'number', min: 40 },
          defaultValue: 42,
          description: 'num param'
        }
      ]
    }
  ],
  exec: createExec('tsg')
};

exports.tscook = {
  name: 'tscook',
  description: 'param group test to catch problems with cookie command',
  params: [
    {
      name: 'key',
      type: 'string',
      description: 'tscookKeyDesc'
    },
    {
      name: 'value',
      type: 'string',
      description: 'tscookValueDesc'
    },
    {
      group: 'tscookOptionsDesc',
      params: [
        {
          name: 'path',
          type: 'string',
          defaultValue: '/',
          description: 'tscookPathDesc'
        },
        {
          name: 'domain',
          type: 'string',
          defaultValue: null,
          description: 'tscookDomainDesc'
        },
        {
          name: 'secure',
          type: 'boolean',
          description: 'tscookSecureDesc'
        }
      ]
    }
  ],
  exec: createExec('tscook')
};

exports.tslong = {
  name: 'tslong',
  description: 'long param tests to catch problems with the jsb command',
  returnValue:'string',
  params: [
    {
      name: 'msg',
      type: 'string',
      description: 'msg Desc'
    },
    {
      group: "Options Desc",
      params: [
        {
          name: 'num',
          type: 'number',
          description: 'num Desc',
          defaultValue: 2
        },
        {
          name: 'sel',
          type: {
            name: 'selection',
            lookup: [
              { name: "space", value: " " },
              { name: "tab", value: "\t" }
            ]
          },
          description: 'sel Desc',
          defaultValue: ' '
        },
        {
          name: 'bool',
          type: 'boolean',
          description: 'bool Desc'
        },
        {
          name: 'num2',
          type: 'number',
          description: 'num2 Desc',
          defaultValue: -1
        },
        {
          name: 'bool2',
          type: 'boolean',
          description: 'bool2 Desc'
        },
        {
          name: 'sel2',
          type: {
            name: 'selection',
            data: ['collapse', 'expand', 'end-expand', 'expand-strict']
          },
          description: 'sel2 Desc',
          defaultValue: "collapse"
        }
      ]
    }
  ],
  exec: createExec('tslong')
};

exports.tsslow = {
  name: 'tsslow',
  params: [
    { name: 'slow', type: 'slownum' }
  ],
  exec: createExec('tsslow')
};


});
