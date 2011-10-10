
registerCleanupFunction(function() {
  Services.prefs.clearUserPref("devtools.gcli.enable");

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

  try {
    openConsole();
    define.globalDomain.require("gclitest/index");
  }
  catch (ex) {
    console.error('Test Failure', ex);
  }
  finally {
    closeConsole();
    finish();
  }
}
