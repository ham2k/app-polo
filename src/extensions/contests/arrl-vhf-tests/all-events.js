/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { VHF_BANDS, UHF_BANDS, SHF_BANDS, EHF_BANDS } from '@ham2k/lib-operation-data'

export default [
  {
    key: 'ARRL-VHF-JAN',
    name: 'ARRL VHF January',
    short: 'VHF Jan',
    start: '2026-01-17 19:00Z',
    end: '2026-01-19 03:59Z',
    bands: [...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS],
    exchange: ['grid4'],
    options: {
      qsosPerBand: true,
      score: 'points'
    },
    points: {
      "6m": 1, // 50
      "2m": 1, // 144
      "1.25m": 2, // 222
      "70cm": 2, // 430
      "33cm": 4, // 900
      "23cm": 4, // 1200
      "13cm": 8, // 2300
      "9cm": 8, // 3300
      "6cm": 8, // 5700
      "3cm": 8, // 10G
      "1.25cm": 8, // 24G
      "6mm": 8, // 47G
      "4mm": 8, // 75G
      "2mm": 8, // 123G
      "2.5mm": 8, // 134G
      "1mm": 8, // 241G
      "submm": 4, // 241G
    },
    rules: 'https://contests.arrl.org/ContestRules/JanJunSep-VHF-Rules.pdf'
  },
  {
    key: 'ARRL-VHF-JUN',
    name: 'ARRL VHF June',
    short: 'VHF Jun',
    start: '2026-06-13 19:00Z',
    end: '2026-06-15 03:59Z',
    bands: [...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS],
    exchange: ['grid4'],
    options: {
      qsosPerBand: true,
      score: 'points'
    },
    points: {
      "6m": 1, // 50
      "2m": 1, // 144
      "1.25m": 2, // 222
      "70cm": 2, // 430
      "33cm": 3, // 900
      "23cm": 3, // 1200
      "13cm": 4, // 2300
      "9cm": 4, // 3300
      "6cm": 4, // 5700
      "3cm": 4, // 10G
      "1.25cm": 4, // 24G
      "6mm": 4, // 47G
      "4mm": 4, // 75G
      "2mm": 4, // 123G
      "2.5mm": 4, // 134G
      "1mm": 4, // 241G
      "submm": 4, // 241G
    },
    rules: 'https://contests.arrl.org/ContestRules/JanJunSep-VHF-Rules.pdf'
  },
  {
    key: 'ARRL-VHF-SEP',
    name: 'ARRL VHF September',
    short: 'ARRL VHF Sep',
    start: '2026-09-12 19:00Z',
    end: '2026-09-14 03:59Z',
    bands: [...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS],
    exchange: ['grid4'],
    options: {
      qsosPerBand: true,
      score: 'points'
    },
    points: {
      "6m": 1, // 50
      "2m": 1, // 144
      "1.25m": 2, // 222
      "70cm": 2, // 430
      "33cm": 3, // 900
      "23cm": 3, // 1200
      "13cm": 4, // 2300
      "9cm": 4, // 3300
      "6cm": 4, // 5700
      "3cm": 4, // 10G
      "1.25cm": 4, // 24G
      "6mm": 4, // 47G
      "4mm": 4, // 75G
      "2mm": 4, // 123G
      "2.5mm": 4, // 134G
      "1mm": 4, // 241G
      "submm": 4, // 241G
    },
    rules: 'https://contests.arrl.org/ContestRules/JanJunSep-VHF-Rules.pdf'
  },
  {
    key: 'ARRL-222',
    name: 'ARRL 222 MHz and Up',
    short: 'ARRL 222',
    start: '2026-08-01 18:00Z',
    end: '2026-08-02 17:59Z',
    bands: ['1.25m', ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS],
    exchange: ['grid6'],
    options: {
      qsosPerBandAndLocation: true,
      score: 'distance'
    },
    multipliers: {
      "1.25m": 2, // 222
      "70cm": 1,  // 430
      "33cm": 4,  // 900
      "23cm": 2, // 1200
      "13cm": 6, // 2300
      "9cm": 10, // 3400
      "6cm": 10,  // 5700
      "3cm": 6,  // 10G
      "1.25cm": 20, // 24G
      "6mm": 20, // 47G
      "4mm": 20, // 75G
      "2mm": 20, // 123G
      "2.5mm": 20, // 134G
      "1mm": 20, // 241G
      "submm": 20
    },
    rules: 'https://contests.arrl.org/ContestRules/222-MHz-Rules.pdf'
  },
  {
    key: 'ARRL-10G-AUG',
    name: 'ARRL 10 GHz and Up - August',
    cabrilloName: 'ARRL-10-GHZ',
    short: 'ARRL 10G Aug',
    start: '2026-08-15 09:00Z',
    end: '2026-08-17 07:59Z',
    bands: ['3cm', '1.25cm', ...EHF_BANDS],
    exchange: ['grid6'],
    options: {
      qsosPerBandAndLocation: true,
      score: 'distanceAndPoints'
    },
    points: {
      "qso": 100,
    },
    multipliers: {
      "3cm": 1, // 10G
      "1.25cm": 2, // 24G
      "6mm": 3, // 47G
      "4mm": 4, // 75G
      "2mm": 5, // 123G
      "2.5mm": 5, // 134G
      "1mm": 5, // 241G
    },
    rules: 'https://contests.arrl.org/ContestRules/10-GHz-Rules.pdf'
  },
  {
    key: 'ARRL-10G-SEP',
    name: 'ARRL 10 GHz and Up - September',
    cabrilloName: 'ARRL-10-GHZ',
    short: 'ARRL 10G Sep',
    start: '2026-09-19 09:00Z',
    end: '2026-09-21 07:59Z',
    bands: ['3cm', '1.25cm', ...EHF_BANDS],
    exchange: ['grid6'],
    options: {
      qsosPerBandAndLocation: true,
      score: 'distanceAndPoints'
    },
    points: {
      "qso": 100,
    },
    multipliers: {
      "3cm": 1, // 10G
      "1.25cm": 2, // 24G
      "6mm": 3, // 47G
      "4mm": 4, // 75G
      "2mm": 5, // 123G
      "2.5mm": 5, // 134G
      "1mm": 5, // 241G
    },
    rules: 'https://contests.arrl.org/ContestRules/10-GHz-Rules.pdf'
  }
]