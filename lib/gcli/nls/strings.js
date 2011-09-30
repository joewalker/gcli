
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
    fieldSelectionSelect: 'Select a %S ...',

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

    // When the command line is passed a number, however the input string is
    // not a valid number, this error message is displayed.
    typesNumberNan: 'Can\'t convert "%S" to a number.',

    // When the command line is passed a number, but the number is bigger than
    // the largest allowed number, this error message is displayed.
    typesNumberMax: '%1$S is greater that maximum allowed: %2$S.',

    // When the command line is passed a number, but the number is lower than
    // the smallest allowed number, this error message is displayed.
    typesNumberMin: '%1$S is smaller that minimum allowed: %2$S.',

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
    nodeParseNone: 'No matches'
  }
};
exports.root = i18n.root;
});
