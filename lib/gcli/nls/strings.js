
'use strict';

/**
 * This file has detailed comments as to the usage of these strings so when
 * translators work on these strings separately from the code, (but with the
 * comments) they have something to work on.
 * Each string should be commented using single-line comments.
 */
var i18n = {
  root: {
    // This message is used to describe any command or command parameter when
    // no description has been provided.
    canonDescNone: '(No description)',

    // The default name for a group of parameters.
    canonDefaultGroupName: 'Options',

    // These commands are used to execute commands on a remote system (using a
    // proxy). Parameters: %S is the name of the remote system.
    canonProxyDesc: 'Execute a command on %S',
    canonProxyManual: 'A set of commands that are executed on a remote system. The remote system is reached via %S',

    // This error message is displayed when we try to add a new command (using
    // a proxy) where one already exists with the same name.
    canonProxyExists: 'There is already a command called \'%S\'',

    // This message describes the '{' command, which allows entry of JavaScript
    // like traditional developer tool command lines.
    cliEvalJavascript: 'Enter JavaScript directly',

    // This message is displayed when the command line has more arguments than
    // the current command can understand.
    cliUnusedArg: 'Too many arguments',

    // The title of the dialog which displays the options that are available
    // to the current command.
    cliOptions: 'Available Options',

    // The error message when the user types a command that isn't registered
    cliUnknownCommand: 'Invalid Command',

    // A parameter should have a value, but doesn't
    cliIncompleteParam: 'Value required for \'%1$S\'.',

    // Error message given when a file argument points to a file that does not
    // exist, but should (e.g. for use with File->Open)
    // %1$S is a filename
    fileErrNotExists: '\'%1$S\' doesn\'t exist',

    // Error message given when a file argument points to a file that exists,
    // but should not (e.g. for use with File->Save As)
    // %1$S is a filename
    fileErrExists: '\'%1$S\' already exists',

    // Error message given when a file argument points to a non-file, when a
    // file is needed. %1$S is a filename
    fileErrIsNotFile: '\'%1$S\' is not a file',

    // Error message given when a file argument points to a non-directory,
    // when a directory is needed (e.g. for use with 'cd')
    // %1$S is a filename
    fileErrIsNotDirectory: '\'%1$S\' is not a directory',

    // Error message given when a file argument does not match the specified
    // regular expression
    // %1$S is a filename
    // %2$S is a regular expression
    fileErrDoesntMatch: '\'%1$S\' does not match \'%2$S\'',

    // When a command has a parameter that has a number of pre-defined options
    // the user interface presents these in a drop-down menu, where the first
    // 'option' is an indicator that a selection should be made. This string
    // describes that first option.
    fieldSelectionSelect: 'Select a %S…',

    // When a command has a parameter that can be repeated multiple times (e.g.
    // like the 'cat a.txt b.txt' command) the user interface presents buttons
    // to add and remove arguments. This string is used to add arguments.
    fieldArrayAdd: 'Add',
    fieldArrayDel: 'Delete',

    // When the menu has displayed all the matches that it should (i.e. about
    // 10 items) then we display this to alert the user that more matches are
    // available.
    fieldMenuMore: 'More matches, keep typing',

    // The command line provides completion for JavaScript commands, however
    // there are times when the scope of what we're completing against can't
    // be used. This error message is displayed when this happens.
    jstypeParseScope: 'Scope lost',

    // These error messages are displayed when the command line is doing
    // JavaScript completion and encounters errors.
    jstypeParseMissing: 'Can\'t find property \'%S\'',
    jstypeBeginSyntax: 'Syntax error',
    jstypeBeginUnterm: 'Unterminated string literal',

    // This message is displayed if the system for providing JavaScript
    // completions encounters and error it displays this.
    jstypeParseError: 'Error',

    // These error messages are displayed when the command line is passed a
    // variable which has the wrong format and can't be converted.
    // Parameters: %S is the passed variable.
    typesNumberNan: 'Can\'t convert "%S" to a number.',
    typesNumberNotInt2: 'Can\'t convert "%S" to an integer.',
    typesDateNan: 'Can\'t convert "%S" to a date.',

    // These error messages are displayed when the command line is passed a
    // variable which has a value out of range (number or date).
    // Parameters: %1$S is the passed variable, %2$S is the limit value.
    typesNumberMax: '%1$S is greater than maximum allowed: %2$S.',
    typesNumberMin: '%1$S is smaller than minimum allowed: %2$S.',
    typesDateMax: '%1$S is later than maximum allowed: %2$S.',
    typesDateMin: '%1$S is earlier than minimum allowed: %2$S.',

    // This error message is displayed when the command line is passed an
    // option with a limited number of correct values, but the passed value is
    // not one of them.
    typesSelectionNomatch: 'Can\'t use \'%S\'.',

    // This error message is displayed when the command line is expecting a CSS
    // query string, however the passed string is not valid.
    nodeParseSyntax: 'Syntax error in CSS query',

    // These error messages are displayed when the command line is expecting a
    // CSS string that matches a single node, but more nodes (or none) match.
    nodeParseMultiple: 'Too many matches (%S)',
    nodeParseNone: 'No matches',

    // These strings describe the "help" command, used to display a description
    // of a command (e.g. "help pref"), and its parameter 'search'.
    helpDesc: 'Get help on the available commands',
    helpManual: 'Provide help either on a specific command (if a search string is provided and an exact match is found) or on the available commands (if a search string is not provided, or if no exact match is found).',
    helpSearchDesc: 'Search string',
    helpSearchManual3: 'search string to use in narrowing down the displayed commands. Regular expressions not supported.',

    // These strings are displayed in the help page for a command in the
    // console.
    helpManSynopsis: 'Synopsis',

    // This message is displayed in the help page if the command has no
    // parameters.
    helpManNone: 'None',

    // This message is displayed in response to the 'help' command when used
    // without a filter, just above the list of known commands.
    helpListAll: 'Available Commands:',

    // These messages are displayed in response to the 'help <search>' command
    // (i.e. with a search string), just above the list of matching commands.
    // Parameters: %S is the search string.
    helpListPrefix: 'Commands starting with \'%S\':',
    helpListNone: 'No commands starting with \'%S\'',

    // When the 'help x' command wants to show the manual for the 'x' command,
    // it needs to be able to describe the parameters as either required or
    // optional, or if they have a default value.
    helpManRequired: 'required',
    helpManOptional: 'optional',
    helpManDefault: 'optional, default=%S',

    // Text shown as part of the output of the 'help' command when the command
    // in question has sub-commands, before a list of the matching sub-commands.
    subCommands: 'Sub-Commands',

    // Text shown as part of the output of the 'help' command when the command
    // in question should have sub-commands but in fact has none.
    subCommandsNone: 'None',

    // These strings are used to describe the 'context' command and its
    // 'prefix' parameter. See localization comment for 'connect' for an
    // explanation about 'prefix'.
    contextDesc: 'Concentrate on a group of commands',
    contextManual: 'Setup a default prefix to future commands. For example \'context git\' would allow you to type \'commit\' rather than \'git commit\'.',
    contextPrefixDesc: 'The command prefix',

    // This message message displayed during the processing of the 'context'
    // command, when the found command is not a parent command.
    contextNotParentError: 'Can\'t use \'%S\' as a prefix because it is not a parent command.',

    // These messages are displayed during the processing of the 'context'
    // command, to indicate success or that there is no command prefix.
    contextReply: 'Using %S as a command prefix',
    contextEmptyReply: 'Command prefix is unset',

    // These strings describe the 'connect' command and all its available
    // parameters. A 'prefix' is an  alias for the remote server (think of it
    // as a "connection name"), and it allows to identify a specific server
    // when connected to multiple remote servers.
    connectDesc: 'Proxy commands to server',
    connectManual: 'Connect to the server, creating local versions of the commands on the server. Remote commands initially have a prefix to distinguish them from local commands (but see the context command to get past this)',
    connectPrefixDesc: 'Parent prefix for imported commands',
    connectPortDesc: 'The TCP port to listen on',
    connectHostDesc: 'The hostname to bind to',
    connectDupReply: 'Connection called %S already exists.',

    // The output of the 'connect' command, telling the user what it has done.
    // Parameters: %S is the prefix command. See localization comment for
    // 'connect' for an explanation about 'prefix'.
    connectReply: 'Added %S commands.',

    // These strings describe the 'disconnect' command and all its available
    // parameters. See localization comment for 'connect' for an explanation
    // about 'prefix'.
    disconnectDesc2: 'Disconnect from server',
    disconnectManual2: 'Disconnect from a server currently connected for remote commands execution',
    disconnectPrefixDesc: 'Parent prefix for imported commands',
    disconnectForceDesc: 'Ignore outstanding requests',

    // This is the output of the 'disconnect' command, explaining the user what
    // has been done. Parameters: %S is the number of commands removed.
    disconnectReply: 'Removed %S commands.',

    // This error message is displayed when the user attempts to disconnect
    // before all requests have completed. Parameters: %S is a list of
    // incomplete requests.
    disconnectOutstanding: 'Outstanding requests (%S)',

    // These strings describe the 'cd' command and its parameters.
    cdDesc: 'Change working directory',
    cdManual: 'Change the current working directory as used by the exec command',
    cdDirectoryDesc: 'The new working directory',
    cdOutput: 'Working directory is now %S',

    // These strings describe the 'exec' command and its parameters.
    execDesc: 'Execute a system command',
    execManual: '',
    execCommandDesc: 'The command to execute',

    // These strings describe the 'global' command and its parameters
    globalDesc: 'Change the JS global',
    globalWindowDesc: 'The new window/global',
    globalOutput: 'JS global is now %S',

    // These strings describe the 'pref' command and all its available
    // sub-commands and parameters.
    prefDesc: 'Commands to control settings',
    prefManual: 'Commands to display and alter preferences both for GCLI and the surrounding environment',
    prefListDesc: 'Display available settings',
    prefListManual: 'Display a list of preferences, optionally filtered when using the \'search\' parameter',
    prefListSearchDesc: 'Filter the list of settings displayed',
    prefListSearchManual: 'Search for the given string in the list of available preferences',
    prefShowDesc: 'Display setting value',
    prefShowManual: 'Display the value of a given preference',
    prefShowSettingDesc: 'Setting to display',
    prefShowSettingManual: 'The name of the setting to display',

    // This message is used to show the preference name and the associated
    // preference value. Parameters: %1$S is the preference name, %2$S is the
    // preference value.
    prefShowSettingValue: '%1$S: %2$S',

    // These strings describe the 'pref set' command and all its parameters.
    prefSetDesc: 'Alter a setting',
    prefSetManual: 'Alter preferences defined by the environment',
    prefSetSettingDesc: 'Setting to alter',
    prefSetSettingManual: 'The name of the setting to alter.',
    prefSetValueDesc: 'New value for setting',
    prefSetValueManual: 'The new value for the specified setting',

    // These strings are displayed to the user the first time they try to alter
    // a setting.
    prefSetCheckHeading: 'This might void your warranty!',
    prefSetCheckBody: 'Changing these advanced settings can be harmful to the stability, security, and performance of this application. You should only continue if you are sure of what you are doing.',
    prefSetCheckGo: 'I\'ll be careful, I promise!',

    // These strings describe the 'pref reset' command and all its parameters.
    prefResetDesc: 'Reset a setting',
    prefResetManual: 'Reset the value of a setting to the system defaults',
    prefResetSettingDesc: 'Setting to reset',
    prefResetSettingManual: 'The name of the setting to reset to the system default value',

    // This string is displayed in the output from the 'pref list' command as a
    // label to an input element that allows the user to filter the results.
    prefOutputFilter: 'Filter',

    // These strings are displayed in the output from the 'pref list' command
    // as table headings.
    prefOutputName: 'Name',
    prefOutputValue: 'Value',

    // These strings describe the 'intro' command. The localization of
    // 'Got it!' should be the same used in introTextGo.
    introDesc: 'Show the opening message',
    introManual: 'Redisplay the message that is shown to new users until they click the \'Got it!\' button',

    // These strings are displayed when the user first opens the developer
    // toolbar to explain the command line, and is shown each time it is
    // opened until the user clicks the 'Got it!' button.
    introTextOpening2: 'GCLI is an experiment to create a highly usable command line for web developers.',
    introTextCommands: 'For a list of commands type',
    introTextKeys2: ', or to show/hide command hints press',
    introTextF1Escape: 'F1/Escape',
    introTextGo: 'Got it!',

    // This is a short description of the 'hideIntro' setting.
    hideIntroDesc: 'Show the initial welcome message',

    // This is a description of the 'eagerHelper' setting. It's displayed when
    // the user asks for help on the settings. eagerHelper allows users to
    // select between showing no tooltips, permanent tooltips, and only
    // important tooltips.
    eagerHelperDesc: 'How eager are the tooltips',

    // This is a short description of the 'allowSetDesc' setting.
    allowSetDesc: 'Has the user enabled the \'pref set\' command?'
  }
};

exports.root = i18n.root;
