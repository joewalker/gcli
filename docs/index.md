
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

GCLI is not a secret, however it is unreleased, not blogged about (except in
previous incarnations). Feel free to poke around and help but don't view it
as a finished or released project.

The command line parser is mostly complete. The UI is kind of working, but
lacking polish. There are very few implemented commands.

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
It is not known how long it will stay being called GCLI.


## Environments

GCLI is designed to work in a number of environments:

1. As a component of Firefox developer tools. As such it should be capable of
   replacing the WebConsole command line, the Firebug command line and
   providing the ability for extensions to Firefox developer tools without
   interface clutter.
2. As an adjunct to Ace and possible component for Cloud9.
3. As a plugin to any web-page wishing to provide its own set of commands.
4. As part of a standalone web browser extension with it's own set of commands.

Currently only 1. and 2. of these is directly supported, support for other
environments may follow.

In order to support these environments GCLI will need to:

- Be usable in modern browsers plus IE8
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


## User Guide

GCLI prides itself on being easy to use, plus people don't read user guides,
therefore it seems pointless having a long users guide and self defeating to
write one.


### Accessibility

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


## Design Changes

What has changed since 1970 that might cause us to make changes to the design
of the command line?


### Connection limitations

Unix pre-dates the Internet and treats almost everything as a file. It is more
useful in a connected world to use URIs as ways to identify sources of data.


### Memory limitations

Modern computers have something like 6 orders of magnitude more memory than the
PDP-7 on which Unix was developed. Innovations like stdin/stdout and pipes are
ways to connect systems without long-term storage of the results. The ability
to store results for some time (potentially in more than one format)
significantly reduces the need for these concepts. We should make the results
of past commands addressable for re-use at a later time.

There are a number of possible policies for eviction of items from the history.
The initial implementation will be a simple count based system. More
advanced strategies could take data-size, time, and number of references into
account.


### Multi-tasking limitations

Multi-tasking was a problem in 1970; the problem was getting a computer to do
many jobs on 1 core. Today the problem is getting a computer to do one job on
many cores. However we're stuck with this legacy in 2 ways. Firstly that the
default is to force everything to wait until the previous job is finished, but
more importantly that output from parallel jobs frequently collides

    $ find / -ctime 5d -print &
    $ find / -uid 0 -print &
    // good luck working out what came from where

    $ tail -f logfile.txt &
    $ vi main.c
    // have a nice time editing that file

GCLI will allow commands to be asynchronous and will provide UI elements to
inform the user of job completion. It will also keep asynchronous command
output contained within it's own display area.


### Output limitations

The PDP-7 had a teletype. There is something like 4 orders of magnitude more
information that can be displayed on a modern display than a 80x24 character
based console. We can use this flexibility to provide better help to the user
in entering their command.

