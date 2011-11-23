
# About GCLI

## GCLI is a Graphical Command Line Interpreter.

GCLI is born of the belief that character based command lines were designed for
computers that are quite different from today's computers. They were
resource-limited, disconnected systems with slow multi-tasking and poor
displays. The design of the Unix CLI made sense in 1970, but over 40 years on,
considering the pace of change, there are many improvements we can make.

CLIs generally suffer from poor discoverability; It's hard when faced with a
blank command line to work out what to do. As a result the majority of programs
today use purely graphical user interfaces, however in doing so, they lose some
of the benefits of CLIs. CLIs are still used because generally, in the hands of
a skilled user they are faster, and have a wider range of available options.

GCLI attempts to get the best of the GUI world and the CLI world to produce
something that is both easy to use and learn as well as fast and powerful.


## Status

Most parts of GCLI are usable, although like any project there are incomplete
sections. We don't currently release special version numbers, or alternatively
we release on a daily basis using the day as a version number. The master
branch is generally stable and should pass all unit tests.

Major hurdles to be overcome:

- Security review. Is it OK to run user commands with Chrome privileges in
  Firefox? If not, how should it be done?
- Accessibility review. Is the completion node system workable?
- Localization. The UI can be configured to have no pop-up help, which should
  alleviate the immediate need for localization since there are no strings in
  the input area itself.
  Once we add in help system back in, it will need localization.


## History

GCLI was born as part of the
[Bespin](http://ajaxian.com/archives/canvas-for-a-text-editor) project and was
[discussed at the time](http://j.mp/bespin-cli). The command line component
survived the rename of Bepsin to Skywriter and the merger with Ace, got a name
of it's own (Cockpit) which didn't last long before the project was named GCLI.
It is now being used in the Firefox's web console where it doesn't have a
separate identity but it's still called GCLI outside of Firefox. It is not
known how long it will stay being called GCLI.


## Environments

GCLI is designed to work in a number of environments:

1. As a component of Firefox developer tools. As such it replaces the web
   console command line.
2. As an adjunct to Ace and possible component for Cloud9.
3. As a plugin to any web-page wishing to provide its own set of commands.
4. As part of a standalone web browser extension with it's own set of commands.

Currently only 1. and 2. of these is directly supported, support for other
environments may follow.

In order to support these environments GCLI will need to:

- Be usable in the latest versions of modern browsers
- Make the UI fairly simple to re-implement (since some environments might have
  a styling/templating system which doesn't fit with the supplied model)


## Related Pages

Other sources of GCLI documentation:

- Source
  - The source for use alongside Ace or in web pages is in the [Github
    repository for GCLI](https://github.com/mozilla/gcli/)
  - The source for the Firefox embedding springs from [this HG/MQ patch queue]
    (http://j.mp/gcli-mq) (which is partly derived form the Git repo) from
    which it flows into [the Mozilla devtools repo]
    (https://hg.mozilla.org/projects/devtools/) and then on into the Mozilla
    central ocean.
- [Demo of GCLI](https://people.mozilla.com/~jwalker/gcli/build/) with an
  arbitrary set of demo commands
- Other Documentation
  - [Embedding docs](https://github.com/mozilla/gcli/blob/master/docs/index.md)
  - [Status page](http://mozilla.github.com/devtools/2011/status.html#gcli)
- [The Design of GCLI][design.md]


## Accessibility

GCLI uses ARIA roles to guide a screen-reader as to the important sections to
voice. We welcome feedback on how these roles are implemented, either by
[raising a bug](https://github.com/joewalker/gcli/issues) or by [posting to the
Webby-CLI mailing list](https://groups.google.com/forum/#!forum/webby-cli).

The command line uses TAB as a method of completing current input, this
prevents use of TAB for keyboard navigation. Instead of using TAB to move to
the next field you can use F6. In addition to F6, ALT+TAB, CTRL+TAB, META+TAB
make an attempt to move the focus on. How well this works depends on your
OS/browser combination.


## Design Goals

GCLI should be:

- primarily for technical users.
- as fast as a traditional CLI. It should be possible to put your head down,
  and look at the keyboard and use GCLI 'blind' at full speed without making
  mistakes.
- mousable with similar gestures to a GUI. It should be possible to hide the
  input area and use GCLI in a similar way to a GUI.
- principled about the way it encourages people to build commands. There is
  benefit from unifying the underlying concepts.
- automatically helpful.

GCLI should not attempt to:

- convert existing GUI users to a CLI.
- use natural language input. The locale for the input is gcli-GCLI. We use
  the 'command-name <list of options>' for all input.
- gain a touch based interface. Whilst it's possible (even probable) that touch
  can provide further benefits to command line users, that can wait while we
  catch up with 1985.
- slavishly follow the syntax of existing commands, predictability is more
  important.
- be a programming language. Shell scripts are mini programming languages but
  we have JavaScript sat just next door. It's better to integrate than compete.


## Embedding GCLI

There are 3 basic steps in using GCLI in your system.

1. Import a GCLI JavaScript file.
   For serious use of GCLI you are likely to be creating a custom build (see
   below) however if you just want to have a quick play, you can use
   ``gcli-uncompressed.js`` from [the gh-pages branch of GCLI]
   (https://github.com/mozilla/gcli/tree/gh-pages)
   Just place the following wherever you place your script files.

        <script src="path/to/gcli-uncompressed.js" type="text/javascript"></script>

2. Having imported GCLI, we need to tell it where to display. The simplest
   method is to include an elements with the id of ``gcli-input`` and
   ``gcli-display``.

        <input id="gcli-input" type="text"/>
        <div id="gcli-display"></div>

3. Tell GCLI what commands to make available. See the sections on Writing
   Commands, Writing Types and Writing Fields for more information.

   GCLI uses the CommonJS AMD format for it's files, so a 'require' statement
   is needed to get started.

        require([ 'gcli/index' ], function(gcli) {
          gcli.startup();       // Initialize the command line
          gcli.addCommand(...); // Register custom commands
          gcli.createView();    // Create a user interface
        });

   Both the startup() and createView() commands take ``options`` objects which
   allow customization. At the current time the documentation of these object
   is left to the source.


### Creating Custom Builds

GCLI uses [DryIce](https://github.com/mozilla/dryice) to create custom builds.
If dryice is installed (``npm install dryice``) then you can create a built
version of GCLI simply using ``node Makefile.dryice.js``. GCLI comes with a
custom module loader to replace RequireJS for built applications.

The build will be output to the ``built`` directory. The directory will be
created if it doesn't exist.
