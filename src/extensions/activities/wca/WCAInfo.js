// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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
