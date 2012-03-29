/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var commands = exports;


var canon = require('gcli/canon');
var util = require('gcli/util');

var SelectionType = require('gcli/types/selection').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;
var types = require('gcli/types');

/**
 * Registration and de-registration.
 */
commands.setup = function() {
  // setup/shutdown need to register/unregister types, however that means we
  // need to re-initialize commands.option1 and commands.option2 with the
  // actual types
  commands.option1.type = types.getType('string');
  commands.option2.type = types.getType('number');

  types.registerType(commands.optionType);
  types.registerType(commands.optionValue);

  canon.addCommand(commands.tsv);
  canon.addCommand(commands.tsr);
  canon.addCommand(commands.tse);
  canon.addCommand(commands.tsj);
  canon.addCommand(commands.tsb);
  canon.addCommand(commands.tss);
  canon.addCommand(commands.tsu);
  canon.addCommand(commands.tsn);
  canon.addCommand(commands.tsnDif);
  canon.addCommand(commands.tsnExt);
  canon.addCommand(commands.tsnExte);
  canon.addCommand(commands.tsnExten);
  canon.addCommand(commands.tsnExtend);
  canon.addCommand(commands.tsnDeep);
  canon.addCommand(commands.tsnDeepDown);
  canon.addCommand(commands.tsnDeepDownNested);
  canon.addCommand(commands.tsnDeepDownNestedCmd);
  canon.addCommand(commands.tselarr);
  canon.addCommand(commands.tsm);
  canon.addCommand(commands.tsg);
};

commands.shutdown = function() {
  canon.removeCommand(commands.tsv);
  canon.removeCommand(commands.tsr);
  canon.removeCommand(commands.tse);
  canon.removeCommand(commands.tsj);
  canon.removeCommand(commands.tsb);
  canon.removeCommand(commands.tss);
  canon.removeCommand(commands.tsu);
  canon.removeCommand(commands.tsn);
  canon.removeCommand(commands.tsnDif);
  canon.removeCommand(commands.tsnExt);
  canon.removeCommand(commands.tsnExte);
  canon.removeCommand(commands.tsnExten);
  canon.removeCommand(commands.tsnExtend);
  canon.removeCommand(commands.tsnDeep);
  canon.removeCommand(commands.tsnDeepDown);
  canon.removeCommand(commands.tsnDeepDownNested);
  canon.removeCommand(commands.tsnDeepDownNestedCmd);
  canon.removeCommand(commands.tselarr);
  canon.removeCommand(commands.tsm);
  canon.removeCommand(commands.tsg);

  types.deregisterType(commands.optionType);
  types.deregisterType(commands.optionValue);
};


commands.option1 = { type: types.getType('string') };
commands.option2 = { type: types.getType('number') };

var lastOption = undefined;

commands.optionType = new SelectionType({
  name: 'optionType',
  lookup: [
    { name: 'option1', value: commands.option1 },
    { name: 'option2', value: commands.option2 }
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

commands.optionValue = new DeferredType({
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

commands.onCommandExec = util.createEvent('commands.onCommandExec');

function createExec(name) {
  return function(args, context) {
    var data = {
      command: commands[name],
      args: args,
      context: context
    };
    commands.onCommandExec(data);
    return data;
  };
}

commands.tsv = {
  name: 'tsv',
  params: [
    { name: 'optionType', type: 'optionType' },
    { name: 'optionValue', type: 'optionValue' }
  ],
  exec: createExec('tsv')
};

commands.tsr = {
  name: 'tsr',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsr')
};

commands.tse = {
  name: 'tse',
  params: [ { name: 'node', type: 'node' } ],
  exec: createExec('tse')
};

commands.tsj = {
  name: 'tsj',
  params: [ { name: 'javascript', type: 'javascript' } ],
  exec: createExec('tsj')
};

commands.tsb = {
  name: 'tsb',
  params: [ { name: 'toggle', type: 'boolean' } ],
  exec: createExec('tsb')
};

commands.tss = {
  name: 'tss',
  exec: createExec('tss')
};

commands.tsu = {
  name: 'tsu',
  params: [ { name: 'num', type: { name: 'number', max: 10, min: -5, step: 3 } } ],
  exec: createExec('tsu')
};

commands.tsn = {
  name: 'tsn'
};

commands.tsnDif = {
  name: 'tsn dif',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnDif')
};

commands.tsnExt = {
  name: 'tsn ext',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExt')
};

commands.tsnExte = {
  name: 'tsn exte',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('')
};

commands.tsnExten = {
  name: 'tsn exten',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExte')
};

commands.tsnExtend = {
  name: 'tsn extend',
  params: [ { name: 'text', type: 'string' } ],
  exec: createExec('tsnExtend')
};

commands.tsnDeep = {
  name: 'tsn deep',
};

commands.tsnDeepDown = {
  name: 'tsn deep down',
};

commands.tsnDeepDownNested = {
  name: 'tsn deep down nested',
};

commands.tsnDeepDownNestedCmd = {
  name: 'tsn deep down nested cmd',
  exec: createExec('tsnDeepDownNestedCmd')
};

commands.tselarr = {
  name: 'tselarr',
  params: [
    { name: 'num', type: { name: 'selection', data: [ '1', '2', '3' ] } },
    { name: 'arr', type: { name: 'array', subtype: 'string' } },
  ],
  exec: createExec('tselarr')
};

commands.tsm = {
  name: 'tsm',
  hidden: true,
  description: 'a 3-param test selection|string|number',
  params: [
    { name: 'abc', type: { name: 'selection', data: [ 'a', 'b', 'c' ] } },
    { name: 'txt', type: 'string' },
    { name: 'num', type: { name: 'number', max: 42, min: 0 } },
  ],
  exec: createExec('tsm')
};

commands.tsg = {
  name: 'tsg',
  hidden: true,
  description: 'a param group test',
  params: [
    { name: 'solo', type: { name: 'selection', data: [ 'aaa', 'bbb', 'ccc' ] } },
    {
      group: 'First',
      params: [
        { name: 'txt1', type: 'string', defaultValue: null },
        { name: 'bool', type: 'boolean' }
      ]
    },
    {
      group: 'Second',
      params: [
        { name: 'txt2', type: 'string', defaultValue: 'd' },
        { name: 'num', type: { name: 'number', min: 40 }, defaultValue: 42 }
      ]
    }
  ],
  exec: createExec('tsg')
};


});
