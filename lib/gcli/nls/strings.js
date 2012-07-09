
define(function(require, exports, module) {
/**
 * This file has detailed comments as to the usage of these strings so when
 * translators work on these strings separately from the code, (but with the
 * comments) they have something to work on.
 * Each string should be commented using single-line comments.
 */
var i18n = {
  root: {
    // Short string used to describe any command or command parameter when
    // no description has been provided.
    canonDescNone: '(No description)',

    // The special '{' command allows entry of JavaScript like traditional
    // developer tool command lines. This describes the '{' command.
    cliEvalJavascript: 'Enter JavaScript directly',

    // When the command line has more arguments than the current command can
    // understand this is the error message shown to the user.
    cliUnusedArg: 'Too many arguments',

    // The title of the dialog which displays the options that are available
    // to the current command.
    cliOptions: 'Available Options',

    // When a command has a parameter that has a number of pre-defined options
    // the user interface presents these in a drop-down menu, where the first
    // 'option' is an indicator that a selection should be made. This string
    // describes that first option.
    fieldSelectionSelect: 'Select a %S…',

    // When a command has a parameter that can be repeated a number of times
    // (e.g. like the 'cat a.txt b.txt' command) the user interface presents
    // buttons to add and remove arguments. This string is used to add
    // arguments.
    fieldArrayAdd: 'Add',

    // When a command has a parameter that can be repeated a number of times
    // (e.g. like the 'cat a.txt b.txt' command) the user interface presents
    // buttons to add and remove arguments. This string is used to remove
    // arguments.
    fieldArrayDel: 'Delete',

    // When the menu has displayed all the matches that it should (i.e. about
    // 10 items) then we display this to alert the user that more matches are
    // available.
    fieldMenuMore: 'More matches, keep typing',

    // The command line provides completion for JavaScript commands, however
    // there are times when the scope of what we're completing against can't
    // be used. This error message is displayed when this happens.
    jstypeParseScope: 'Scope lost',

    // When the command line is doing JavaScript completion, sometimes the
    // property to be completed does not exist. This error message is displayed
    // when this happens.
    jstypeParseMissing: 'Can\'t find property \'%S\'',

    // When the command line is doing JavaScript completion using invalid
    // JavaScript, this error message is displayed.
    jstypeBeginSyntax: 'Syntax error',

    // When the command line is doing JavaScript completion using a string
    // that is not properly terminated, this error message is displayed.
    jstypeBeginUnterm: 'Unterminated string literal',

    // If the system for providing JavaScript completions encounters and error
    // it displays this.
    jstypeParseError: 'Error',

    // When the command line is passed a number, however the input string is
    // not a valid number, this error message is displayed.
    typesNumberNan: 'Can\'t convert "%S" to a number.',

    // When the command line is passed a number, but the number is bigger than
    // the largest allowed number, this error message is displayed.
    typesNumberMax: '%1$S is greater than maximum allowed: %2$S.',

    // When the command line is passed a number, but the number is lower than
    // the smallest allowed number, this error message is displayed.
    typesNumberMin: '%1$S is smaller than minimum allowed: %2$S.',

    // When the command line is passed an option with a limited number of
    // correct values, but the passed value is not one of them, this error
    // message is displayed.
    typesSelectionNomatch: 'Can\'t use \'%S\'.',

    // When the command line is expecting a CSS query string, however the
    // passed string is not valid, this error message is displayed.
    nodeParseSyntax: 'Syntax error in CSS query',

    // When the command line is expecting a CSS string that matches a single
    // node, but more than one node matches, this error message is displayed.
    nodeParseMultiple: 'Too many matches (%S)',

    // When the command line is expecting a CSS string that matches a single
    // node, but no nodes match, this error message is displayed.
    nodeParseNone: 'No matches',

    // A very short description of the 'help' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See helpManual for a fuller description of what it does.
    helpDesc: 'Get help on the available commands',

    // A fuller description of the 'help' command.
    // Displayed when the user asks for help on what it does.
    helpManual: 'Provide help either on a specific command (if a search string is provided and an exact match is found) or on the available commands (if a search string is not provided, or if no exact match is found).',

    // A very short description of the 'search' parameter to the 'help' command.
    // See helpSearchManual2 for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    helpSearchDesc: 'Search string',

    // A fuller description of the 'search' parameter to the 'help' command.
    // Displayed when the user asks for help on what it does. Inline HTML
    // (e.g. <strong>) can be used to emphasize the core concept.
    helpSearchManual2: '<strong>search string</strong> to use in narrowing down the displayed commands. Regular expressions not supported.',

    // A heading shown at the top of a help page for a command in the console
    // It labels a summary of the parameters to the command
    helpManSynopsis: 'Synopsis',

    // A heading shown in a help page for a command in the console.
    // This heading precedes the top level description.
    helpManDescription: 'Description',

    // A heading shown above the parameters in a help page for a command in the
    // console.
    helpManParameters: 'Parameters',

    // Some text shown under the parameters heading in a help page for a
    // command which has no parameters.
    helpManNone: 'None',

    // The heading shown in response to the 'help' command when used without a
    // filter, just above the list of known commands.
    helpListAll: 'Available Commands:',

    // The heading shown in response to the 'help <search>' command (i.e. with
    // a search string), just above the list of matching commands.
    helpListPrefix: 'Commands starting with \'%1$S\':',

    // The heading shown in response to the 'help <search>' command (i.e. with
    // a search string), when there are no matching commands.
    helpListNone: 'No commands starting with \'%1$S\'',

    // When the 'help x' command wants to show the manual for the 'x' command
    // it needs to be able to describe the parameters as either required or
    // optional. See also 'helpManOptional'.
    helpManRequired: 'required',

    // See description of 'helpManRequired'
    helpManOptional: 'optional',

    // Text shown as part of the output of the 'help' command when the command
    // in question has sub-commands, before a list of the matching sub-commands
    subCommands: 'Sub-Commands',

    // Text shown as part of the output of the 'help' command when the command
    // in question should have sub-commands but in fact has none
    subCommandsNone: 'None',

    // A very short description of the 'pref' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefManual for a fuller description of what it does.
    prefDesc: 'Commands to control settings',

    // A fuller description of the 'pref' command.
    // Displayed when the user asks for help on what it does.
    prefManual: 'Commands to display and alter preferences both for GCLI and the surrounding environment',

    // A very short description of the 'pref list' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefListManual for a fuller description of what it does.
    prefListDesc: 'Display available settings',

    // A fuller description of the 'pref list' command.
    // Displayed when the user asks for help on what it does.
    prefListManual: 'Display a list of preferences, optionally filtered when using the \'search\' parameter',

    // A short description of the 'search' parameter to the 'pref list' command.
    // See prefListSearchManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefListSearchDesc: 'Filter the list of settings displayed',

    // A fuller description of the 'search' parameter to the 'pref list' command.
    // Displayed when the user asks for help on what it does.
    prefListSearchManual: 'Search for the given string in the list of available preferences',

    // A very short description of the 'pref show' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefShowManual for a fuller description of what it does.
    prefShowDesc: 'Display setting value',

    // A fuller description of the 'pref show' command.
    // Displayed when the user asks for help on what it does.
    prefShowManual: 'Display the value of a given preference',

    // A short description of the 'setting' parameter to the 'pref show' command.
    // See prefShowSettingManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefShowSettingDesc: 'Setting to display',

    // A fuller description of the 'setting' parameter to the 'pref show' command.
    // Displayed when the user asks for help on what it does.
    prefShowSettingManual: 'The name of the setting to display',

    // A very short description of the 'pref set' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefSetManual for a fuller description of what it does.
    prefSetDesc: 'Alter a setting',

    // A fuller description of the 'pref set' command.
    // Displayed when the user asks for help on what it does.
    prefSetManual: 'Alter preferences defined by the environment',

    // A short description of the 'setting' parameter to the 'pref set' command.
    // See prefSetSettingManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefSetSettingDesc: 'Setting to alter',

    // A fuller description of the 'setting' parameter to the 'pref set' command.
    // Displayed when the user asks for help on what it does.
    prefSetSettingManual: 'The name of the setting to alter.',

    // A short description of the 'value' parameter to the 'pref set' command.
    // See prefSetValueManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefSetValueDesc: 'New value for setting',

    // A fuller description of the 'value' parameter to the 'pref set' command.
    // Displayed when the user asks for help on what it does.
    prefSetValueManual: 'The new value for the specified setting',

    // Title displayed to the user the first time they try to alter a setting
    // This is displayed directly above prefSetCheckBody and prefSetCheckGo.
    prefSetCheckHeading: 'This might void your warranty!',

    // The main text of the warning displayed to the user the first time they
    // try to alter a setting. See also prefSetCheckHeading and prefSetCheckGo.
    prefSetCheckBody: 'Changing these advanced settings can be harmful to the stability, security, and performance of this application. You should only continue if you are sure of what you are doing.',

    // The text to enable preference editing. Displayed in a button directly
    // under prefSetCheckHeading and prefSetCheckBody
    prefSetCheckGo: 'I\'ll be careful, I promise!',

    // A very short description of the 'pref reset' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See prefResetManual for a fuller description of what it does.
    prefResetDesc: 'Reset a setting',

    // A fuller description of the 'pref reset' command.
    // Displayed when the user asks for help on what it does.
    prefResetManual: 'Reset the value of a setting to the system defaults',

    // A short description of the 'setting' parameter to the 'pref reset' command.
    // See prefResetSettingManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefResetSettingDesc: 'Setting to reset',

    // A fuller description of the 'setting' parameter to the 'pref reset' command.
    // Displayed when the user asks for help on what it does.
    prefResetSettingManual: 'The name of the setting to reset to the system default value',

    // Displayed in the output from the 'pref list' command as a label to an
    // input element that allows the user to filter the results
    prefOutputFilter: 'Filter',

    // Displayed in the output from the 'pref list' command as a heading to
    // a table. The column contains the names of the available preferences
    prefOutputName: 'Name',

    // Displayed in the output from the 'pref list' command as a heading to
    // a table. The column contains the values of the available preferences
    prefOutputValue: 'Value',

    // A very short description of the 'intro' command.
    // This string is designed to be shown in a menu alongside the command name,
    // which is why it should be as short as possible.
    // See introManual for a fuller description of what it does.
    introDesc: 'Show the opening message',

    // A fuller description of the 'intro' command.
    // Displayed when the user asks for help on what it does.
    introManual: 'Redisplay the message that is shown to new users until they click the \'Got it!\' button',

    // The 'intro text' opens when the user first opens the developer toolbar
    // to explain the command line, and is shown each time it is opened until
    // the user clicks the 'Got it!' button.
    // This string is the opening paragraph of the intro text.
    introTextOpening: 'The Firefox command line is designed for developers. It focuses on speed of input over JavaScript syntax and a rich display over monospace output.',

    // For information about the 'intro text' see introTextOpening.
    // The second paragraph is in 2 sections, the first section points the user
    // to the 'help' command.
    introTextCommands: 'For a list of commands type',

    // For information about the 'intro text' see introTextOpening.
    // The second section in the second paragraph points the user to the
    // F1/Escape keys which show and hide hints.
    introTextKeys: 'or to show/hide command hints press',

    // For information about the 'intro text' see introTextOpening.
    // This string is used with introTextKeys, and contains the keys that are
    // pressed to open and close hints.
    introTextF1Escape: 'F1/Escape',

    // For information about the 'intro text' see introTextOpening.
    // The text on the button that dismisses the intro text.
    introTextGo: 'Got it!',

    // Short description of the 'hideIntro' setting. Displayed when the user
    // asks for help on the settings.
    hideIntroDesc: 'Show the initial welcome message',

    // Short description of the 'eagerHelper' setting. Displayed when the user
    // asks for help on the settings.
    eagerHelperDesc: 'How eager are the tooltips',

    // Short description of the 'allowSetDesc' setting. Displayed when the user
    // asks for help on the settings.
    allowSetDesc: 'Has the user enabled the \'pref set\' command?'
  }
};
exports.root = i18n.root;
});
