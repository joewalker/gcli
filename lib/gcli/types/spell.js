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

define(function(require, exports, module) {

'use strict';

/*
 * A spell-checker based on Damerau-Levenshtein distance.
 */

var INSERTION_COST = 1;
var DELETION_COST = 1;
var SWAP_COST = 1;
var SUBSTITUTION_COST = 2;
var MAX_EDIT_DISTANCE = 4;

/**
 * Compute Damerau-Levenshtein Distance
 * @see http://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
 */
function damerauLevenshteinDistance(wordi, wordj) {
  var wordiLen = wordi.length;
  var wordjLen = wordj.length;

  // We only need to store three rows of our dynamic programming matrix.
  // (Without swap, it would have been two.)
  var row0 = new Array(wordiLen+1);
  var row1 = new Array(wordiLen+1);
  var row2 = new Array(wordiLen+1);
  var tmp;

  var i, j;

  // The distance between the empty string and a string of size i is the cost
  // of i insertions.
  for (i = 0; i <= wordiLen; i++) {
    row1[i] = i * INSERTION_COST;
  }

  // Row-by-row, we're computing the edit distance between substrings wordi[0..i]
  // and wordj[0..j].
  for (j = 1; j <= wordjLen; j++)
  {
    // Edit distance between wordi[0..0] and wordj[0..j] is the cost of j
    // insertions.
    row0[0] = j * INSERTION_COST;

    for (i = 1; i <= wordiLen; i++) {
      // Handle deletion, insertion and substitution: we can reach each cell
      // from three other cells corresponding to those three operations. We
      // want the minimum cost.
      row0[i] = Math.min(
          row0[i-1] + DELETION_COST,
          row1[i] + INSERTION_COST,
          row1[i-1] + (wordi[i-1] === wordj[j-1] ? 0 : SUBSTITUTION_COST));
      // We handle swap too, eg. distance between help and hlep should be 1. If
      // we find such a swap, there's a chance to update row0[1] to be lower.
      if (i > 1 && j > 1 && wordi[i-1] === wordj[j-2] && wordj[j-1] === wordi[i-2]) {
        row0[i] = Math.min(row0[i], row2[i-2] + SWAP_COST);
      }
    }

    tmp = row2;
    row2 = row1;
    row1 = row0;
    row0 = tmp;
  }

  return row1[wordiLen];
}

/**
 * A function that returns the correction for the specified word.
 */
exports.correct = function(word, names) {
  if (names.length === 0) {
    return undefined;
  }

  var distance = {};
  var sortedCandidates;

  names.forEach(function(candidate) {
    distance[candidate] = damerauLevenshteinDistance(word, candidate);
  });

  sortedCandidates = names.sort(function(worda, wordb) {
    if (distance[worda] !== distance[wordb]) {
      return distance[worda] - distance[wordb];
    }
    else {
      // if the score is the same, always return the first string
      // in the lexicographical order
      return worda < wordb;
    }
  });

  if (distance[sortedCandidates[0]] <= MAX_EDIT_DISTANCE) {
    return sortedCandidates[0];
  }
  else {
    return undefined;
  }
};


});
