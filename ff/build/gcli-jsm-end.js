
/**
 * Static object which allows the creation of GCLI sandboxes.
 * Exported to the outside.
 */
var GCLI = {
  /**
   * Return a new sandbox that includes standard GCLI exports plus references
   * to UI and Canon. It's not totally clear that this is the best way to
   * provide access to these functions, so their use is discouraged until we
   * have more experience in how they are needed.
   */
  create: function(options)
  {
    var sandbox = new define.Sandbox();

    var gcli = sandbox.require("gcli/index");

    // TODO: we shouldn't need to expose this
    gcli.ui = sandbox.require("gcli/ui/index");

    gcli.startup();

    return gcli;
  }
};

/**
 * Create the uber-GCLI that everyone should be using to register commands etc.
 */
GCLI.global = GCLI.create();

var EXPORTED_SYMBOLS = [ "GCLI" ];
