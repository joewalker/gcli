/*
 * Copyright 2014, Mozilla Foundation and contributors
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

var Promise = require('../util/promise').Promise;
var l10n = require('../util/l10n');
var Conversion = require('./types').Conversion;
var Status = require('./types').Status;

exports.items = [
  {
    // The union type allows for a combination of different parameter types.
    item: 'type',
    name: 'union',

    constructor: function() {
      // Get the properties of the type. Later types in the list should always
      // be more general, so 'catch all' types like string must be last
      this.alternatives = this.alternatives.map(function(typeData) {
        return this.types.createType(typeData);
      }.bind(this));
    },

    getSpec: function(command, param) {
      var spec = { name: 'union', alternatives: [] };
      this.alternatives.forEach(function(type) {
        spec.alternatives.push(type.getSpec(command, param));
      }.bind(this));
      return spec;
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }

      var type = this.alternatives.find(function(typeData) {
        return typeData.name === value.type;
      });

      return type.stringify(value[value.type], context);
    },

    parse: function(arg, context) {
      // Try to parse the given argument in the provided order of the parameter
      // types. Returns a promise containing the Conversion of the value that
      // was parsed.

      var onError = function(i) {
        if (i >= this.alternatives.length) {
          var msg = l10n.lookup('commandParseError');
          var conversion = new Conversion(undefined, arg, Status.ERROR, msg);
          return Promise.resolve(conversion);
        }
        else {
          return tryNext(i + 1);
        }
      }.bind(this);

      var tryNext = function(i) {
        var type = this.alternatives[i];

        try {
          return type.parse(arg, context).then(function(conversion) {
            if (conversion.getStatus() === Status.VALID ||
                conversion.getStatus() === Status.INCOMPLETE) {
              // Converts the conversion value of the union type to an
              // object that identifies the current working type and the
              // data associated with it
              if (conversion.value) {
                var oldConversionValue = conversion.value;
                conversion.value = { type: type.name };
                conversion.value[type.name] = oldConversionValue;
              }

              return conversion;
            }
            else {
              return onError(i);
            }
          });
        }
        catch (ex) {
          return onError(i);
        }
      }.bind(this);

      return Promise.resolve(tryNext(0));
    },
  }
];
