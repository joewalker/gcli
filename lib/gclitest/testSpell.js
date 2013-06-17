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

'use strict';

var assert = require('test/assert');
var spell = require('util/spell');

exports.testSpellerSimple = function(options) {
  var alternatives = Object.keys(options.window);

  assert.is(spell.correct('document', alternatives), 'document');
  assert.is(spell.correct('documen', alternatives), 'document');

  if (options.isJsdom) {
    assert.log('jsdom is weird, skipping some tests');
  }
  else {
    assert.is(spell.correct('ocument', alternatives), 'document');
  }
  assert.is(spell.correct('odcument', alternatives), 'document');

  assert.is(spell.correct('=========', alternatives), undefined);
};

exports.testRank = function(options) {
  var distances = spell.rank('fred', [ 'banana', 'fred', 'ed', 'red' ]);

  assert.is(distances.length, 4, 'rank length');

  assert.is(distances[0].name, 'fred', 'fred name #0');
  assert.is(distances[1].name, 'red', 'red name #1');
  assert.is(distances[2].name, 'ed', 'ed name #2');
  assert.is(distances[3].name, 'banana', 'banana name #3');

  assert.is(distances[0].dist, 0, 'red dist 0');
  assert.is(distances[1].dist, 1, 'red dist 1');
  assert.is(distances[2].dist, 2, 'ed dist 2');
  assert.is(distances[3].dist, 10, 'banana dist 10');
};


});
