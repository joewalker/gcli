
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

Why?
----
There are a number of problems with common command lines:

* They assume a curses-style 80x24 (or similar) character array for output. 
  This hasn't made much sense for the last 10 years, even system consoles are
  capable of graphics these days.
* They assume serial access to the output.
  This made sense when multi-tasking was expensive, however with modern
  processors single-tasking is starting to look expensive.
* They are so loosely coupled that the integration is typically nothing more
  than argv/stdout/stderr/stdin.
  That level of integration made sense on memory constrained devices, but with
  more resources, we can provide much richer integration.

Command lines are often better than UIs for speed of entry and for things like
history/scripting/etc, but on the other hand UIs are typically have better
discoverability, so it would be good to retain the speed/text basis, but make
CLIs easier to use.

Ideas
-----
Some of the benefits that are currently working:

* Output can be HTML, so tables can be laid out better than the space based
  formatting that 'ls' uses.
* All commands can run in the background. '&' becomes the default.
* Commands can write to the output whenever they want, without risk of colliding
  with another task, this means that commands can safely ask for clarification
  or further input whenever they want.
* Output can contain command links, so the output of 'ls' can contain icons to
  copy/move/delete the listed files.
* An AST of the input is created, so we can identify exactly what in the command
  line is incorrect before return is pressed, and require a fix before the user
  is allowed to continue.
* The input parameters are typed. Enter "set historyLength 7" and then press UP.
  The system knows that the type of the 'historyLength' setting is a number, so
  we can do an increment operation.

Some additional benefits that should be possible:

* The command line display does not have to be a plain string. In addition to
  the error mark-up we can obscure passwords and when the user types
  "--password tiger" we can display "--password *****". Potentially long
  filenames could be displayed in shortened form (using "...") when they're not
  being edited.
* We could generate a menu system that would allow selection and even execution
  of commands using a mouse in a why almost as familiar as a traditional GUI.
