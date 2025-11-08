/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const Info = {
  key: 'pota',
  icon: 'pine-tree',
  name: 'Parks on the Air',
  shortName: 'POTA',
  doubleContact: 'Park-to-Park',
  shortNameDoubleContact: 'P2P',
  infoURL: 'https://parksontheair.com/',
  huntingType: 'pota',
  activationType: 'potaActivation',
  descriptionPlaceholder: 'Enter POTA references',
  unknownReferenceName: 'Unknown Park',
  referenceRegex: /^[A-Z0-9]+-(?:[0-9]{4,5}|TEST)$/i,
  scoring: {
    activates: 'daily',
    allowsMultipleReferences: true,
    qsosToActivate: 10,
    uniquePer: ['band', 'mode', 'day', 'ref'],
    referenceLabel: 'park',
    ref2refLabel: 'P2P',
    activatorQSOLabel: 'activator QSO',
    activatorQSOsLabel: 'activator QSOs',
    hunterQSOLabel: 'hunter QSO',
    hunterQSOsLabel: 'hunter QSOs',
    referenceActivatedLabel: 'park activated',
    referencesActivatedLabel: 'parks activated',
    referenceHuntedLabel: 'park hunted',
    referencesHuntedLabel: 'parks hunted',
    referenceMissedLabel: 'park incomplete',
    referencesMissedLabel: 'parks incomplete',
  }
}
