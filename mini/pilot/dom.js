/* vim:ts=4:sts=4:sw=4:
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Ajax.org Code Editor (ACE).
 *
 * The Initial Developer of the Original Code is
 * Ajax.org B.V.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Fabian Jakobs <fabian AT ajax DOT org>
 *      Mihai Sucan <mihai AT sucan AT gmail ODT com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
var dom = exports;


dom.createElement = function(tag, ns, doc) {
    if (!doc) {
        doc = document;
    }
    ns = ns || 'http://www.w3.org/1999/xhtml';
    return doc.createElementNS ?
           doc.createElementNS(ns, tag) :
           doc.createElement(tag);
};

dom.setText = function(elem, text) {
    if (elem.innerText !== undefined) {
        elem.innerText = text;
    }
    if (elem.textContent !== undefined) {
        elem.textContent = text;
    }
};

dom.hasCssClass = function(el, name) {
    return el.classList.contains(name);
};

dom.addCssClass = function(el, name) {
    el.classList.add(name);
};

dom.removeCssClass = function(el, name) {
    el.classList.remove(name);
};

dom.toggleCssClass = function(el, name) {
    return el.classList.toggle(name);
};

/**
 * Add or remove a CSS class from the list of classes on the given node
 * depending on the value of <tt>include</tt>
 */
dom.setCssClass = function(node, className, include) {
    if (include) {
        dom.addCssClass(node, className);
    } else {
        dom.removeCssClass(node, className);
    }
};

dom.importCssString = function(cssText, doc) {
    if (!doc) {
        doc = document;
    }

    if (doc.createStyleSheet) {
        var sheet = doc.createStyleSheet();
        sheet.cssText = cssText;
    }
    else {
        var style = dom.createElement("style", null, doc);

        style.appendChild(doc.createTextNode(cssText));

        var head = doc.getElementsByTagName("head")[0] || doc.documentElement;
        head.appendChild(style);
    }
};

dom.setInnerHtml = function(el, html) {
  // el.innerHTML = html;
  dom.clearElement(el);

  var range = el.ownerDocument.createRange();

  html = '<div xmlns="http://www.w3.org/1999/xhtml"' +
      ' xmlns:xul="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul">' +
      html + '</div>';
  el.appendChild(range.createContextualFragment(html));

  /*
  var doc;
  if (DOMParser) {
    doc = new DOMParser().parseFromString(html, 'application/xhtml+xml');
  }
  else {
    doc = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                    .createInstance(Components.interfaces.nsIDOMParser)
                    .parseFromString(aStr, "text/xml");
  }

  for (var i=0; i < doc.childNodes.length; ++i) {
    el.appendChild(el.ownerDocument.importNode(doc.childNodes[i], true));
  }
  */
};

dom.clearElement = function(el) {
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild);
  }
};

dom.getInnerWidth = function(element) {
    return (parseInt(dom.computedStyle(element, "paddingLeft"))
            + parseInt(dom.computedStyle(element, "paddingRight")) + element.clientWidth);
};

dom.getInnerHeight = function(element) {
    return (parseInt(dom.computedStyle(element, "paddingTop"))
            + parseInt(dom.computedStyle(element, "paddingBottom")) + element.clientHeight);
};

dom.computedStyle = function(element, styleName) {
    var win = element.ownerDocument.defaultView;
    var styles = win.getComputedStyle(element, "") || {};
    return styles[styleName] || "";
};

dom.getParentWindow = function(document) {
    return document.defaultView || document.parentWindow;
};

dom.getSelectionStart = function(textarea) {
    // TODO IE
    var start;
    try {
        start = textarea.selectionStart || 0;
    } catch (e) {
        start = 0;
    }
    return start;
};

dom.setSelectionStart = function(textarea, start) {
    // TODO IE
    return textarea.selectionStart = start;
};

dom.getSelectionEnd = function(textarea) {
    // TODO IE
    var end;
    try {
        end = textarea.selectionEnd || 0;
    } catch (e) {
        end = 0;
    }
    return end;
};

dom.setSelectionEnd = function(textarea, end) {
    // TODO IE
    return textarea.selectionEnd = end;
};

});
