// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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
