Cockpit Command Line
====================

Cockpit is a command line component. It is used in Ace/Skywriter/Cloud9/etc
It can be easily embedded in any web page and JavaScript application.

Getting Started
---------------
Cockpit uses submodules, so make sure you checkout with the following:

    git clone git://github.com/joewalker/cockpit.git --recursive
    cd cockpit
    python static.py

Then in a browser, visit 'http://localhost:9999/' and where you see the '>'
prompt, type 'help' to see a list of commands, 'sh ls -la' executes the list
command using a shell provided by the python server.
