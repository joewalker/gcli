
# Running Tests

GCLI has a test suite that can be run in a number of different environments.
Some of the tests don't work in all environments. These should be automatically
skipped when not applicable.


## Web

Running a limited set of test from the web is the easiest. Simply load GCLI
into a web page and type 'test'.

By default, to comply with the desire to restrict exposed modules, the test
suite does not have access to many of the internals that it needs, so it runs
at about 60% strength.

To run at full strength, edit `index.html` and replace the following:

    require([ 'gcli/index', 'demo/index' ], function(gcli) {
      gcli.createDisplay();
    });

With this:

    var deps = [ 'gcli/index', 'gclitest/index', 'demo/index' ];
    require(deps, function(gcli, gclitest) {
      var display = new (require('gcli/ui/display').Display)({});
      gclitest.run({ window: window, display: display, hideExec: true });
    });
    
    function testCommands() {
      require([ 'gclitest/mockCommands' ], function(mockCommands) {
        mockCommands.setup();
      });
    }

This uses a requirement `gcli/ui/display` that is not recommended for general
use because it exposes internal modules with no backwards compatibility
guarantee (for more see the 'Backwards Compatibility' section in the
[main index](index.md))

This version arms the 'test' command with the ability to run the full test
suite, and it runs all the tests on each page load.

It also creates a function 'testCommands()' to be run at a JS prompt, which
enables the test commands for debugging purposes.


## Firefox

GCLI's test suite integrates with Mochitest and runs automatically on each test
run. Dryice packages the tests to format them for the Firefox build system.

For more information about running Mochitest on Firefox (including GCLI) see
[the MDN, Mochitest docs](https://developer.mozilla.org/en/Mochitest)


# Node

Running the test suite under node can be done as follows:

    $ node gcli.js test

Or, using the `test` command:

    $ node gcli.js
    Serving GCLI to http://localhost:9999/
    This is also a limited GCLI prompt.
    Type 'help' for a list of commands, CTRL+C twice to exit:
    » test
    
    testCli: Pass (funcs=9, checks=208)
    testCompletion: Pass (funcs=1, checks=139)
    testExec: Pass (funcs=1, checks=133)
    testHistory: Pass (funcs=3, checks=13)
    ....
    
    Summary: Pass (951 checks)

