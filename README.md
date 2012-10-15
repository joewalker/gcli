
GCLI - Graphic Command Line
===========================

GCLI is a graphical command line component. It is being integrated with
Firefox developer tools and with editors like Orion and Ace. It can be embedded
in web pages and JavaScript applications.


Why?
----

Command lines have advantages over graphical UIs in speed of entry and the
ability to contain an almost unlimited set of commands without becoming
cluttered. On the other hand GUIs typically come with better discoverability.
GCLI is an experiment to see if we can improve the discoverability of command
lines whilst retaining the speed and powerful command set of traditional CLIs.

There are a number of problems with the design of traditional command lines:

* They assume a curses-style 80x24 (or similar) character array for output. 
  Even system consoles are capable of graphics these days. It ought to be
  possible to have richer output.
* They assume serial access to the output - one command at a time.
  This made sense when multi-tasking was expensive, however with modern
  processors single-tasking is starting to look expensive.
* They are so loosely coupled that the integration is typically nothing more
  than argv/stdout/stderr/stdin.
  That level of integration made sense on memory constrained devices, but with
  more resources, we can provide much richer integration.


Getting Started
---------------

    $ git clone git://github.com/joewalker/gcli.git
    $ cd gcli
      -> Load index.html into your web browser (except Chrome)
    For Chrome:
      install node (http://nodejs.org/download/)
    $ npm install .
    $ node ./gcli.js
      -> Load http://localhost:9999/

When you see the '»' prompt, type 'help' to see a list of commands.


Related Links
-------------

* **Bug reports**: http://j.mp/gclibug
* **GCLI in Firefox**: https://developer.mozilla.org/en-US/docs/Tools/GCLI
* **GCLI on the Web**: https://github.com/joewalker/gcli/blob/master/docs/index.md

