define(function(require, exports, module) {

'use strict';

var util = require('util/util');
var l10n = require('util/l10n');
var gcli = require('gcli/index');

var qsaViewHtml = require('text!gcli/commands/qsa.html');
var qsaViewCss = require('text!gcli/commands/qsa.css');

/**
 * Transform a nodeList into an array.
 * Useful for forEach'ing for example.
 * @param nodeList The nodeList as returned by querySelectorAll
 * @return The transformed array
 */
function nodesToArray(nodeList) {
  return Array.prototype.slice.call(nodeList);
}

/**
 * QuerySelectorAll (qsa) command spec
 */
var qsaCmdSpec = {
  name: 'qsa',
  description: l10n.lookup('qsaDesc'),
  manual: l10n.lookup('qsaManual'),
  params: [{
    name: 'query',
    type: 'string',
    defaultValue: '*',
    description: l10n.lookup('qsaQueryDesc'),
  }],
  returnType: 'qsaCmdOutput',
  exec: function(args, context) {
    var out = {
      nodes: [],
      selector: args.query
    };
    
    // An invalid selector may lead to a SyntaxError exception e.g. '3' or ''
    try {
      out.nodes = nodesToArray(context.document.querySelectorAll(args.query));
    } catch(e) {}

    // Converting the nodes and attributes to plain objects to allow JSONing
    out.nodes.forEach(function(node, index, nodeList) {
      var attributes = nodesToArray(node.attributes);
      attributes.forEach(function(attr, index, attrList) {
        attrList[index] = {
          name: attr.name,
          value: attr.value
        };
      });

      nodeList[index] = {
        tagName: node.tagName,
        attributes: attributes,
        selector: util.findCssSelector(node)
      };
    });
    
    return out;
  }
};

/**
 * QuerySelectorAll (qsa) command output converter
 * qsaCmdOutput -> View
 */
var qsaConverterSpec = {
  from: 'qsaCmdOutput',
  to: 'view',
  exec: function(qsaCmdOutput, context) {
    return context.createView({
      html: qsaViewHtml,
      css: qsaViewCss,
      options: {allowEval: true, stack: 'qsa.html'},
      data: {
        onclick: function(ev) {
          context.exec({
            command: 'qsa',
            args: {query: ev.currentTarget.dataset.selector}
          });
        },
        selector: qsaCmdOutput.selector,
        nodes: qsaCmdOutput.nodes,
        maxDisplayedNodes: 100,
        l10n: l10n
      }
    });
  }
};

exports.startup = function() {
  gcli.addCommand(qsaCmdSpec);
  gcli.addConverter(qsaConverterSpec);
};
exports.shutdown = function() {
  gcli.removeCommand(qsaCmdSpec);
  gcli.removeConverter(qsaConverterSpec);
};

});
