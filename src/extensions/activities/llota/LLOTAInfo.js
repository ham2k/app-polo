// Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

export const Info = {
  key: 'llota',
  icon: 'waves',
  name: 'Lakes and Lagoons on the Air',
  shortName: 'LLOTA',
  doubleContact: 'Lake-to-Lake',
  shortNameDoubleContact: 'L2L',
  infoURL: 'https://llota.app/',
  huntingType: 'llota',
  activationType: 'llotaActivation',
  descriptionPlaceholder: 'Enter LLOTA references',
  unknownReferenceName: 'Unknown Lake',
  referenceRegex: /^[A-Z0-9]+-(?:[0-9]{4,5}|TEST)$/i,
  scoring: {
    activates: 'daily',
    allowsMultipleReferences: true,
    qsosToActivate: 10,
    uniquePer: ['band', 'mode', 'day', 'ref']
  }
}
