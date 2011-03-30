/* ***** BEGIN LICENSE BLOCK *****
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
var useragent = exports;


var os = (navigator.platform.match(/mac|win|linux/i) || ["other"])[0].toLowerCase();
var ua = navigator.userAgent;
var av = navigator.appVersion;

/** Is the user using a browser that identifies itself as Windows */
useragent.isWin = (os == "win");

/** Is the user using a browser that identifies itself as Mac OS */
useragent.isMac = (os == "mac");

/** Is the user using a browser that identifies itself as Linux */
useragent.isLinux = (os == "linux");

useragent.isIE = ! + "\v1";

/** Is this Firefox or related? */
useragent.isGecko = useragent.isMozilla = window.controllers && window.navigator.product === "Gecko";

/** oldGecko == rev < 2.0 **/
useragent.isOldGecko = useragent.isGecko && /rv\:1/.test(navigator.userAgent);

/** Is this Opera */
useragent.isOpera = window.opera && Object.prototype.toString.call(window.opera) == "[object Opera]";

/** Is the user using a browser that identifies itself as WebKit */
useragent.isWebKit = parseFloat(ua.split("WebKit/")[1]) || undefined;

useragent.isAIR = ua.indexOf("AdobeAIR") >= 0;

useragent.isIPad = ua.indexOf("iPad") >= 0;

/**
 * I hate doing this, but we need some way to determine if the user is on a Mac
 * The reason is that users have different expectations of their key combinations.
 *
 * Take copy as an example, Mac people expect to use CMD or APPLE + C
 * Windows folks expect to use CTRL + C
 */
useragent.OS = {
    LINUX: 'LINUX',
    MAC: 'MAC',
    WINDOWS: 'WINDOWS'
};

/**
 * Return an exports.OS constant
 */
useragent.getOS = function() {
    if (useragent.isMac) {
        return useragent.OS['MAC'];
    } else if (useragent.isLinux) {
        return useragent.OS['LINUX'];
    } else {
        return useragent.OS['WINDOWS'];
    }
};


});
