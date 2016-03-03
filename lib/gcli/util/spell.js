/*
 * Copyright 2012, Mozilla Foundation and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/*
 * A spell-checker based on Damerau-Levenshtein distance.
 */

const CASE_CHANGE_COST = 1;
const INSERTION_COST = 10;
const DELETION_COST = 10;
const SWAP_COST = 10;
const SUBSTITUTION_COST = 20;
const MAX_EDIT_DISTANCE = 40;

/**
 * Compute Damerau-Levenshtein Distance, with a modification to allow a low
 * case-change cost (1/10th of a swap-cost)
 * @see http://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
 */
const distance = exports.distance = function(wordi, wordj) {
  const wordiLen = wordi.length;
  const wordjLen = wordj.length;

  // We only need to store three rows of our dynamic programming matrix.
  // (Without swap, it would have been two.)
  let row0 = new Array(wordiLen + 1);
  let row1 = new Array(wordiLen + 1);
  let row2 = new Array(wordiLen + 1);

  let i, j;

  // The distance between the empty string and a string of size i is the cost
  // of i insertions.
  for (i = 0; i <= wordiLen; i++) {
    row1[i] = i * INSERTION_COST;
  }

  // Row-by-row, we're computing the edit distance between substrings wordi[0..i]
  // and wordj[0..j].
  for (j = 1; j <= wordjLen; j++) {
    // Edit distance between wordi[0..0] and wordj[0..j] is the cost of j
    // insertions.
    row0[0] = j * INSERTION_COST;

    for (i = 1; i <= wordiLen; i++) {
      // Handle deletion, insertion and substitution: we can reach each cell
      // from three other cells corresponding to those three operations. We
      // want the minimum cost.
      const dc = row0[i - 1] + DELETION_COST;
      const ic = row1[i] + INSERTION_COST;
      let sc0;
      if (wordi[i - 1] === wordj[j - 1]) {
        sc0 = 0;
      }
      else {
        if (wordi[i - 1].toLowerCase() === wordj[j - 1].toLowerCase()) {
          sc0 = CASE_CHANGE_COST;
        }
        else {
          sc0 = SUBSTITUTION_COST;
        }
      }
      const sc = row1[i - 1] + sc0;

      row0[i] = Math.min(dc, ic, sc);

      // We handle swap too, eg. distance between help and hlep should be 1. If
      // we find such a swap, there's a chance to update row0[1] to be lower.
      if (i > 1 &&
          j > 1 &&
          wordi[i - 1] === wordj[j - 2] &&
          wordj[j - 1] === wordi[i - 2]) {
        row0[i] = Math.min(row0[i], row2[i - 2] + SWAP_COST);
      }
    }

    const tmp = row2;
    row2 = row1;
    row1 = row0;
    row0 = tmp;
  }

  return row1[wordiLen];
};

/**
 * As distance() except that we say that if word is a prefix of name then we
 * only count the case changes. This allows us to use words that can be
 * completed by typing as more likely than short words
 */
const distancePrefix = exports.distancePrefix = function(word, name) {
  let dist = 0;

  for (let i = 0; i < word.length; i++) {
    if (name[i] !== word[i]) {
      if (name[i].toLowerCase() === word[i].toLowerCase()) {
        dist++;
      }
      else {
        // name does not start with word, even ignoring case, use
        // Damerau-Levenshtein
        return exports.distance(word, name);
      }
    }
  }

  return dist;
};

/**
 * A function that returns the correction for the specified word.
 */
exports.correct = function(word, names) {
  if (names.length === 0) {
    return undefined;
  }

  const distances = {};

  names.forEach(candidate => {
    distances[candidate] = exports.distance(word, candidate);
  });

  const sortedCandidates = names.sort((worda, wordb) => {
    if (distances[worda] !== distances[wordb]) {
      return distances[worda] - distances[wordb];
    }
    else {
      // if the score is the same, always return the first string
      // in the lexicographical order
      return worda < wordb;
    }
  });

  if (distances[sortedCandidates[0]] <= MAX_EDIT_DISTANCE) {
    return sortedCandidates[0];
  }
  else {
    return undefined;
  }
};

/**
 * Return a ranked list of matches:
 *
 *   spell.rank('fred', [ 'banana', 'fred', 'ed', 'red' ]);
 *     ↓
 *   [
 *      { name: 'fred', dist: 0 },
 *      { name: 'red', dist: 1 },
 *      { name: 'ed', dist: 2 },
 *      { name: 'banana', dist: 10 },
 *   ]
 *
 * @param word The string that we're comparing names against
 * @param names An array of strings to compare word against
 * @param options Comparison options:
 * - noSort: Do not sort the output by distance
 * - prefixZero: Count prefix matches as edit distance 0 (i.e. word='bana' and
 *   names=['banana'], would return { name:'banana': dist: 0 }) This is useful
 *   if someone is typing the matches and may not have finished yet
 */
exports.rank = function(word, names, options) {
  options = options || {};

  let reply = names.map(name => {
    // If any name starts with the word then the distance is based on the
    // number of case changes rather than Damerau-Levenshtein
    const algo = options.prefixZero ? distancePrefix : distance;
    return {
      name: name,
      dist: algo(word, name)
    };
  });

  if (!options.noSort) {
    reply = reply.sort((d1, d2) => d1.dist - d2.dist);
  }

  return reply;
};
