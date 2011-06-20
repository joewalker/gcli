///////////////////////////////////////////////////////////////////////////////

/*
 * require GCLI so it can be exported as declared at the start
 * The dependencies specified here should be the same as in Makefile.dryice.js
 */
var gcli = require("gcli/index");
gcli.createView = require("gcli/ui/start/firefox");
