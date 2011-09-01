/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

define(function(require, exports, module) {

// Bug 683844: Should be require('i18n!gcli/nls/strings');
var strings = require('gcli/nls/strings').root;


/**
 * Finds the preferred locales of the user as an array of RFC 4646 strings
 * (e.g. 'pt-br').
 * . There is considerable confusion as to the correct value
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
exports.getPreferredLocales = function() {
  var language = (navigator.language || navigator.userLanguage).toLowerCase();
  var parts = language.split('-');
  var reply = parts.map(function(part, index) {
    return parts.slice(0, parts.length - index).join('-');
  });
  reply.push('root');
  return reply;
};

/**
 * Lookup a key in the current locale, throwing an error if that string does
 * not exist.
 * @param key The string to lookup
 * @param altStrings An alternate strings file
 * @return The string resolved from the correct locale
 */
function lookupKey(key, altStrings) {
  var str = altStrings ? altStrings[key] : strings[key];
  if (!str) {
    throw new Error('No i18n key: ' + key);
  }
  return str;
}

/**
 * Helper function to process swaps.
 * For example:
 *   replace('the {subject} {verb} {preposition} the {object}', {
 *     subject: 'cat', verb: 'sat', preposition: 'on', object: 'mat'
 *   });
 * Returns 'the cat sat on the mat'.
 * @param str The string containing parts delimited by { and } to be replaced
 * @param swaps Lookup map containing the replacement strings
 */
function replace(str, swaps) {
  return str.replace(/\{[^}]*\}/g, function(name) {
    name = name.slice(1, -1);
    if (swaps == null) {
      console.log('Missing swaps while looking up \'' + name + '\'');
      return '';
    }
    var replacement = swaps[name];
    if (replacement == null) {
      console.log('Can\'t find \'' + name + '\' in ' + JSON.stringify(swaps));
      replacement = '';
    }
    return replacement;
  });
}

/**
 * Lookup a key in our strings file using localized versions if possible,
 * and perform string interpolation to inject runtime values into the string.
 * l10n lookup is required for user visible strings, but not required for
 * console messages and throw strings.
 * @param key The string to lookup in gcli/nls/strings.js
 * This should generally be in the general form 'filename_export_issue' where
 * filename is the name of the module (all lowercase without underscores) and
 * export is the name of a top level thing in which the message is used and
 * issue is a short string indicating the issue.
 * The point of a 'standard' like this is to keep strings fairly short whilst
 * still allowing users to have an idea where they come from, and preventing
 * name clashes.
 * The value looked up may contain {variables} to be exchanged using swaps
 * @param swaps A map of variable values to be swapped.
 * @param altStrings An alternate strings file
 * @return A looked-up and interpolated message for display to the user.
 */
exports.lookup = function(key, swaps, altStrings) {
  var str = lookupKey(key, altStrings);
  return replace(str, swaps);
};

/**
 * Lookup the correct pluralization of a word/string.
 * The first ``key`` and ``swaps`` parameters of lookupPlural() are the same
 * as for lookup(), however there is an extra ``ord`` parameter which indicates
 * the plural ordinal to use.
 * For example, in looking up the string '39 steps', the ordinal would be 39.
 *
 * More detailed example:
 * French has 2 plural forms: the first for 0 and 1, the second for everything
 * else. English also has 2, but the first only covers 1. Zero is lumped into
 * the 'everything else' category. Vietnamese has only 1 plural form - so it
 * uses the same noun form however many of them there are.
 * The following localization strings describe how to pluralize the phrase
 * '1 minute':
 *   'en-us': { demo_plural_time: [ '{ord} minute', '{ord} minutes' ] },
 *   'fr-fr': { demo_plural_time: [ '{ord} minute', '{ord} minutes' ] },
 *   'vi-vn': { demo_plural_time: [ '{ord} phut' ] },
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 minutes' in 'en-us'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 minute' in 'en-us'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 minutes' in 'en-us'
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 minute' in 'fr-fr'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 minute' in 'fr-fr'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 minutes' in 'fr-fr'
 *
 *   l10n.lookupPlural('demo_plural_time', 0); // '0 phut' in 'vi-vn'
 *   l10n.lookupPlural('demo_plural_time', 1); // '1 phut' in 'vi-vn'
 *   l10n.lookupPlural('demo_plural_time', 9); // '9 phut' in 'vi-vn'
 *
 * The
 * Note that the localization strings are (correctly) the same (since both
 * the English and the French words have the same etymology)
 * @param key The string to lookup in gcli/nls/strings.js
 * @param ord The number to use in plural lookup
 * @param swaps A map of variable values to be swapped.
 * @param altStrings An alternate strings file
 */
exports.lookupPlural = function(key, ord, swaps, altStrings) {
  var index = getPluralRule().get(ord);
  var words = lookupKey(key, altStrings);
  var str = words[index];

  swaps = swaps || {};
  swaps.ord = ord;

  return replace(str, swaps);
};

/**
 * Find the correct plural rule for the current locale
 * @return a plural rule with a ``get()`` function
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
      var lang = navigator.language || navigator.userLanguage;
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

/**
 * A plural form is a way to pluralize a noun. There are 2 simple plural forms
 * in English, with (s) and without - e.g. tree and trees. There are many other
 * ways to pluralize (e.g. witches, ladies, teeth, oxen, axes, data, alumini)
 * However they all follow the rule that 1 is 'singular' while everything
 * else is 'plural' (words without a plural form like sheep can be seen as
 * following this rule where the singular and plural forms are the same)
 * <p>Non-English languages have different pluralization rules, for example
 * French uses singular for 0 as well as 1. Japanese has no plurals while
 * Arabic and Russian are very complex.
 *
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
    locales: [ 'ga-ie', 'ga-ie', 'ga', 'en-ie' ],
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

});
