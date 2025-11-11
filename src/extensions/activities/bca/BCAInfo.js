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
    uniquePer: ['band', 'mode', 'day'],
    referenceLabel: 'Castle',
    referenceLabelPlural: 'Castles',
    ref2refLabel: 'C2C',
    ref2refShortName: 'C2C',
    huntedShorterName: 'C',
    activatorQSOLabel: 'Activator QSO',
    activatorQSOsLabel: 'Activator QSOs',
    hunterQSOLabel: 'Hunter QSO',
    hunterQSOsLabel: 'Hunter QSOs',
    referenceActivatedLabel: 'Castle activated',
    referencesActivatedLabel: 'Castles activated',
    referenceMissedLabel: 'Castle missed',
    referencesMissedLabel: 'Castles missed',
    referenceHuntedLabel: 'Castle hunted',
    referencesHuntedLabel: 'Castles hunted',
  }
}