The additional display richness can also allow interaction with result output.
Command output can include links to follow-up commands, and even ask for
additional input. (e.g. "your search returned zero results do you want to try
again with a different search string")

There is no reason why output must be static. For example, it could be
informative to see the results of an "ls" command alter given changes made by
subsequent commands. (It should be noted that there are times when historical
information is important too)


### Integration limitations

In 1970, command execution meant retrieving a program from storage, and running
it. This required minimal interaction between the command line processor and
the program being run, and was good for resource constrained systems.
This lack of interaction resulted in the processing of command line arguments
being done everywhere, when the task was better suited to command line.
We should provide metadata about the commands being run, to allow the command
line to process, interpret and provide help on the input.


## Embedding GCLI

There are 3 basic steps in using GCLI in your system.

1. Import a script. Pre-built scripts are available in the ``build``
   directory. Just place the following wherever you place your script files.

        <script src="path/to/gcli.js" type="text/javascript"></script>

   See the section below on creating custom builds.

2. Having imported GCLI, we need to tell it where to display. The simplest
   method is to include an input element with the id of ``gcliInput``.

        <input id="gcliInput" type="text"/>

   Optionally, if you want the output to be always visible or under your
   control, you can include an output element as follows:

        <div id="gcliOutput"></div>

   If this element is not present, GCLI will create its own output element and
   show it above or below the input element whenever the command line has
   keyboard focus.

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
   is left to the source. GCLITerm in HUDService and index.html in GCLI itself
   are probably the best places to begin looking.


### Creating Custom Builds

GCLI uses [DryIce](https://github.com/mozilla/dryice) to create custom builds.
If dryice is installed (``npm install dryice``) then you can create a built
version of GCLI simply using ``node Makefile.dryice.js``. GCLI comes with a
custom module loader to replace RequireJS for built applications.


## Writing Commands

3 principles for writing commands:

- Related commands should be sub-commands of a parent command. One of the goals
  of GCLI is to support a large number of commands without things becoming
  confusing, this will require some sort of namespacing or there will be
  many people wanting to implement the ``add`` command. This style of
  writing commands has become common place in Unix as the number of commands
  has gone up.

  We plan to support some type of 'focus' concept to allow a parent command
  to become a default, promoting its sub-commands above others.

- Each command should do exactly and only one thing. An example of a Unix
  command that breaks this principle is the ``tar`` command.

        $ tar -zcf foo.tar.gz .
        // Creates an archive of the current directory into foo.tar.gz
        
        $ tar -zxf foo.tar.gz .
        // Extracts foo.tar.gz into the current directory

  These 2 commands do exactly opposite things. Many a file has died as a result
  of a x/c typo. In GCLI this would be better expressed:

        $ tar create foo.tar.gz -z .
        // and
        $ tar extract foo.tar.gz -z .

  A potential future feature is a 'what is this command going to do' summary:
  something along the lines of the comments after the ``tar`` commands above
  this could be very confusing if the addition of a single letter late on in
  the command line radically alters the action of the command.

- Avoid breaking. We try to avoid the user having to start again with a command
  due to some problem. The majority of problems are simple typos which we can
  catch using command metadata, but there are 2 things command authors can do
  to prevent breakage.

  - Where possible avoid the need to validate command line parameters in the
    exec function. This can be done by good parameter design (see do exactly
    and only one thing)

  - If there is an obvious fix for an unpredictable problem, offer the
    solution in the command output. So rather than use request.error (see
    Request Object below) output some HTML which contains a link to a fixed
    command line.

Currently these concepts are not enforced at a code level, but they could be in
the future.


### How commands work:

This is how to create a basic ``greet`` command:

    gcli.addCommand({
      name: 'greet',
      description: 'Show a message to someone',
      params: [
        {
          name: 'name',
          type: 'string',
          description: 'The name to greet'
        }
      ],
      returnType: 'string',
      exec: function(args, env) {
        return "Hello, " + args.name;
      }
    });

This command is used as follows:

    > greet Joe
    Hello, Joe

First, a brief point of terminology - a function has ``parameters``, and when
you call a function, you pass ``arguments`` to it.


### Default argument values

This command requires the entry of the ``name`` parameter, so no type checking
is required. This parameter can be made optional with the addition of a
defaultValue to the parameter:

    gcli.addCommand({
      name: 'greet',
      description: 'Show a message to someone',
      params: [
        {
          name: 'name',
          type: 'string',
          description: 'The name to greet',
          defaultValue: 'World!'
        }
      ],
      returnType: 'string',
      exec: function(args, env) {
        return "Hello, " + args.name;
      }
    });

Now we can also use the ``greet`` command as follows:

    > greet
    Hello, World!


### Positional vs. named arguments

Arguments can be entered either positionally or as named arguments. Generally
users will prefer to type the positional version, however the named alternative
can be more self documenting.

For example, we can also invoke the greet command as follows:

    > greet --name Joe
    Hello, Joe


### Parameter groups

Parameters can be grouped into sections. This primarily allows us to generate
mousable user-interfaces where similar parameters are presented to the user in
groups.

    gcli.addCommand({
      name: 'greet',
      params: [
        { name: 'name', type: 'string', description: 'The name to greet' },
        {
          group: 'Advanced Options',
          params: [
            { name: 'repeat', type: 'number', defaultValue: 1 },
            { name: 'debug', type: 'boolean' }
          ]
        }
      ],
      ...,
      exec: function(args, env) {
        var output = '';
        if (args.debug) output += 'About to send greeting';
        for (var i = 0; i < args.repeat; i++) {
          output += "Hello, " + args.name;
        }
        if (args.debug) output += 'Done!';
        return output;
      }
    });

This could be used as follows:

    > greet Joe --repeat 2 --debug
    About to send greeting
    Hello, Joe
    Hello, Joe
    Done!

Parameter groups must come after non-grouped parameters because non-grouped
parameters can be assigned positionally, so their index is important. We don't
want 'holes' in the order caused by parameter groups.


### Parameter types

This example uses types other than 'string'. Initially the available types are

- string
- boolean
- number
- array
- selection
- deferred

This list can be extended. See section below on types for more information.

Named parameters can be specified anywhere on the command line (after the
command itself) however positional parameters must be in sequential order.

Positional arguments quickly become unwieldy with long argument lists so
parameters in groups can only be used via named parameters.

Additionally grouped parameters must have default values, except boolean
parameters, which always have a default value of ``false``.

There is currently no way to make parameters mutually exclusive.


### Short argument names

GCLI automatically assigns shortened parameter names:

    > greet Joe -r 2 -d

Short parameter names use a single dash rather than a double dash. It is
planned to allow the short version of parameter names to be customized, and
to enable argument merging which will allow use of ``greet Joe -dr 2``.


### Array types

Parameters can have a type of ``array``. For example:

    gcli.addCommand({
      name: 'greet',
      params: [
        {
          name: 'names',
          type: { name: 'array', subtype: 'string' },
          description: 'The names to greet',
          defaultValue: [ 'World!' ]
        }
      ],
      ...
      exec: function(args, env) {
        return "Hello, " + args.names.join(', ') + '.';
      }
    });

This would be used as follows:

    > greet Fred Jim Shiela
    Hello, Fred, Jim, Shiela.

Or using named arguments:

    > greet --names Fred --names Jim --names Shiela
    Hello, Fred, Jim, Shiela.

There can only be one ungrouped parameter with an array type, and it must be
at the end of the list of parameters (i.e. just before any parameter groups).
This avoids confusion as to which parameter an argument should be assigned.


### Selection types

Parameters can have a type of ``selection``. For example:

    gcli.addCommand({
      name: 'greet',
      params: [
        { name: 'name', ... },
        {
          name: 'lang',
          description: 'In which language should we greet',
          type: { name: 'selection', data: [ 'en', 'fr', 'de', 'es', 'gk' ] },
          defaultValue: 'en'
        }
      ],
      ...
    });

GCLI will enforce that the value of ``arg.lang`` was one of the values
specified. Alternatively ``data`` can be a function which returns an array of
strings.

The ``data`` property is useful when the underlying type is a string but it
doesn't work when the underlying type is something else. For this use the
``lookup`` property as follows:

      type: {
        name: 'selection',
        lookup: {
          'en': Locale.EN,
          'fr': Locale.FR,
          ...
        }
      },

Similarly, ``lookup`` can be a function returning the data of this type.

Under the covers the boolean type is implemented as a Selection with a
``lookup`` property as follows:

    lookup: { 'true': true, 'false': false }


### Number types

Number types are mostly self explanatory, they have one special property which
is the ability to specify upper and lower bounds for the number:

    gcli.addCommand({
      name: 'volume',
      params: [
        {
          name: 'vol',
          description: 'How loud should we go',
          type: { name: 'number', min: 0, max: 11 }
        }
      ],
      ...
    });

You can also specify a ``step`` property which specifies by what amount we
should increment and decrement the values. The ``min``, ``max``, and ``step``
properties are used by the command line when up and down are pressed and in
the input type of a dialog generated from this command.


### Deferred types

Deferred types are needed when the type of some parameter depends on the type
of another parameter. For example:

    > set height 100
    > set name "Joe Walker"

We can achieve this as follows:

    gcli.addCommand({
      name: 'set',
      params: [
        {
          name: 'setting',
          type: { name: 'selection', values: [ 'height', 'name' ] }
        },
        {
          name: 'value',
          type: {
            name: 'deferred',
            defer: function() { ... }
          }
        }
      ],
      ...
    });

Several details are left out of this example, like how the defer function knows
what the current setting is. See the ``pref`` command in Ace for an example.


### Sub-commands

It is common for commands to be groups into those with similar functionality.
Examples include virtually all VCS commands, ``apt-get``, etc. There are many
examples of commands that should be structured as in a sub-command style -
``tar`` being the obvious example, but others include ``crontab``.

Groups of commands are specified with the top level command not having an
exec function:

    canon.addCommand({
      name: 'tar',
      description: 'Commands to manipulate archives',
    });
    canon.addCommand({
      name: 'tar create',
      description: 'Create a new archive',
      exec: function(args, env) { ... },
      ...
    });
    canon.addCommand({
      name: 'tar extract',
      description: 'Extract from an archive',
      exec: function(args, env) { ... },
      ...
    });


### Command metadata

Each command should have the following properties:

- A string ``name``.
- A short ``description`` string. Generally no more than 20 characters without
  a terminating period/fullstop.
- A function to ``exec``ute. (Optional for the parent containing sub-commands)

And optionally the following extra properties:

- A declaration of the accepted ``params``.
- A ``hidden`` property to stop the command showing up in requests for help.
- A ``context`` property which defines the scope of the function that we're
  calling. Rather than simply call ``exec()``, we do ``exec.call(context)``.
- A ``manual`` property which allows a fuller description of the purpose of the
  command.
- A ``returnType`` specifying how we should handle the value returned from the
  exec function.

The ``params`` property is an array of objects, one for each parameter. Each
parameter object should have the following 3 properties:

- A string ``name``.
- A short string ``description`` as for the command.
- A ``type`` which refers to an existing Type (see Writing Types).

Optionally each parameter can have these properties:

- A ``defaultValue`` (which should be in the type specified in ``type``).
  The defaultValue will be used when there is no argument supplied for this
  parameter on the command line.
  If the parameter has a ``defaultValue``, other than ``undefined`` then the
  parameter is optional, and if unspecified on the command line, the matching
  argument will have this value when the function is called.
  If ``defaultValue`` is missing, or if it is set to ``undefined``, then the
  system will ensure that a value is provided before anything is executed.
  There are 2 special cases:
  - If the type is ``selection``, then defaultValue must not be undefined.
    The defaultValue must either be ``null`` (meaning that a value must be
    supplied by the user) or one of the selection values.
  - If the type is ``boolean``, then ``defaultValue:false`` is implied and
    can't be changed. Boolean toggles are assumed to be off by default, and
    should be named to match.
- A ``manual`` property for parameters is exactly analogous to the ``manual``
  property for commands - descriptive text that is longer than than 20
  characters.


### Other command formats

There are 3 different formats in which commands can be written.

1. Object Literal syntax. This is the format used in the examples used above.
   It is the way GCLI stores commands internally, so it is to some extent the
   'native' syntax.
2. Function Metadata Syntax. This is ideal for decorating existing functions
   with the metadata to allow use with GCLI.
3. Object Metadata Syntax. This is ideal for grouping related commands
   together.

### Object Literal Syntax

This is designed for situations when you are creating a single command
specifically for GCLI. The parameters to the exec function are designed to be
useful when you have a large number of parameters, and to give direct access to
the environment (if set).

    canon.addCommand({
      name: 'echo',
      description: 'The message to display.',
      params: [
        {
          name: 'message',
          type: 'string',
          description: 'The message to display.'
        }
      ],
      returnType: 'string',
      exec: function(args, env) {
        return args.message;
      }
    });

The ``args`` object contains the values specified on the params section and
provided on the command line. In this example it would contain the message for
display as ``args.message``.

It is expected that the signature of the exec function will soon change to be
``(args, env)``. Plain strings will be distinguished from HTML using a simple
wrapper for HTML.
Something like ``new HTML('<p>Hello, World!</p>');``, or by using a return
type of ``html`` rather than ``string``, or by returning a DOM object.
However we will strongly discourage use of HTML directly because that makes
it hard to use the output of one command as the input of another command.
Instead we will encourage the use of 'typed JSON' where possible. The
``returnType`` property will allow us to select a converter to convert the JSON
to HTML, and will allow us to support a system of multi-part output much like
an application clipboard which declares that data is available in a number of
alternate formats.

Asynchronous output is achieved using a promise created using the top level API
``gcli.createPromise()``.


### Function Metadata Syntax

The Object Literal Syntax can't be used to decorate existing functions partly
because it could entail some confusing situations where commands are not
executed with the context they were expecting, but more seriously because it
requires a specific signature in terms of parameters.

The Function Metadata Syntax is designed for cases when you want to decorate
an existing function. This allows us to package window.alert as a GCLI
function:

    window.alert.metadata = {
      name: 'alert',
      context: window,
      description: 'Show an alert dialog',
      params: [ { name: 'message', type: 'string', description: '...' } ]
    };
    canon.addCommand(window.alert);

It is important to define the parameters in the correct order to that in
which the function you are decorating expects.

It is possible to use Function Metadata Syntax more conventionally with
functions designed for GCLI. There are 2 useful features which can help in
this - [function hoisting](http://j.mp/fn-hoist) and the ability to fetch the
environment or a request from the canon.

Function hoisting makes it possible to define function metadata before the
function. This may look a little strange initially, but it's common for
documentation to come before the thing it documents.

    echo.metadata = {
      name: 'echo',
      description: 'Show a message',
      params: [ { name: 'message', type: 'string', description: '...' } ]
    };
    function echo(message) {
      return message;
    }
    canon.addCommand(echo);

The gcli function ``getEnvironment()`` allows access to env object that is
normally provided as a parameter.


### Object Metadata Syntax

The benefit of the Object Metadata Syntax is that it is a convenient way to
represent a group of commands, also there is a variant that can be used to
decorate existing objects.

Command groups can be created using Object Literal Syntax previously
discussed:

    canon.addCommand({
      name: 'tar',
      description: 'Commands to manipulate archives.',
    });
    canon.addCommand({
      name: 'tar create',
      description: 'Create a new archive.',
      ...
    });

Alternatively the same commands can be created using Object Metadata Syntax:

    var tar = {
      description: 'Commands to manipulate archives.',
      
      create: {
        description: 'Create a new archive.',
        params: [
          { name: 'file', type: 'file', description: 'The file to create.' },
          { name: 'compress', type: 'boolean', description: '...' }
        ],
        exec: function(args, env) { ... },
      },
      
      extract: {
        description: 'Extract files from an archive.',
        params: [
          { name: 'file', type: 'file', description: 'The source file.' },
          { name: 'compress', type: 'boolean', description: '...' }
        ],
        exec: function(args, env) { ... },
      },
      
      ...
    };
    canon.addCommands(tar, 'tar');

This alternative is potentially better for groups of commands which could
share common features.

Predictably it's also possible to decorate a pre-existing object post-creation
with metadata. This is a somewhat contrived example:

    var isemail = /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/;
    isemail.test.metadata = {
      description: 'Tests to see if the address is an email',
      params: [ name: 'email', type: 'string', description: 'The addr to test' ]
    };
    isemail.toString.metadata = {
      description: 'Retrieve the regular expression used to test email addrs'
    };
    canon.addCommands(isemail, 'isemail');

This could then be used like this:

    > isemail test jwalker@mozilla.mistake
    false
    
    > isemail toString
    /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/

This alternative exists because it's obvious given the other examples and
because implementing it wasn't hard, but it remains to be seen actually how
useful it is. Support may be removed in the future, please tell us if you find
it useful.


### Returning data

The command meta-data specifies the type of data returned by the command using
the ``returnValue`` setting.

Some examples of this is practice:

    { returnType: "string" }
    ...
    return "example";

GCLI interprets the output as a plain string. It will be escaped before display
and available as input to other commands as a plain string.

    { returnType: "html" }
    ...
    return "<p>Hello</p>";

GCLI will interpret this as HTML, and parse it (probably using innerHTML) for
display.

    { returnType: "html" }
    ...
    return document.createElement('div');

GCLI will use the returned HTML element as returned. Important: In some
environments (e.g. embedded in Firefox) there is no global ``document``. We
will provide an API like ``var doc = gcli.getDocument();`` to get access to
a source of raw DOM nodes.

    { returnType: "number" }
    ...
    return 42;

GCLI will display the element in a similar way to a string, but it the value
will be available to future commands as a number.

    { returnType: "date" }
    ...
    return new Date();

    { returnType: "file" }
    ...
    return new File();

Both these examples return data as a given type, for which a converter will
be required before the value can be displayed. The type system is likely to
change before this is finalized. Please contact the author for more
information.

    { returnType: "string" }
    ...
    var promise = gcli.createPromise();
    setTimeout(function() {
      promise.resolve("hello");
    }, 500);
    return promise;

This is an example of how to provide asynchronous output. It is expected that
we will be able to provide progress feedback using:

    promise.setProgress(0.5, "Half way through");

Errors can be signalled by throwing an exception. GCLI will display the
message property (or the toString() value if there is no message property).
(However see *3 principles for writing commands* above for ways to avoid
doing this).


### Specifying Types

Types are generally specified by a simple string, e.g. ``'string'``. For most
types this is enough detail. There are a number of exceptions:

* Array types. We declare a parameter to be an array of things using ``[]``,
  for example: ``number[]``.
* Selection types. There are 3 ways to specify the options in a selection:
  * Using a lookup map

            type: {
              name: 'selection',
              lookup: { one:1, two:2, three:3 }
            }

    (The boolean type is effectively just a selection that uses
    ``lookup:{ 'true': true, 'false': false }``)

  * Using given strings

            type: {
              name: 'selection',
              data: [ 'left', 'center', 'right' ]
            }

  * Using named objects, (objects with a ``name`` property)

            type: {
              name: 'selection',
              data: [
                { name: 'Google', url: 'http://www.google.com/' },
                { name: 'Microsoft', url: 'http://www.microsoft.com/' },
                { name: 'Yahoo', url: 'http://www.yahoo.com/' }
              ]
            }

* Deferred type. It is generally best to inherit from Deferred in order to
  provide a customization of this type. See settingValue for an example.

See below for more information.


## Writing Types

Commands are a fundamental building block because they are what the users
directly interacts with, however they are built on ``Type``s. There are a
number of built in types:

* string. This is a JavaScript string
* number. A JavaScript number
* boolean. A Javascript boolean
* selection. This is an selection from a number of alternatives
* deferred. This type could change depending on other factors, but is well
  defined when one of the conversion routines is called.

There are a number of additional types defined by Pilot and GCLI as
extensions to the ``selection`` and ``deferred`` types

* setting. One of the defined settings
* settingValue. A value that can be applied to an associated setting.
* command. One of the defined commands

Most of our types are 'static' e.g. there is only one type of 'string', however
some types like 'selection' and 'deferred' are customizable.

All types must inherit from Type and have the following methods:

    /**
     * Convert the given <tt>value</tt> to a string representation.
     * Where possible, there should be round-tripping between values and their
     * string representations.
     */
    stringify: function(value) { return 'string version of value'; },

    /**
     * Convert the given <tt>str</tt> to an instance of this type.
     * Where possible, there should be round-tripping between values and their
     * string representations.
     * @return Conversion
     */
    parse: function(str) { return new Conversion(...); },

    /**
     * The plug-in system, and other things need to know what this type is
     * called. The name alone is not enough to fully specify a type. Types like
     * 'selection' and 'deferred' need extra data, however this function returns
     * only the name, not the extra data.
     * <p>In old bespin, equality was based on the name. This may turn out to be
     * important in Ace too.
     */
    name: 'example',

    /**
     * If there is some concept of a higher value, return it,
     * otherwise return undefined. Type has this definition so this does not
     * need to be repeated.
     */
    increment: function(value) { return undefined; },

    /**
     * If there is some concept of a lower value, return it,
     * otherwise return undefined. Type has this definition so this does not
     * need to be repeated.
     */
    decrement: function(value) { return undefined; },

    /**
     * There is interesting information (like predictions) in a conversion of
     * nothing, the output of this can sometimes be customized. Type has this
     * definition so this does not need to be repeated.
     * @return Conversion
     */
    getDefault: function() { return this.parse(''); }

Type, Conversion and Status are all declared by canon.js.

The values produced by the parse function can be of any type, but if you are
producing your own, you are strongly encouraged to include properties called
``name`` and ``description`` where it makes sense. There are a number of
places in GCLI where the UI will be able to provide better help to users if
your values include these properties.


## Writing Fields

Fields are visual representations of types. For simple types like string it is
enough to use ``<input type=...>``, however more complex types we may wish to
provide a custom widget to allow the user to enter values of the given type.

This is an example of a very simple new password field type:

    function PasswordField(doc) {
      this.doc = doc;
    }
    
    PasswordField.prototype = Object.create(Field.prototype);
    
    PasswordField.prototype.createElement = function(assignment) {
      this.assignment = assignment;
      this.input = this.doc.createElement('input');
      this.input.type = 'password';
      this.input.value = assignment.arg ? assignment.arg.text : '';
    
      this.onKeyup = function() {
          this.assignment.setValue(this.input.value);
      }.bind(this);
      this.input.addEventListener('keyup', this.onKeyup, false);
    
      this.onChange = function() {
          this.input.value = this.assignment.arg.text;
      };
      this.assignment.assignmentChange.add(this.onChange, this);
    
      return this.input;
    };
    
    PasswordField.prototype.destroy = function() {
      this.input.removeEventListener('keyup', this.onKeyup, false);
      this.assignment.assignmentChange.remove(this.onChange, this);
    };
    
    PasswordField.claim = function(type) {
      return type.name === 'password' ? Field.claim.MATCH : Field.claim.NO_MATCH;
    };


## About the code

The majority of the GCLI source is stored in the ``lib`` directory.

The ``scripts`` directory contains RequireJS and ES5-shim code that GCLI uses.
The ``build`` directory contains build artifacts (checked in so no build step
is needed) and files to use those build artifacts.

The source in the ``lib`` directory is split into 4 sections:

- ``lib/demo`` contains commands used in the demo page. It is not needed except
  for demo purposes.
- ``lib/test`` contains a small test harness for testing GCLI.
- ``lib/gclitest`` contains tests that run in the test harness
- ``lib/gcli`` contains the actual meat

GCLI is split into a UI portion and a Model/Controller portion.


### The GCLI Model

The heart of GCLI is a ``Requisition``, which is an AST for the input. A
``Requisition`` is a command that we'd like to execute, and we're filling out
all the inputs required to execute the command.

A ``Requisition`` has a ``Command`` that is to be executed. Each Command has a
number of ``Parameter``s, each of which has a name and a type as detailed
above.

As you type, your input is split into ``Argument``s, which are then assigned to
``Parameter``s using ``Assignment``s. Each ``Assignment`` has a ``Conversion``
which stores the input argument along with the value that is was converted into
according to the type of the parameter.

There are special assignments called ``CommandAssignment`` which the
``Requisition`` uses to link to the command to execute, and
``UnassignedAssignment``used to store arguments that do not have a parameter
to be assigned to.


### The GCLI UI

There are several components of the GCLI UI. Each can have a script portion,
some template HTML and a CSS file. The template HTML is processed by
``domtemplate`` before use.

DomTemplate is fully documented in [it's own repository]
(https://github.com/joewalker/domtemplate).

The components are:

- ``Inputter`` controls the input field, processing special keyboard events and
  making sure that it stays in sync with the Requisition.
- ``Completer`` updates a div that is located behind the input field and used
  to display completion advice and hint highlights. It is stored in inputter.js.
- ``Popup`` is responsible for containing the popup hints that are displayed
  above the command line. Typically Popup contains a Hinter and a RequestsView
  although these are not both required. Popup itself is optional, and isn't
  planned for use in the first release of GCLI in Firefox.
- ``Hinter`` Is used to display input hints. It shows either a Menu or an
  ArgFetch component depending on the state of the Requisition
- ``Menu`` is used initially to select the command to be executed. It can act
  somewhat like the Start menu on windows.
- ``ArgFetch`` Once the command to be executed has been selected, ArgFetch
  shows a 'dialog' allowing the user to enter the parameters to the selected
  command.
- ``RequestsView`` Contains a set of ``RequestView`` components, each of which
  displays a command that has been invoked. RequestsView is a poor name, and
  should better be called ReportView

ArgFetch displays a number of Fields. There are fields for most of the Types
discussed earlier. See 'Writing Fields' above for more information.


### Coding Conventions

The coding conventions for the GCLI project come from the Bespin/Skywriter and
Ace projects. They are roughly [Crockford]
(http://javascript.crockford.com/code.html) with a few exceptions and
additions:

* ``var`` does not need to be at the top of each function, we'd like to move
  to ``let`` when it's generally available, and ``let`` doesn't have the same
  semantic twists as ``var``.

* Strings are generally enclosed in single quotes.

* ``eval`` is to be avoided, but we don't declare it evil.

The [Google JavaScript conventions]
(https://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml) are
more detailed, we tend to deviate in:

* Custom exceptions: We generally just use ``throw new Error('message');``

* Multi-level prototype hierarchies: Allowed; we don't have ``goog.inherits()``

* ``else`` begins on a line by itself:

        if (thing) {
          doThis();
        }
        else {
          doThat();
        }

We may have markers in the code as follows:

* ``TODO``: This marks code that needs fixing before we do a release. We should
  either fix the code or raise a bug and link using ``BUG``

* ``IDEAL``: Sometimes we know the code we'd like to write, but need a
  pragmatic solution that works for now. In these cases we should mark the
  code and document the ``IDEAL`` solution.

* ``FUTURE``: There are cases where the code we'd like to write isn't possible
  because not all browsers support the feature we'd like to use. This tag
  should be used sparingly (i.e. not for every ``var`` that we'd like to be
  ``let``). es5shim should be used where possible.

* ``BUG XXXXXX``: Where a known bug affects some code, we mark it with the bug
  to help us keep track of bugs and the code that is affected.
