/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


var gcli = require('gcli/index');

/**
 * 'bugz' command.
 */
var bugzCommandSpec = {
  name: 'bugz',
  returnType: 'html',
  description: 'List the GCLI bugs open in Bugzilla',
  exec: function(args, context) {
    var promise = context.createPromise();

    function onFailure(msg) {
      promise.resolve(msg);
    }

    // A quick hack to help us add up predictions
    var predictions = {
      completed: { best:0, likely:0, worst:0 },
      outstanding: { best:0, likely:0, worst:0 }
    };

    var query = 'status_whiteboard=[GCLI-META]' +
      '&bug_status=UNCONFIRMED' +
      '&bug_status=NEW' +
      '&bug_status=ASSIGNED' +
      '&bug_status=REOPENED';

    queryBugzilla(query, function(json) {
      json.bugs.sort(function(bug1, bug2) {
        return bug1.priority.localeCompare(bug2.priority);
      });

      var doc = context.document;
      var div = doc.createElement('div');

      var p = doc.createElement('p');
      p.appendChild(doc.createTextNode('Open GCLI meta-bugs (i.e. '));
      var a = doc.createElement('a');
      a.setAttribute('target', '_blank');
      a.setAttribute('href', 'https://bugzilla.mozilla.org/buglist.cgi?list_id=459033&status_whiteboard_type=allwordssubstr&query_format=advanced&status_whiteboard=[GCLI-META]&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=ASSIGNED&bug_status=REOPENED');
      a.appendChild(doc.createTextNode('this search'));
      p.appendChild(a);
      p.appendChild(doc.createTextNode('):'));
      div.appendChild(p);

      var ul = doc.createElement('ul');
      json.bugs.forEach(function(bug) {
        var li = liFromBug(doc, bug, predictions);

        // This is the spinner graphic
        var img = doc.createElement('img');
        img.setAttribute('src', 'data:image/gif;base64,R0lGODlhEAAQA' +
            'PMAAP///wAAAAAAAIKCgnJycqioqLy8vM7Ozt7e3pSUlOjo6GhoaAAA' +
            'AAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHd' +
            'pdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAEAAQAAAEKxDISa' +
            'u9OE/Bu//cQBTGgWDhWJ5XSpqoIL6s5a7xjLeyCvOgIEdDLBqPlAgAI' +
            'fkECQoAAAAsAAAAABAAEAAABCsQyEmrvThPwbv/XJEMxIFg4VieV0qa' +
            'qCC+rOWu8Yy3sgrzoCBHQywaj5QIACH5BAkKAAAALAAAAAAQABAAAAQ' +
            'rEMhJq704T8G7/9xhFMlAYOFYnldKmqggvqzlrvGMt7IK86AgR0MsGo' +
            '+UCAAh+QQJCgAAACwAAAAAEAAQAAAEMRDISau9OE/Bu/+cghxGkQyEF' +
            'Y7lmVYraaKqIMpufbc0bLOzFyXGE25AyI5myWw6KREAIfkECQoAAAAs' +
            'AAAAABAAEAAABDYQyEmrvThPwbv/nKQgh1EkA0GFwFie6SqIpImq29z' +
            'WMC6xLlssR3vdZEWhDwBqejTQqHRKiQAAIfkECQoAAAAsAAAAABAAEA' +
            'AABDYQyEmrvThPwbv/HKUgh1EkAyGF01ie6SqIpImqACu5dpzPrRoMp' +
            'wPwhjLa6yYDOYuaqHRKjQAAIfkECQoAAAAsAAAAABAAEAAABDEQyEmr' +
            'vThPwbv/nKUgh1EkAxFWY3mmK9WaqCqIJA3fbP7aOFctNpn9QEiPZsl' +
            'sOikRACH5BAkKAAAALAAAAAAQABAAAAQrEMhJq704T8G7/xymIIexEO' +
            'E1lmdqrSYqiGTsVnA7q7VOszKQ8KYpGo/ICAAh+QQJCgAAACwAAAAAE' +
            'AAQAAAEJhDISau9OE/Bu/+cthBDEmZjeWKpKYikC6svGq9XC+6e5v/A' +
            'ICUCACH5BAkKAAAALAAAAAAQABAAAAQrEMhJq704T8G7/xy2EENSGOE' +
            '1lmdqrSYqiGTsVnA7q7VOszKQ8KYpGo/ICAAh+QQJCgAAACwAAAAAEA' +
            'AQAAAEMRDISau9OE/Bu/+ctRBDUhgHElZjeaYr1ZqoKogkDd9s/to4V' +
            'y02mf1ASI9myWw6KREAIfkECQoAAAAsAAAAABAAEAAABDYQyEmrvThP' +
            'wbv/HLUQQ1IYByKF01ie6SqIpImqACu5dpzPrRoMpwPwhjLa6yYDOYu' +
            'aqHRKjQAAIfkECQoAAAAsAAAAABAAEAAABDYQyEmrvThPwbv/nLQQQ1' +
            'IYB0KFwFie6SqIpImq29zWMC6xLlssR3vdZEWhDwBqejTQqHRKiQAAI' +
            'fkECQoAAAAsAAAAABAAEAAABDEQyEmrvThPwbv/3EIMSWEciBWO5ZlW' +
            'K2miqiDKbn23NGyzsxclxhNuQMiOZslsOikRADsAAAAAAAAAAAA=');
        li.appendChild(img);

        queryBugzilla('blocked=' + bug.id, function(json) {
          var subul = doc.createElement('ul');
          json.bugs.forEach(function(bug) {
            subul.appendChild(liFromBug(doc, bug, predictions));
          });
          li.appendChild(subul);
          li.removeChild(img);
        }, onFailure);

        ul.appendChild(li);
      });

      div.appendChild(ul);

      var table = doc.createElement('table');
      var header = doc.createElement('tr');
      header.innerHTML = '<th>Days</th><th>Best</th><th>Likely</th><th>Worst</th>';
      table.appendChild(header);
      div.appendChild(table);

      var compRow = doc.createElement('tr');
      var completed = doc.createElement('td');
      completed.innerHTML = 'Completed';
      compRow.appendChild(completed);
      predictions.completed.bestTd = doc.createElement('td');
      compRow.appendChild(predictions.completed.bestTd);
      predictions.completed.likelyTd = doc.createElement('td');
      compRow.appendChild(predictions.completed.likelyTd);
      predictions.completed.worstTd = doc.createElement('td');
      compRow.appendChild(predictions.completed.worstTd);
      table.appendChild(compRow);

      var outstRow = doc.createElement('tr');
      var outstanding = doc.createElement('td');
      outstanding.innerHTML = 'Outstanding';
      outstRow.appendChild(outstanding);
      predictions.outstanding.bestTd = doc.createElement('td');
      outstRow.appendChild(predictions.outstanding.bestTd);
      predictions.outstanding.likelyTd = doc.createElement('td');
      outstRow.appendChild(predictions.outstanding.likelyTd);
      predictions.outstanding.worstTd = doc.createElement('td');
      outstRow.appendChild(predictions.outstanding.worstTd);
      table.appendChild(outstRow);

      predictions.summary = doc.createElement('p');
      div.appendChild(predictions.summary);

      promise.resolve(div);
    }, onFailure);

    return promise;
  }
};

