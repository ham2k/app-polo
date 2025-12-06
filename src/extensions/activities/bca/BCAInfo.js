/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const Info = {
  key: 'bca',
  icon: 'castle',
  name: 'Belgium Castles & Fortresses',
  shortName: 'BCA',
  infoURL: 'https://www.belgiancastlesfortresses.be/',
  activationType: 'bcaActivation',
  descriptionPlaceholder: 'Enter BCA reference',
  unknownReferenceName: 'Unknown Castle',
  referenceRegex: /^ON-[0-9]{5}$/i,
  scoring: {
    activates: 'once',
    qsosToActivate: 50,
    uniquePer: ['band', 'mode', 'day']
  }
}
