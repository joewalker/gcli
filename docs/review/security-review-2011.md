
Introduction
============

Generic Intro: GCLI is a command line for modern computers. When command lines
were invented, computers were resource-limited, disconnected systems with slow
multi-tasking and poor displays. The design of the Unix CLI made sense in 1970,
but over 40 years on, considering the pace of change, there are many
improvements we can make.

GCLI has a type system to help ensure that users are inputting valid commands
and to enable us to provide sensible context sensitive help. GCLI provides deep
integration with JavaScript rather than being an alternative (like CoffeeScript)

GCLI is available either as a web page component
(see http://mozilla.github.com/gcli/ for a demo) or as a part of the Firefox
developer tools where it replaces the JavaScript command line. In the future it
may be available as a XULRunner standalone package.

GCLI commands take 2 forms. Either the command is defined using some metadata,
or it as plain JavaScript wrapped in { ... }.

A command is defined something like this:

    gcli.addCommand({
      name: 'greet',
      description: 'Show a greeting',
      params: [
        {
          name: 'name',
          type: 'string',
          description: 'The name to greet'
        }
      ],
      returnType: 'string',
      exec: function(args, context) {
        return "Hello, " + args.name;
      }
    });

This command is used as follows:

    » greet Joe
    Hello, Joe

Alternatively the user can enter plain JavaScript:

    » { console.log('hi') }
    hi

These styles can be mixed as follows:

    » greet { 2 + 2 }
    Hello, 4

Note: This ability to mix commands and JS is currently not enabled due to lack
of security review.


Status of GCLI
--------------

GCLI is currently committed to mozilla-central, but preffed off. It is hoped
that the remaining bugs will be fixed for Firefox 10. However currently there
may not be enough commands implemented to warrant turning GCLI on by default.


Design Principles
-----------------

The following principles are designed to keep GCLI 'safe'

* GCLI commands can never be executed by a page - only by the user taking
  explicit action
* When deployed in a web page GCLI executes entirely with page privileges
* When deployed In Firefox, commands are executed with Chrome privileges.
  JavaScript is executed in a sandbox with the window as a global object.
  The sandbox code for GCLI is based on the sandbox code in the existing web
  console.


Features to be aware of
-----------------------

GCLI has an API to allow add-on authors to create their own commands.
We would like to have an ultra-easy add-on method where you can drop a .js file
into a known location, and then have a command to ask Firefox to re-read the
command files in that location.

Commands that are in GCLI now
-----------------------------

### ``echo <message>``

This command simply echos it's parameter back to the console similar to the
'greet' command above. It somewhat duplicates console.log() and may not prove
to be useful enough to warrant inclusion by default.

Dangers and mitigation: <message> is a string (see the meta-data) and has its
output escaped before display so 'echo <b>hi</b>' displays the string
''<b>hi</b>". Even if the output was displayed without escaping, this is no
more dangerous than a JavaScript command prompt.

This command is generally low risk since it does not interact with the current
page in any way.

### ``help <subject>``

Help provides a description of <subject>. The output text is a combination of
the 'description' and 'manual' properties provided as part of the command
definition, along with various joining statements.

Dangers and mitigation: It is conceivable that someone will provide malicious
help text in a command, however it would seem easier to deploy the trojan as
part of the command execution rather than hoping that the user would ask for
help.
The description field (text only) is displayed in menus without the user asking
for help. The manual field (html allowed in principle, but not in practice) is
currently only displayed when the user asks for help (although not in principle,
just in practice). In summary there is nothing in principle to say we should
not display HTML provided by command meta-data without the user taking steps to
ask for it.
This command is generally low risk since it does not interact with the current
page in any way.

### ``inspect <node>``

This command starts the inspector developer tool on a given node, specified by
CSS expression. For example, 'inspect div#content' will highlight the #content
element for inspection. As the CSS expression is being entered, the page
highlights the matching elements and ensures that the user enters a CSS
expression that matches only one element.

Dangers and mitigation: Currently the live highlighting is done using element
manipulation, which has in the past caused damage to a page, however this will
either be fixed (using an overlay) or turned off before release.

### ``console clear``

This command clears the output in the console.

Dangers and mitigation: There is a vague risk that someone might have put
valuable data into the console, which they lost by being coerced into executing
this command.
This command is generally low risk since it does not interact with the current
page in any way.

### ``{ <script> }``

This command allows the execution of JavaScript.

Dangers and mitigation: The Facebook coercion issue (bug 664589) is the major
issue here. The risks of this command should be the same as the risks of the
current web console.


Commands that are being developed and could make the next release
-----------------------------------------------------------------

### ``edit <css-resource>``

This opens the CSS editor at the given CSS-resource, (one of the stylesheets in
the current page)

Dangers and mitigation: None beyond the risks associated with the CSS editor.

### ``console filter``
### ``console position``

These commands (like 'console clear') are duplicates of the buttons on the
console toolbar.

Dangers and mitigation: None that comes to mind.

### ``scratchpad <name>``

This command opens the scratchpad optionally with an existing saved script.
Dangers and mitigation: Like the 'edit' command most of the risks associated
with this command will like the scratchpad implementation. This command is just
an alternate launcher for an existing menu item.

### ``step <next|up|down>``
### ``breakpoint add <type>``
### ``breakpoint list``
### ``breakpoint remove <id>``

These commands provide alternate ways to control the debugger.

Dangers and mitigation: Like the 'edit' command most of the risks associated 
with this command will like the debugger implementation. This command is just
an alternate launcher for an existing menu item.

### ``screenshot <destination>``

This command takes a screenshot of the current page, and saves it to a file, or
the clipboard if no filename is specified.

Dangers and mitigation: This command alters files on disk, there is a risk that
important system files could be altered by it's use. This risk is mostly born
by the OS providing file permissions. Are there many PNG files that are system
critical?

Commands that are at the planning stage
---------------------------------------

### ``cookie list``
### ``cookie add <data>``
### ``cookie remove <id>``

These commands allow the user to alter cookies for the current domain.
Dangers and mitigation: Some sites may stop working properly or act in
dangerous ways given altered cookie data. Mostly this is the responsibility of
the site owners to protect against. There are many cookie tools in existence
(FireCookie, WebKit Inspector) so these commands are unlikely to create
significant extra risk.

### ``pref list <pattern>``
### ``pref add <name> <value>``
### ``pref remove <name>``

These commands allow the user to view and alter preferences similar to
``about:config``.

Dangers and mitigation: Similar to about:config, misuse of these commands can
adversely affect the users browsing experience. Similar warnings should be
provided as for about:config.

### ``global <context>``

This alters the current global object for JavaScript commands from the default
top level window to a sub-context, like an embedded iframe. It is similar to
the 'cd()' command in Firebug.

Dangers and mitigation: Inadvertent use of this command could cause future
JavaScript commands to have unexpected results.
