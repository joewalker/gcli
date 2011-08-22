/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {


/**
 * Finds the locale of the user as an RFC 4646 string (e.g. 'en', 'en-US',
 * 'fr', 'es-ES'). There is considerable confusion as to the correct value
 * since there are a number of places the information can be stored:
 * - In the OS (IE:navigator.userLanguage, IE:navigator.systemLanguage)
 * - In the browser (navigator.language, IE:navigator.browserLanguage)
 * - By GEO-IP
 * - By website specific settings
 * This implementation uses navigator.language || navigator.userLanguage as
 * this is compatible with requirejs.
 * See http://tools.ietf.org/html/rfc4646
 * See http://stackoverflow.com/questions/1043339/javascript-for-detecting-browser-language-preference
 * See http://msdn.microsoft.com/en-us/library/ms534713.aspx
 * @return The current locale as an RFC 4646 string
 */
exports.getDefaultLocale = function() {
  return navigator.language || navigator.userLanguage;
};

/**
 *
 */
exports.lookup = function(key, locale) {
  if (locale == null) {
    locale = exports.getDefaultLocale;
  }
};

/**
 *
 */
exports.getPluralOf = function(word, ordinal, locale) {
  if (locale == null) {
    locale = exports.getDefaultLocale;
  }
};

l10n.interpolate('the {sub} sat on the {obj}', { sub:'cat', obj:'mat' });


/**
 * A plural form is a way to pluralize a noun. There are 2 simple plural forms
 * in English, with (s) and without - e.g. tree and trees. There are many other
 * ways to pluralize (e.g. witches, ladies, teeth, oxen, axes, data, alumini)
 * However they all follow the rule that 0 and 1 are 'singular' while everything
 * else is 'plural' (words without a plural form like sheep can be seen as
 * following this rule where the singular and plural forms are the same)
 * <p>Non-English languages have different pluralization rules.
 * See https://developer.mozilla.org/en/Localization_and_Plurals
 * See https://secure.wikimedia.org/wikipedia/en/wiki/List_of_ISO_639-1_codes
 *
 * Contains code inspired by Mozilla L10n code originally developed by
 *     Edward Lee <edward.lee@engineering.uiuc.edu>
 */
var pluralRules = [
  /**
   * Index 0 - Only one form for all
   * Asian family: Japanese, Vietnamese, Korean
   */
  {
    locales: [
      'fa', 'fa-ir',
      'id',
      'ja', 'ja-jp-mac',
      'ka',
      'ko', 'ko-kr',
      'th', 'th-th',
      'tr', 'tr-tr',
      'zh', 'zh-tw', 'zh-cn'
    ],
    numForms: 1,
    get: function(n) {
      return 0;
    }
  },

  /**
   * Index 1 - Two forms, singular used for one only
   * Germanic family: English, German, Dutch, Swedish, Danish, Norwegian,
   *          Faroese
   * Romanic family: Spanish, Portuguese, Italian, Bulgarian
   * Latin/Greek family: Greek
   * Finno-Ugric family: Finnish, Estonian
   * Semitic family: Hebrew
   * Artificial: Esperanto
   * Finno-Ugric family: Hungarian
   * Turkic/Altaic family: Turkish
   */
  {
    locales: [
      'af', 'af-za',
      'as', 'ast',
      'bg',
      'br',
      'bs', 'bs-ba',
      'ca',
      'cy', 'cy-gb',
      'da',
      'de', 'de-de', 'de-ch',
      'en', 'en-gb', 'en-us', 'en-za',
      'el', 'el-gr',
      'eo',
      'es', 'es-es', 'es-ar', 'es-cl', 'es-mx',
      'et', 'et-ee',
      'eu',
      'fi', 'fi-fi',
      'fy', 'fy-nl',
      'gl', 'gl-gl',
      'he',
     //     'hi-in', Without an unqualified language, looks dodgy
      'hu', 'hu-hu',
      'hy', 'hy-am',
      'it', 'it-it',
      'kk',
      'ku',
      'lg',
      'mai',
     // 'mk', 'mk-mk', Should be 14?
      'ml', 'ml-in',
      'mn',
      'nb', 'nb-no',
      'no', 'no-no',
      'nl',
      'nn', 'nn-no',
      'no', 'no-no',
      'nb', 'nb-no',
      'nso', 'nso-za',
      'pa', 'pa-in',
      'pt', 'pt-pt',
      'rm', 'rm-ch',
     // 'ro', 'ro-ro', Should be 5?
      'si', 'si-lk',
     // 'sl',      Should be 10?
      'son', 'son-ml',
      'sq', 'sq-al',
      'sv', 'sv-se',
      'vi', 'vi-vn',
      'zu', 'zu-za'
    ],
    numForms: 2,
    get: function(n) {
      return n != 1 ?
        1 :
        0;
    }
  },

  /**
   * Index 2 - Two forms, singular used for zero and one
   * Romanic family: Brazilian Portuguese, French
   */
  {
    locales: [
      'ak', 'ak-gh',
      'bn', 'bn-in', 'bn-bd',
      'fr', 'fr-fr',
      'gu', 'gu-in',
      'kn', 'kn-in',
      'mr', 'mr-in',
      'oc', 'oc-oc',
      'or', 'or-in',
            'pt-br',
      'ta', 'ta-in', 'ta-lk',
      'te', 'te-in'
    ],
    numForms: 2,
    get: function(n) {
      return n > 1 ?
        1 :
        0;
    }
  },

  /**
   * Index 3 - Three forms, special case for zero
   * Latvian
   */
  {
    locales: [ 'lv' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        1 :
        n != 0 ?
          2 :
          0;
    }
  },

  /**
   * Index 4 -
   * Scottish Gaelic
   */
  {
    locales: [ 'gd', 'gd-gb' ],
    numForms: 4,
    get: function(n) {
      return n == 1 || n == 11 ?
        0 :
        n == 2 || n == 12 ?
          1 :
          n > 0 && n < 20 ?
            2 :
            3;
    }
  },

  /**
   * Index 5 - Three forms, special case for numbers ending in 00 or [2-9][0-9]
   * Romanian
   */
  {
    locales: [ 'ro', 'ro-ro' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n == 0 || n % 100 > 0 && n % 100 < 20 ?
          1 :
          2;
    }
  },

  /**
   * Index 6 - Three forms, special case for numbers ending in 1[2-9]
   * Lithuanian
   */
  {
    locales: [ 'lt' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ?
          2 :
          1;
    }
  },

  /**
   * Index 7 - Three forms, special cases for numbers ending in 1 and
   *       2, 3, 4, except those ending in 1[1-4]
   * Slavic family: Russian, Ukrainian, Serbian, Croatian
   */
  {
    locales: [
      'be', 'be-by',
      'hr', 'hr-hr',
      'ru', 'ru-ru',
      'sr', 'sr-rs', 'sr-cs',
      'uk'
    ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ?
          1 :
          2;
    }
  },

  /**
   * Index 8 - Three forms, special cases for 1 and 2, 3, 4
   * Slavic family: Czech, Slovak
   */
  {
    locales: [ 'cs', 'sk' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n >= 2 && n <= 4 ?
          1 :
          2;
    }
  },

  /**
   * Index 9 - Three forms, special case for one and some numbers ending in
   *       2, 3, or 4
   * Polish
   */
  {
    locales: [ 'pl' ],
    numForms: 3,
    get: function(n) {
      return n == 1 ?
        0 :
        n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ?
          1 :
          2;
    }
  },

  /**
   * Index 10 - Four forms, special case for one and all numbers ending in
   *      02, 03, or 04
   * Slovenian
   */
  {
    locales: [ 'sl' ],
    numForms: 4,
    get: function(n) {
      return n % 100 == 1 ?
        0 :
        n % 100 == 2 ?
          1 :
          n % 100 == 3 || n % 100 == 4 ?
            2 :
            3;
    }
  },

  /**
   * Index 11 -
   * Irish Gaeilge
   */
  {
    locales: [ 'ga-IE', 'ga-ie', 'ga', 'en-ie' ],
    numForms: 5,
    get: function(n) {
      return n == 1 ?
        0 :
        n == 2 ?
          1 :
          n >= 3 && n <= 6 ?
            2 :
            n >= 7 && n <= 10 ?
              3 :
              4;
    }
  },

  /**
   * Index 12 -
   * Arabic
   */
  {
    locales: [ 'ar' ],
    numForms: 6,
    get: function(n) {
      return n == 0 ?
        5 :
        n == 1 ?
          0 :
          n == 2 ?
            1 :
            n % 100 >= 3 && n % 100 <= 10 ?
              2 :
              n % 100 >= 11 && n % 100 <= 99 ?
                3 :
                4;
    }
  },

  /**
   * Index 13 -
   * Maltese
   */
  {
    locales: [ 'mt' ],
    numForms: 4,
    get: function(n) {
      return n == 1 ?
        0 :
        n == 0 || n % 100 > 0 && n % 100 <= 10 ?
          1 :
          n % 100 > 10 && n % 100 < 20 ?
            2 :
            3;
    }
  },

  /**
   * Index 14 -
   * Macedonian
   */
  {
    locales: [ 'mk', 'mk-mk' ],
    numForms: 3,
    get: function(n) {
      return n % 10 == 1 ?
        0 :
        n % 10 == 2 ?
          1 :
          2;
    }
  },

  /**
   * Index 15 -
   * Icelandic
   */
  {
    locales: [ 'is' ],
    numForms: 2,
    get: function(n) {
      return n % 10 == 1 && n % 100 != 11 ?
        0 :
        1;
    }
  }

  /*
  // Known locales without a known plural rule
  'km', 'ms', 'ne-np', 'ne-np', 'ne', 'nr', 'nr-za', 'rw', 'ss', 'ss-za',
  'st', 'st-za', 'tn', 'tn-za', 'ts', 'ts-za', 've', 've-za', 'xh', 'xh-za'
  */
];

/**
 * Use rule 0 by default, which is no plural forms at all
 */
var pluralRule = pluralRules[0];

/**
 * What language should we use?
 * This is complicated, we should possibly be using the HTTP 'Accept-Language'
 * header, however this is somewhat hard to get at.
 * http://stackoverflow.com/questions/1043339/javascript-for-detecting-browser-language-preference
 * For now we'll go with the more simple window.navigator.language in the
 * browser
 */
function getPluralRule() {
  if (!pluralRule) {
    var index;
    try {
      var svc = Components.classes["@mozilla.org/intl/stringbundle;1"]
          .getService(Components.interfaces.nsIStringBundleService);
      var bundle = svc.createBundle("chrome://global/locale/intl.properties");
      var pluralRule = bundle.GetStringFromName("pluralRule");
      index = parseInt(pluralRule);
      pluralRule = pluralRules(index);
    }
    catch (ex) {
      // Will happen in non firefox instances

      var lang = window.navigator.language;
      // Next: convert lang to a rule index
      pluralRules.some(function(rule) {
        if (rule.locales.indexOf(lang) !== -1) {
          pluralRule = rule;
          return true;
        }
        return false;
      });
    }
  }

  return pluralRule;
}


});
