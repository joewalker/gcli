/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {
var commands = exports;


var canon = require('gcli/canon');

var SelectionType = require('gcli/types/basic').SelectionType;
var DeferredType = require('gcli/types/basic').DeferredType;
var types = require('gcli/types');

/**
 * Registration and de-registration.
 */
commands.setup = function() {
  commands.option1.type = types.getType('number');
  commands.option2.type = types.getType('boolean');

  types.registerType(commands.optionType);
  types.registerType(commands.optionValue);

  canon.addCommand(commands.tsv);
  canon.addCommand(commands.tsr);
  canon.addCommand(commands.tsu);
  canon.addCommand(commands.tsn);
  canon.addCommand(commands.tsnDif);
  canon.addCommand(commands.tsnExt);
  canon.addCommand(commands.tsnExte);
  canon.addCommand(commands.tsnExten);
  canon.addCommand(commands.tsnExtend);
  canon.addCommand(commands.tselarr);
  canon.addCommand(commands.tsm);
};

commands.shutdown = function() {
  canon.removeCommand(commands.tsv);
  canon.removeCommand(commands.tsr);
  canon.removeCommand(commands.tsu);
  canon.removeCommand(commands.tsn);
  canon.removeCommand(commands.tsnDif);
  canon.removeCommand(commands.tsnExt);
  canon.removeCommand(commands.tsnExte);
  canon.removeCommand(commands.tsnExten);
  canon.removeCommand(commands.tsnExtend);
  canon.removeCommand(commands.tselarr);
  canon.removeCommand(commands.tsm);

  types.deregisterType(commands.optionType);
  types.deregisterType(commands.optionValue);
};


commands.option1 = { };
commands.option2 = { };

commands.optionType = new SelectionType({
  name: 'optionType',
  lookup: [
    { name: 'option1', value: commands.option1 },
    { name: 'option2', value: commands.option2 }
  ],
  noMatch: function() {
    this.lastOption = null;
  },
  stringify: function(option) {
    this.lastOption = option;
    return SelectionType.prototype.stringify.call(this, option);
  },
  parse: function(arg) {
    var conversion = SelectionType.prototype.parse.call(this, arg);
    this.lastOption = conversion.value;
    return conversion;
  }
});

commands.optionValue = new DeferredType({
  name: 'optionValue',
  defer: function() {
    if (commands.optionType.lastOption) {
      return commands.optionType.lastOption.type;
    }
    else {
      return types.getType('blank');
    }
  }
});

commands.tsv = {
  name: 'tsv',
  params: [
    { name: 'optionType', type: 'optionType' },
    { name: 'optionValue', type: 'optionValue' }
  ],
  exec: function(args, context) { }
};

commands.tsr = {
  name: 'tsr',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(args, context) { }
};

commands.tsu = {
  name: 'tsu',
  params: [ { name: 'num', type: 'number' } ],
  exec: function(args, context) { }
};

commands.tsn = {
  name: 'tsn'
};

commands.tsnDif = {
  name: 'tsn dif',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExt = {
  name: 'tsn ext',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExte = {
  name: 'tsn exte',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExten = {
  name: 'tsn exten',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tsnExtend = {
  name: 'tsn extend',
  params: [ { name: 'text', type: 'string' } ],
  exec: function(text) { }
};

commands.tselarr = {
  name: 'tselarr',
  params: [
    { name: 'num', type: { name: 'selection', data: [ '1', '2', '3' ] } },
    { name: 'arr', type: { name: 'array', subtype: 'string' } },
  ],
  exec: function(args, context) {}
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
  exec: function(args, context) {}
};


});
