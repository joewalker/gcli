define(function(require, exports, module) {

'use strict';

var util = require('util/util');
var canon = require('gcli/canon');

var qsaCmdSpec = {
  name: 'qsa',
  description: 'Execute a querySelectorAll on the current document and show matches',
  params: [
    {
      name: 'query',
      type: 'string',
      defaultValue: '*',
      description: 'CSS selectors seperated by comma',
    }
  ],
  returnType: 'view',
  exec: function(args, context) {
    var nodeList = context.document.querySelectorAll(args.query);

    var nodes = [];
    for(var i = 0, list = Array.prototype.slice.call(nodeList), length = list.length; i < length; i ++) {
      nodes.push({
        node: list[i],
        context: context,
        attributes: Array.prototype.slice.call(list[i].attributes)
      });
    }

    return context.createView({
      html: require('text!gcli/commands/qsa.html'),
      css: require('text!gcli/commands/qsa.css'),
      options: {allowEval: true, stack: 'qsa.html'},
      data: {
        nodes: nodes
      }
    });
  }
};

exports.startup = function() {
  canon.addCommand(qsaCmdSpec);
};
exports.shutdown = function() {
  canon.removeCommand(qsaCmdSpec);
};

});