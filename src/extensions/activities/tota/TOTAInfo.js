// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

export const Info = {
  key: 'tota',
  icon: 'tower-fire',
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
