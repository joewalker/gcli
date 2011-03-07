
About Cockpit
=============

Cockpit is a Graphical Command Line Interpreter.

It is born of the belief that character based command lines were designed for
computers that are profoundly different from todays computers. They were
resource-limited, disconnected systems with slow multi-tasking and poor
displays. The design of the Unix CLI made sense in 1970, but over 40 years on,
considering the pace of change, there are many improvements we can make.

CLIs generally suffer from poor discoverability; It's hard when faced with a
blank command line to work out what to do. As a result the majority of programs
today use purely graphical user interfaces, however in doing so, they lose some
of the benefits of CLIs. CLIs are still used because generally, in the hands of
a skilled user they are faster, and have a wider range of available options.

Cockpit attempts to get the best of the GUI world and the CLI world to produce
something that is both easy to use and learn as well as fast and powerful.


Supported Environments
----------------------

Cockpit is designed to work in a number of environments:

1. As a component of Firefox developer tools. As such it should be capable of
   replacing the WebConsole command line, the Firebug command line and
   providing the ability for extensions to Firefox developer tools without
   interface clutter.
2. As an adjunct to Ace and possible component for Cloud9.
3. As a plugin to any web-page wishing to provide its own set of commands.
4. As part of a standalone web browser extension with it's own set of commands.

Currently only 1. and 2. of these is directly supported, support for other
environments may follow.

In order to support these environments Cockpit will need to:

