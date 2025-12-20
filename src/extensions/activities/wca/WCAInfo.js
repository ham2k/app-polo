/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const Info = {
  key: 'wca',
  icon: 'castle',
  name: 'World Castles Awards',
  shortName: 'WCA',
  infoURL: 'https://wcagroup.org/',
  activationType: 'wcaActivation',
  otherActivationTypes: ['ecaActivation', 'bcaActivation'],
  descriptionPlaceholder: 'Enter WCA reference',
  unknownReferenceName: 'Unknown Castle',
  referenceRegex: /^[A-Z0-9]+-[0-9]{5}$/i,
  scoring: {
    activates: 'once',
    qsosToActivate: 50,
    uniquePer: ['band', 'mode', 'day']
  }
}
