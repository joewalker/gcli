
registerCleanupFunction(function() {
  Services.prefs.clearUserPref("devtools.gcli.enable");
  undefine();
  obj = undefined;
  define = undefined;
  console = undefined;
  Node = undefined;
});

function test() {
  Services.prefs.setBoolPref("devtools.gcli.enable", true);
  addTab("http://example.com/browser/browser/devtools/webconsole/test/browser/test-console.html");
  browser.addEventListener("DOMContentLoaded", onLoad, false);
}

function onLoad() {
  browser.removeEventListener("DOMContentLoaded", onLoad, false);
  var failed = false;

  try {
    openConsole();
    define.globalDomain.require("gclitest/index");
  }
  catch (ex) {
    failed = ex;
    console.error('Test Failure', ex);
    ok(false, '' + ex);
  }
  finally {
    closeConsole();
    finish();
  }

  if (failed) {
    throw failed;
  }
}
