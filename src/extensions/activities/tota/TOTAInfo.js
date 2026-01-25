/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const Info = {
  key: 'tota',
  icon: 'fa-tower-observation',
  name: 'Towers on the Air',
  shortName: 'TOTA',
  doubleContact: 'Tower-to-Tower',
  shortNameDoubleContact: 'R2R',
  infoURL: 'https://www.rozhledny.eu/',
  huntingType: 'tota',
  activationType: 'totaActivation',
  descriptionPlaceholder: 'Enter TOTA references',
  unknownReferenceName: 'Unknown Tower',
  referenceRegex: /^[A-Z0-9]+R-[0-9]{4}$/i,
  scoring: {
    activates: 'daily',
    allowsMultipleReferences: false,
    qsosToActivate: 13,
    uniquePer: ['ref']
  }
}
