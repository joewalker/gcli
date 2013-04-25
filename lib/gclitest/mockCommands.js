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

'use strict';

var util = require('util/util');
var canon = require('gcli/canon');
var types = require('gcli/types');
var Promise = require('util/promise');

exports.option1 = { };
exports.option2 = { };
exports.option3 = { };

exports.optionType = {
  name: 'optionType',
  parent: 'selection',
  lookup: [
    { name: 'option1', value: exports.option1 },
    { name: 'option2', value: exports.option2 },
    { name: 'option3', value: exports.option3 }
  ]
};

exports.optionValue = {
  name: 'optionValue',
  parent: 'delegate',
  delegateType: function(executionContext) {
    if (executionContext != null) {
      var option = executionContext.getArgsObject().optionType;
      if (option != null) {
        return option.type;
      }
    }
    return types.createType('blank');
  }
};

exports.onCommandExec = util.createEvent('commands.onCommandExec');

function createExec(name) {
  return function(args, executionContext) {
    var data = {
      command: exports[name],
      args: args,
      context: executionContext
    };
    exports.onCommandExec(data);
    var argsOut = Object.keys(args).map(function(key) {
      return key + '=' + args[key];
    }).join(', ');
    return 'Exec: ' + name + ' ' + argsOut;
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

exports.tsf = {
  name: 'tsf',
  params: [ { name: 'num', type: { name: 'number', allowFloat: true, max: 11.5, min: -6.5, step: 1.5 } } ],
  exec: createExec('tsf')
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
  exec: createExec('tsnExte')
};

exports.tsnExten = {
  name: 'tsn exten',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExten')
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
      name: 'txt2',
      type: 'string',
      defaultValue: 'd',
      description: 'txt2 param',
      option: 'Second'
    },
    {
      name: 'num',
      type: { name: 'number', min: 40 },
      defaultValue: 42,
      description: 'num param',
      option: 'Second'
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
            data: [ 'collapse', 'basic', 'with space', 'with two spaces' ]
          },
          description: 'sel2 Desc',
          defaultValue: "collapse"
        }
      ]
    }
  ],
  exec: createExec('tslong')
};

exports.tsfail = {
  name: 'tsfail',
  description: 'test errors',
  params: [
    {
      name: 'method',
      type: {
        name: 'selection',
        data: [
          'reject', 'rejecttyped',
          'throwerror', 'throwstring', 'throwinpromise',
          'noerror'
        ]
      }
    }
  ],
  exec: function(args, context) {
    if (args.method === 'reject') {
      var deferred = context.defer();
      setTimeout(function() {
        deferred.reject('rejected promise');
      }, 10);
      return deferred.promise;
    }

    if (args.method === 'rejecttyped') {
      var deferred = context.defer();
      setTimeout(function() {
        deferred.reject(context.typedData('number', 54));
      }, 10);
      return deferred.promise;
    }

    if (args.method === 'throwinpromise') {
      var deferred = context.defer();
      setTimeout(function() {
        deferred.resolve('should be lost');
      }, 10);
      return deferred.promise.then(function() {
        var t = null;
        return t.foo;
      });
    }

    if (args.method === 'throwerror') {
      throw new Error('thrown error');
    }

    if (args.method === 'throwstring') {
      throw 'thrown string';
    }

    return 'no error';
  }
};

/**
 * Registration and de-registration.
 */
exports.setup = function(opts) {
  // setup/shutdown needs to register/unregister types, however that means we
  // need to re-initialize mockCommands.option1 and mockCommands.option2 with
  // the actual types
  exports.option1.type = types.createType('string');
  exports.option2.type = types.createType('number');
  exports.option3.type = types.createType({
    name: 'selection',
    lookup: [
      { name: 'one', value: 1 },
      { name: 'two', value: 2 },
      { name: 'three', value: 3 }
    ]
  });

  types.addType(exports.optionType);
  types.addType(exports.optionValue);

  canon.addCommand(exports.tsv);
  canon.addCommand(exports.tsr);
  canon.addCommand(exports.tso);
  canon.addCommand(exports.tse);
  canon.addCommand(exports.tsj);
  canon.addCommand(exports.tsb);
  canon.addCommand(exports.tss);
  canon.addCommand(exports.tsu);
  canon.addCommand(exports.tsf);
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
  canon.addCommand(exports.tsfail);
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
  canon.removeCommand(exports.tsf);
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
  canon.removeCommand(exports.tsfail);

  types.removeType(exports.optionType);
  types.removeType(exports.optionValue);
};


});
