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

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  /**
   * Fake a console for IE9
   */
  if (window.console == null) {
    window.console = {};
  }
  'debug,log,warn,error,trace,group,groupEnd'.split(',').forEach(function(f) {
    if (!window.console[f]) {
      window.console[f] = function() {};
    }
  });

  /**
   * Fake Element.classList for IE9
   * Based on https://gist.github.com/1381839 by Devon Govett
   */
  if (!('classList' in document.documentElement) && Object.defineProperty &&
          typeof HTMLElement !== 'undefined') {
    Object.defineProperty(HTMLElement.prototype, 'classList', {
      get: function() {
        var self = this;
        function update(fn) {
          return function(value) {
            var classes = self.className.split(/\s+/);
            var index = classes.indexOf(value);
            fn(classes, index, value);
            self.className = classes.join(' ');
          };
        }

        var ret = {
          add: update(function(classes, index, value) {
            ~index || classes.push(value);
          }),
          remove: update(function(classes, index) {
            ~index && classes.splice(index, 1);
          }),
          toggle: update(function(classes, index, value) {
            ~index ? classes.splice(index, 1) : classes.push(value);
          }),
          contains: function(value) {
            return !!~self.className.split(/\s+/).indexOf(value);
          },
          item: function(i) {
            return self.className.split(/\s+/)[i] || null;
          }
        };

        Object.defineProperty(ret, 'length', {
          get: function() {
            return self.className.split(/\s+/).length;
          }
        });

        return ret;
      }
    });
  }

  /**
   * Fake Range.createContextualFragment for IE9
   */
  if (typeof Range.prototype.createContextualFragment === 'undefined') {
    Range.prototype.createContextualFragment = function(html) {
      var container = this.startContainer;
      var doc = container.nodeType == 9 /* i.e. Node.DOCUMENT_NODE */ ?
              container :
              container.ownerDocument;
      var div = doc.createElement('div');
      div.innerHTML = html;
      var frag = doc.createDocumentFragment();
      var n;
      while (n = div.firstChild) {
        frag.appendChild(n);
      }
      return frag;
    };
  }

  /**
   * String.prototype.trimLeft is non-standard, but it works in Firefox,
   * Chrome and Opera. It's easiest to create a shim here.
   */
  if (!String.prototype.trimLeft) {
    String.prototype.trimLeft = function() {
      return String(this).replace(/\s*$/, '');
    };
  }

});
