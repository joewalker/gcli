
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
    // See helpSearchManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    helpSearchDesc: 'Search string',

    // A fuller description of the 'search' parameter to the 'help' command.
    // Displayed when the user asks for help on what it does.
    helpSearchManual: 'A search string to use in narrowing down the list of commands that are displayed to the user. Any part of the command name can match, regular expressions are not supported.',

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
    prefListDesc: 'Display available settins',

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
    prefSetSettingManual: 'The name of the setting to alter. Must be an exact match.',

    // A short description of the 'value' parameter to the 'pref set' command.
    // See prefSetValueManual for a fuller description of what it does.
    // This string is designed to be shown in a dialog with restricted space,
    // which is why it should be as short as possible.
    prefSetValueDesc: 'New value for setting',

    // A fuller description of the 'value' parameter to the 'pref set' command.
    // Displayed when the user asks for help on what it does.
    prefSetValueManual: 'The new value for the specified setting',

  }
};
exports.root = i18n.root;
});
