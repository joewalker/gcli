
/**
 * The dependencies specified here should be the same as in Makefile.dryice.js
 */
var gclichrome = {
  startup: function(window) {
    gcli._internal.require([ "gcli/gclichrome" ], function(inner) {
      inner.startup(window);
    });
  }
};
