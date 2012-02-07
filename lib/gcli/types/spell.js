/*
 * Copyright (c) 2009 Panagiotis Astithas
 * Permission to use, copy, modify, and distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

define(function(require, exports, module) {


/**
 * A spell-checker based on the statistical algorithm described by Peter Norvig
 * in http://norvig.com/spell-correct.html, and converted to JavaScript by Past
 * http://past.github.com/speller/
 *
 * Usage requires a two-step process:
 * 1) call speller.train() one or more times with a large text to train the
 *    language model
 * 2) call speller.correct(word) to retrieve the correction for the specified
 *    word
 */
function Speller() {
  // A map of words to the count of times they were encountered during training.
  this._nWords = {};
}

Speller.letters = "abcdefghijklmnopqrstuvwxyz".split("");

/**
 * A function that trains the language model with the words in the supplied
 * text. Multiple invocation of this function can extend the training of the
 * model.
 */
Speller.prototype.train = function(words) {
  words.forEach(function(word) {
    word = word.toLowerCase();
    this._nWords[word] = this._nWords.hasOwnProperty(word) ?
            this._nWords[word] + 1 :
            1;
  }, this);
};

/**
 * A function that returns the correction for the specified word.
 */
Speller.prototype.correct = function(word) {
  if (this._nWords.hasOwnProperty(word)) {
    return word;
  }

  var candidates = {};
  var list = this._edits(word);
  list.forEach(function(edit) {
    if (this._nWords.hasOwnProperty(edit)) {
      candidates[this._nWords[edit]] = edit;
    }
  }, this);

  if (this._countKeys(candidates) > 0) {
    return candidates[this._max(candidates)];
  }

  list.forEach(function(edit) {
    this._edits(edit).forEach(function(w) {
      if (this._nWords.hasOwnProperty(w)) {
        candidates[this._nWords[w]] = w;
      }
    }, this);
  }, this);

  return this._countKeys(candidates) > 0 ?
      candidates[this._max(candidates)] :
      null;
};

/**
 * A helper function that counts the keys in the supplied object.
 */
Speller.prototype._countKeys = function(object) {
  // return Object.keys(object).length; ?
  var count = 0;
  for (var attr in object) {
    if (object.hasOwnProperty(attr)) {
      count++;
    }
  }
  return count;
};

/**
 * A helper function that returns the word with the most occurrences in the
 * language model, among the supplied candidates.
 * @param candidates
 */
Speller.prototype._max = function(candidates) {
  var arr = [];
  for (var candidate in candidates) {
    if (candidates.hasOwnProperty(candidate)) {
      arr.push(candidate);
    }
  }
  return Math.max.apply(null, arr);
};

/**
 * A function that returns the set of possible corrections of the specified
 * word. The edits can be deletions, insertions, alterations or transpositions.
 */
Speller.prototype._edits = function(word) {
  var results = [];

  // Deletion
  for (var i = 0; i < word.length; i++) {
    results.push(word.slice(0, i) + word.slice(i + 1));
  }

  // Transposition
  for (i = 0; i < word.length - 1; i++) {
    results.push(word.slice(0, i) + word.slice(i + 1, i + 2)
            + word.slice(i, i + 1) + word.slice(i + 2));
  }

  // Alteration
  for (i = 0; i < word.length; i++) {
    Speller.letters.forEach(function(l) {
      results.push(word.slice(0, i) + l + word.slice(i + 1));
    }, this);
  }

  // Insertion
  for (i = 0; i <= word.length; i++) {
    Speller.letters.forEach(function(l) {
      results.push(word.slice(0, i) + l + word.slice(i));
    }, this);
  }

  return results;
};

exports.Speller = Speller;


});
