/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

  require('gcli/index');

  require('demo/commands/basic').startup();
  require('demo/commands/bugs').startup();
  require('demo/commands/demo').startup();
  require('demo/commands/experimental').startup();

  var help = require('demo/commands/help');
  help.startup();
  help.helpMessages.prefix = "<h2>Welcome to GCLI</h2>" +
    "<p>GCLI is an experiment to create a highly usable JavaScript command line for developers." +
    "<p>Useful links: " +
    "<a target='_blank' href='https://github.com/joewalker/gcli'>source</a> (BSD), " +
    "<a target='_blank' href='https://github.com/joewalker/gcli/blob/master/docs/index.md'>documentation</a> (for users/embedders), " +
    "<a target='_blank' href='https://wiki.mozilla.org/DevTools/Features/GCLI'>Mozilla feature page</a> (for GCLI in the web console).";

});