/**
 * Simple wrapper for querying bugzilla.
 * @see https://wiki.mozilla.org/Bugzilla:REST_API
 * @see https://wiki.mozilla.org/Bugzilla:REST_API:Search
 * @see http://www.bugzilla.org/docs/developer.html
 * @see https://harthur.wordpress.com/2011/03/31/bz-js/
 * @see https://github.com/harthur/bz.js
 */
function queryBugzilla(query, onSuccess, onFailure) {
  var url = 'https://api-dev.bugzilla.mozilla.org/0.9/bug?' + query;

  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.setRequestHeader('Accept', 'application/json');
  req.setRequestHeader('Content-type', 'application/json');
  req.onreadystatechange = function(event) {
    if (req.readyState == 4) {
      if (req.status >= 300 || req.status < 200) {
        onFailure('Error: ' + JSON.stringify(req));
        return;
      }

      var json;
      try {
        json = JSON.parse(req.responseText);
      }
      catch (ex) {
        onFailure('Invalid response: ' + ex + ': ' + req.responseText);
        return;
      }

      if (json.error) {
        onFailure('Error: ' + json.error.message);
        return;
      }

      onSuccess(json);
    }
  }.bind(this);
  req.send();
}

/**
 * Create an <li> element from the given bug object
 */
function liFromBug(doc, bug, predictions) {
  var done = [ 'RESOLVED', 'VERIFIED', 'CLOSED' ].indexOf(bug.status) !== -1;
  var li = doc.createElement('li');
  if (done) {
    li.style.textDecoration = 'line-through';
    li.style.color = 'grey';
  }
  if (bug.status === 'ASSIGNED') {
    li.style.fontWeight = 'bold';
  }
  var a = doc.createElement('a');
  a.setAttribute('target', '_blank');
  a.setAttribute('href', 'https://bugzilla.mozilla.org/show_bug.cgi?id=' + bug.id);
  a.appendChild(doc.createTextNode(bug.id));
  li.appendChild(a);
  li.appendChild(doc.createTextNode(' ' + bug.summary + ' '));
  if (bug.whiteboard.indexOf('[minotaur]') !== -1) {
    var bestReply = /best:([0-9]*)d/.exec(bug.whiteboard);
    var best = (bestReply == null ? 0 : bestReply[1]);
    var likelyReply = /likely:([0-9]*)d/.exec(bug.whiteboard);
    var likely = (likelyReply == null ? 0 : likelyReply[1]);
    var worstReply = /worst:([0-9]*)d/.exec(bug.whiteboard);
    var worst = (worstReply == null ? 0 : worstReply[1]);
    try {
      best = parseInt(best, 10);
      likely = parseInt(likely, 10);
      worst = parseInt(worst, 10);
    }
    catch (ex) {
      console.error(ex);
      best = 0;
      likely = 0;
      worst = 0;
    }
    if (done) {
      predictions.completed.best += best;
      predictions.completed.likely += likely;
      predictions.completed.worst += worst;
    }
    else {
      predictions.outstanding.best += best;
      predictions.outstanding.likely += likely;
      predictions.outstanding.worst += worst;
    }
    var minsum = doc.createElement('span');
    minsum.setAttribute('style', 'color: #080;');
    minsum.appendChild(doc.createTextNode(' M:' + best + '/' + likely + '/' + worst));
    li.appendChild(minsum);

    predictions.completed.bestTd.innerHTML = '' + predictions.completed.best;
    predictions.completed.likelyTd.innerHTML = '' + predictions.completed.likely;
    predictions.completed.worstTd.innerHTML = '' + predictions.completed.worst;
    predictions.outstanding.bestTd.innerHTML = '' + predictions.outstanding.best;
    predictions.outstanding.likelyTd.innerHTML = '' + predictions.outstanding.likely;
    predictions.outstanding.worstTd.innerHTML = '' + predictions.outstanding.worst;

    var percentComplete = Math.floor((
        (100 * predictions.completed.best / (predictions.completed.best + predictions.outstanding.best)) +
        (100 * predictions.completed.likely / (predictions.completed.likely + predictions.outstanding.likely)) +
        (100 * predictions.completed.worst / (predictions.completed.best + predictions.outstanding.worst))
      ) / 3);
    predictions.summary.innerHTML = 'Complete: ' + percentComplete + '%';
  }
  return li;
}


var gcli = require('gcli/index');

exports.startup = function() {
  gcli.addCommand(bugzCommandSpec);
};

exports.shutdown = function() {
  gcli.removeCommand(bugzCommandSpec);
};


});
