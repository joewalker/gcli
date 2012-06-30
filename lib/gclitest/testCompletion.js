/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var test = require('test/assert');
var helpers = require('gclitest/helpers');
var mockCommands = require('gclitest/mockCommands');


exports.setup = function(options) {
  mockCommands.setup();
  helpers.setup(options);
};

exports.shutdown = function(options) {
  mockCommands.shutdown();
  helpers.shutdown(options);
};

exports.testActivate = function(options) {
  if (!options.display) {
    test.log('No display. Skipping activate tests');
    return;
  }

  helpers.setInput('');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput(' ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsr');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <text>' ]
  });

  helpers.setInput('tsr ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ '<text>' ]
  });

  helpers.setInput('tsr b');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsb');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' [toggle]' ]
  });

  helpers.setInput('tsm');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <abc>', ' <txt>', ' <num>' ]
  });

  helpers.setInput('tsm ');
  helpers.check({
    emptyParameters: [ ' <txt>', ' <num>' ],
    arrowTabText: '',
    directTabText: 'a'
  });

  helpers.setInput('tsm a');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <txt>', ' <num>' ]
  });

  helpers.setInput('tsm a ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ '<txt>', ' <num>' ]
  });

  helpers.setInput('tsm a  ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ '<txt>', ' <num>' ]
  });

  helpers.setInput('tsm a  d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <num>' ]
  });

  helpers.setInput('tsm a "d d"');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <num>' ]
  });

  helpers.setInput('tsm a "d ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <num>' ]
  });

  helpers.setInput('tsm a "d d" ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ '<num>' ]
  });

  helpers.setInput('tsm a "d d ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <num>' ]
  });

  helpers.setInput('tsm d r');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <num>' ]
  });

  helpers.setInput('tsm a d ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ '<num>' ]
  });

  helpers.setInput('tsm a d 4');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: [ ' <solo>' ]
  });

  helpers.setInput('tsg ');
  helpers.check({
    emptyParameters: [],
    arrowTabText: '',
    directTabText: 'aaa'
  });

  helpers.setInput('tsg a');
  helpers.check({
    emptyParameters: [],
    arrowTabText: '',
    directTabText: 'aa'
  });

  helpers.setInput('tsg b');
  helpers.check({
    emptyParameters: [],
    arrowTabText: '',
    directTabText: 'bb'
  });

  helpers.setInput('tsg d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aa');
  helpers.check({
    emptyParameters: [],
    arrowTabText: '',
    directTabText: 'a'
  });

  helpers.setInput('tsg aaa');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aaa ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aaa d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aaa dddddd');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aaa dddddd ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aaa "d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aaa "d d');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsg aaa "d d"');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tsn ex ');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('selarr');
  helpers.check({
    directTabText: '',
    emptyParameters: [],
    arrowTabText: 'tselarr'
  });

  helpers.setInput('tselar 1');
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tselar 1', 7);
  helpers.check({
    directTabText: '',
    arrowTabText: '',
    emptyParameters: []
  });

  helpers.setInput('tselar 1', 6);
  helpers.check({
    directTabText: '',
    emptyParameters: [],
    arrowTabText: 'tselarr'
  });

  helpers.setInput('tselar 1', 5);
  helpers.check({
    directTabText: '',
    emptyParameters: [],
    arrowTabText: 'tselarr'
  });
};


});