- Be usable in modern browsers plus IE8
- Make the UI fairly simple to re-implement (since some environments might have
  a styling/templating system which doesn't fit with the supplied model)


User Guide
----------

Cockpit prides itself on being easy to use, plus people don't read user guides,
therefore it seems pointless having a long users guide and self defeating to
write one.

Simply, there is a command line that you can type at, and a combined prompt /
start button that you can click. You get all the other help you need as you go
along.


Design Goals
------------

Cockpit should be:

- primarily for technical users.
- as fast as a traditional CLI. It should be possible to put your head down,
  and look at the keyboard and use Cockpit 'blind' at full speed without making
  mistakes.
- mousable with similar gestures to a GUI. It should be possible to hide the
  input area and use Cockpit in a similar way to a GUI.
- principled about the way it encourages people to build commands. There is
  benefit from unifying the underlying concepts.
- automatically helpful.

Cockpit should not attempt to:

- convert existing GUI users to a CLI.
- gain a touch based interface. Whilst it's possible (even probable) that touch
  can provide further benefits to command line users, that can wait while we
  catch up with 1985.
- slavishly follow the syntax of existing commands, predictability is more
  important.


Design Changes
--------------

What has changed since 1970 that might cause us to make changes to the design
of the command line?

### Connection limitations

Unix pre-dates the Internet and treats almost everything as a file. Hardware,
processes and even remote systems are seen as files. Modern concepts like
meta-data, and alternative formats stretch this simplicity and it is more
common today to see everything as a URI, indeed many modern UIs attempt to hide
the filesystem from users.

### Memory limitations

Modern computers have something like 6 orders of magnitude more memory than the
PDP-7 on which Unix was developed (about like 8K of RAM according to [1]).
Innovations like stdin/stdout and pipes are all ways to connect systems without
long-term storage of the results. The ability to store results for some time
(potentially in more than one format) significantly reduces the need for these
concepts.

We should make the results of past commands addressable as URIs. We should
allow commands which push results into the history and we should allow URIs
which can address specific sub-components of a history item.

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

Cockpit will allow commands to be asynchronous and will provide UI elements
to inform the user of job completion. It will also keep asynchronous command
output contained within it's own display area.

### Output limitations

The PDP-7 had a teletype. There is something like 4 orders of magnitude more
information that can be displayed on a modern display than a 80x24 character
based console. We can use this flexibility to provide better hints to the user
in completing their command.

Interaction - mouse clicks for new commands, continually updating output,
output that asks for more input.

### Processing Speed

Command meta-data


User Improvements
-----------------

HTML output
Background default
Stored results
Typed data
Graphical hints / mouse use
Inline help
Syntax checking


Embedding Cockpit
-----------------

There are 3 basic steps in using cockpit in your system.

1. Import a script. Pre-built scripts are available in the ``build``
   directory. **Or at least they should be**. Just place the following
   wherever you place your script files.

    <script src="path/to/cockpit.js" type="text/javascript"></script>

   TODO: build cockpit.

2. Having imported cockpit, we need to tell it where to go. The simplest
   method is to include an input element with the id of ``cockpitInput``.

    <input id="cockpitInput" type="text"/>

   Optionally, if you want the output to be always visible or under your
   control, you can include an output element as follows:

    <div id="cockpitOutput"></div>

   If this element is not present, Cockpit will create its own output
   element and show it above or below the input element whenever the command
   line has keyboard focus.

   TODO: Check this last part works

3. Tell cockpit what commands to make available. See the sections on Writing
   Commands, Writing Types and Writing Fields for more information.

   One important thing to note is that this must be done after Cockpit has
   initialized. The easy way to do this is to ride on the onCockpitInit
   ``event``.

    window.onCockpitInit = function(require) {
      var canon = require('pilot/canon');
      canon.addCommand({ ... });
    };


Writing Commands
----------------

3 principles for writing commands:

- Related commands should be sub-commands of a parent command. One of the goals
  of Cockpit is to support a large number of commands without things becoming
  confusing, this will require some sort of namespacing or there will be
  many people wanting to implement the ``add`` command. This style of
  writing commands has become common place in Unix as the number of commands
  has gone up.
  We plan to support some type of ``focus`` concept to allow a parent command
  to become a default, promoting its sub-commands above others.
- Each command should do exactly and only one thing. An example of a unix
  command that breaks this principle is the ``tar`` command.

    $ tar -zcf foo.tar.gz .
    // Creates an archive of the current directory into foo.tar.gz
    
    $ tar -zxf foo.tar.gz .
    // Extracts foo.tar.gz into the current directory

  These 2 commands do exactly opposite things. It shouldn't take much
  reflection to see why this is bad design. In cockpit this would be better
  expressed:

    $ tar create foo.tar.gz -z .
    // and
    $ tar extract foo.tar.gz -z .

  A potential future feature is a 'what is this command going to do' summary:
  something along the lines of the comments after the ``tar`` commands above
  this could be very confusing if the addition of a single letter late on in
  the command line radically alters the action of the command.
- Avoid breaking. We're doing everything we can to avoid the user having to
  start again with a command due to some problem. The majority of problems
  are simple typos which we can catch using command metadata, but there are 2
  things command authors can do to prevent breakage.
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

- Named parameters vs. positional parameters
- Long names vs. short names
- Array arguments

There are 3 different formats in which commands can be written.

1. Object Literal syntax. This is the way Cockpit stores commands
   internally, so it is to some extend the 'native' syntax.
2. Function Metadata Syntax. This is ideal for decorating existing functions
   with the metadata to allow use with Cockpit.
3. Object Metadata Syntax. This is ideal for grouping related commands
   together.

Each command should have the following properties:

- A string ``name``.
- A short ``description`` string. Generally no more than 40 characters.
- A function to ``exec``ute.

And optionally the following extra properties:

- A declaration of the accepted ``params``.
- A longer description in the form of a ``manual``.
- A ``hidden`` property to stop the command showing up in requests for help.
- A ``context`` property which defines the scope of the function that we're
  calling. Rather than simply call ``exec()``, we do ``exec.call(context)``.

TODO: the exact nature of these properties should be defined better.

The ``params`` property is an array of objects, one for each parameter. Each
parameter object should have the following 3 properties:

- A string ``name``.
- A short string ``description``.
- A ``type`` which refers to an existing Type (see Writing Types).

Optionally each parameter can have these properties:

- A ``defaultValue`` (which should normally be in the type specified in
  ``type``). The defaultValue will be used when there is no argument supplied
  for this parameter on the command line. If the parameter specifies
  ``defaultValue: undefined`` (or the defaultValue property is missing) the
  matching argument will have the value ``undefined`` when the function is
  called. Using ``defaultValue: null`` indicates that a value must be supplied
  by the user of the command line.
- A ``manual`` property for parameters is exactly analogous to the ``manual``
  property for commands - descriptive text that is longer than than 40
  characters.

### Object Literal Syntax

This method is simplest and closest to how Cockpit works internally.
It is designed for situations when you are creating a single command
specifically for Cockpit. The parameters to the exec function are designed to
allow output without generating a request object first, or sepecially asking
for the environment.

    canon.addCommand({
      name: 'echo',
      description: 'The message to display.',
      params: [
        {
          name: 'message',
          type: 'text',
          description: 'The message to display.'
        }
      ],
      exec: function(env, args, request) {
        request.done(args.message);
      }
    });

TODO: The ``env`` object is improperly specified right now.

The ``args`` object contains the values specified on the params section and
provided on the command line. In this example it would contain the message for
display as ``args.message``.

The ``request`` object contains methods for providing output to the system.
See below for details on the functions available on a Request.

### Function Metadata Syntax

The Object Literal Syntax can't be used to decorate existing functions partly
because it could entail some confusing 're-parenting' but more seriously
because it requires a specific signature in terms of parameters.

The Function Metadata Syntax is designed for cases when you want to decorate
an existing function. Which allows us to package window.alert as a Cockpit
function:

    window.alert.metadata = {
      name: 'alert',
      context: window,
      description: 'Show an alert dialog',
      params: [ { name: 'message', type: 'text', description: '...' } ]
    };
    canon.addCommand(window.alert);

It is important to define the parameters in the correct order to that in
which the function you are decorating expects.

Note: It's possible that requirements to support older browsers may conflict
with how we are currently supporting Function Metadata Syntax. Stay tuned.

It is possible to use Function Metadata Syntax more conventionally with
functions designed for Cockpit. There are 2 useful features which can help in
this - [function hoisting] [fh] and the ability to fetch the environment or a
request from the canon.

Function hoisting makes it possible to define function metadata before the
function. This may look a little strange initially, but it's common for
documentation to come before the thing it documents.

    echo.metadata = {
      name: 'echo',
      description: 'Show a message',
      params: [
        {
          name: 'message',
          type: 'text',
          description: 'The message to display.'
        }
      ]
    };
    function echo(message) {
      var request = canon.getRequest();
      request.done(message);
    }
    canon.addCommand(echo);

The canon functions ``getRequest()`` and ``getEnvironment()`` allow access
to the request and env objects that are normally provided as parameters.

[fh]: https://developer.mozilla.org/en/JavaScript/Reference/Scope_Cheatsheet

### Object Metadata Syntax

TODO: The Object Metadata Syntax needs updating.

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
        exec: function(env, args, request) {
          ...
        },
      },
      
      extract: {
        description: 'Extract files from an archive.',
        params: [
          { name: 'file', type: 'file', description: 'The source file.' },
          { name: 'compress', type: 'boolean', description: '...' }
        ],
        exec: function(env, args, request) {
          ...
        },
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
      params: [ name: 'email', type: 'text', description: 'The addr to test' ]
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

### Request Object

TODO: The Request object should allow control over returned values, their
types and ways they can be converted to other types.

The request object allows interaction with the command line output and to
control asynchronous completion.

Example usage:

Display the given message and signal completion to the system:

    request.done('Finished!');

As above, but display a number of messages in the output:

    [ 1, 2, 3 ].forEach(function(i) {
      request.output('Count=' + i);
    });
    request.done('Finished!');

If something has gone wrong, it can be signaled using:

    request.error = true;

(However see *3 principles for writing commands* above for ways to avoid
doing this).

There is some sugar for ending with an error:

    request.doneWithError('It broke');

is the same as:

    request.error = true;
    request.done('It broke');

Going Async:

    request.async();

If a command exits without having produced any output and without having called
``done()`` then it is considered finished. If a command calls ``output()``
or ``async()`` without subsequently calling ``done()`` then it will be
considered asynchronous, and incomplete when the function ends. The command
will be considered complete when ``done()`` is called.

For example:

    canon.addCommand({
      name: 'slow',
      description: 'Display a message after a given interval.',
      params: [
        {
          name: 'delay',
          type: 'number',
          description: 'The time to delay (in seconds).'
        }
      ],
      exec: function(env, args, request) {
        request.async();
        setTimeout(function() {
          request.done('Finished!');
        }, args.delay * 1000);
      }
    });

### Specifying Types

Types are generally specified by a simple string, e.g. ``'text'``. For most
types this is enough detail. There are a number of exceptions:

* Array types. We declare a parameter to be an array of things using ``[]``,
  for example: ``number[]``.
* Selection types. This is an example of how to specify a custom selection:

    type: {
        name: 'selection',
        data: [ 'no', 'normal', 'all' ]
    },

* Deferred type. It is generally best to inherit from Deferred in order to
  provide a customization of this type. See settingValue for an example.

See below for more information.


Writing Types
-------------

TODO: Type is a bit of a misnomer - perhaps it should be called Converter?

Commands are a fundamental building block because they are what the users
directly interacts with, however they are built on ``Type``s. There are a
number of built in types:

* text. This is a JavaScript string (and will shortly be renamed to 'string')
* number. A JavaScript number
* bool. A Javascript boolean (and shortly to be renamed to 'boolean')
* selection. This is an selection from a number of alternatives
* deferred. This type could change depending on other factors, but is well
  defined when one of the conversion routines is called.

There are a number of additional types defined by Pilot and Cockpit as
extensions to the ``selection`` and ``deferred`` types

* setting. One of the defined settings
* settingValue. A value that can be applied to an associated setting.
* command. One of the defined commands

Most of our types are 'static' e.g. there is only one type of 'text', however
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
places in Cockpit where the UI will be able to provide better help to users
if your values include these properties.


Writing Fields
--------------

Fields are visual representations of types. For simple types like text it is
enough to use ``<input type=...>``, however more complex types we may wish to
provide a custom widget to allow the user to enter values of the given type.

This is an example of a very simple new password field type:

    function PasswordField(doc) {
      this.doc = doc;
    }
    
    oop.inherits(PasswordField, Field);
    
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
      }.bind(this);
      this.assignment.addEventListener('assignmentChange', this.onChange);
    
      return this.input;
    };
    
    PasswordField.prototype.destroy = function() {
      this.input.removeEventListener('keyup', this.onKeyup, false);
      this.assignment.removeEventListener('assignmentChange', this.onChange);
    };
    
    PasswordField.claim = function(type) {
      return type.name === 'password' ? Field.claim.MATCH : Field.claim.NO_MATCH;
    };


