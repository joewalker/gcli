/* ***** BEGIN LICENSE BLOCK *****
 *
 * TODO
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {

/**
 * A History object remembers commands that have been entered in the past and
 * provides an API for accessing them again.
 *
 * TODO: Search through history (like C-r in bash)?
 */
function History(options) {
    this._options = options;

    // This is the actual buffer where previous commands are kept.
    //
    // `this._buffer[0]` should always be equal the empty string. This is so
    // that when you try to go in to the "future", you will just get an empty
    // command.
    this._buffer = [""];

    // This is an index in to the history buffer which points to where we
    // currently are in the history.
    this._current = 0;
}

/**
 * Record and save a new command in the history.
 */
History.prototype.add = function(command) {
    this._buffer.splice(1, 0, command);
    this._current = 0;
};

/**
 * Get the next (newer) command from history.
 */
History.prototype.forward = function() {
    if (this._current > 0 ) {
        this._current--;
    }
    return this._buffer[this._current];
};

/**
 * Get the previous (older) item from history.
 */
History.prototype.backward = function() {
    if (this._current < this._buffer.length - 1) {
        this._current++;
    }
    return this._buffer[this._current];
};

exports.History = History;

});