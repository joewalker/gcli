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

const l10n = require('../util/l10n');
const Conversion = require('./types').Conversion;
const Status = require('./types').Status;

exports.items = [
  {
    // The union type allows for a combination of different parameter types.
    item: 'type',
    name: 'union',
    hasPredictions: true,

    constructor: function() {
      // Get the properties of the type. Later types in the list should always
      // be more general, so 'catch all' types like string must be last
      this.alternatives = this.alternatives.map(typeData => {
        return this.types.createType(typeData);
      });
    },

    getSpec: function(command, param) {
      const spec = { name: 'union', alternatives: [] };
      this.alternatives.forEach(type => {
        spec.alternatives.push(type.getSpec(command, param));
      });
      return spec;
    },

    stringify: function(value, context) {
      if (value == null) {
        return '';
      }

      const type = this.alternatives.find(typeData => typeData.name === value.type);

      return type.stringify(value[value.type], context);
    },

    parse: function(arg, context) {
      const conversionPromises = this.alternatives.map(type => type.parse(arg, context));

      return Promise.all(conversionPromises).then(conversions => {
        // Find a list of the predictions made by any conversion
        const predictionPromises = conversions.map(conversion => {
          return conversion.getPredictions(context);
        });

        return Promise.all(predictionPromises).then(allPredictions => {
          // Take one prediction from each set of predictions, ignoring
          // duplicates, until we've got up to Conversion.maxPredictions
          const maxIndex = allPredictions.reduce((prev, prediction) => {
            return Math.max(prev, prediction.length);
          }, 0);
          const predictions = [];

          indexLoop:
          for (let index = 0; index < maxIndex; index++) {
            for (let p = 0; p <= allPredictions.length; p++) {
              if (predictions.length >= Conversion.maxPredictions) {
                break indexLoop;
              }

              if (allPredictions[p] != null) {
                const prediction = allPredictions[p][index];
                if (prediction != null && predictions.indexOf(prediction) === -1) {
                  predictions.push(prediction);
                }
              }
            }
          }

          let bestStatus = Status.ERROR;
          let value;
          for (let i = 0; i < conversions.length; i++) {
            const conversion = conversions[i];
            const thisStatus = conversion.getStatus(arg);
            if (thisStatus < bestStatus) {
              bestStatus = thisStatus;
            }
            if (bestStatus === Status.VALID) {
              const type = this.alternatives[i].name;
              value = { type: type };
              value[type] = conversion.value;
              break;
            }
          }

          const msg = (bestStatus === Status.VALID) ?
                    '' :
                    l10n.lookupFormat('typesSelectionNomatch', [ arg.text ]);
          return new Conversion(value, arg, bestStatus, msg, predictions);
        });
      });
    },
  }
];
