// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { VHF_BANDS, UHF_BANDS, SHF_BANDS, EHF_BANDS } from '@ham2k/lib-operation-data'

export default [
  {
    key: 'R1-VHF-SUB1-MARCH',
    name: 'Subregional 1 - March',
    short: 'March VHF Test',
    start: '2026-03-07 14:00Z',
    end: '2026-03-08 13:59Z',
    bands: [...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS]
  },
  {
    key: 'R1-VHF-SUB2-MAY',
    name: 'Subregional 2 - May',
    short: 'May VHF Test',
    start: '2026-05-02 14:00Z',
    end: '2026-05-03 13:59Z',
    bands: [...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS]
  },
  {
    key: 'R1-VHF-SUB3-JULY',
    name: 'Subregional 3 - July',
    short: 'July VHF Test',
    start: '2026-07-01 14:00Z',
    end: '2026-05-31',
    bands: [...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS]
  },
  {
    key: 'R1-VHF-50-JUNE',
    name: '50 MHz CW/SSB - June',
    short: '50 MHz Test',
    start: '2026-06-20 14:00Z',
    end: '2026-06-21 13:59Z',
    bands: ['6m']
  },
  {
    key: 'R1-VHF-70-JULY',
    name: '70 MHz CW/SSB - July',
    short: '70 MHz Test',
    start: '2026-07-18 14:00Z',
    end: '2026-07-19 13:59Z',
    bands: ['4m']
  },
  {
    key: 'R1-VHF-145-SEPTEMBER',
    name: '145 MHz CW/SSB - September',
    short: '145 MHz Test',
    start: '2026-09-05 14:00Z',
    end: '2026-09-06 13:59Z',
    bands: ['2m']
  },
  {
    key: 'R1-VHF-UHF-OCTOBER',
    name: 'UHF - October',
    short: 'UHF Test',
    start: '2026-10-03 14:00Z',
    end: '2026-10-04 13:59Z',
    bands: [...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS]
  },
  {
    key: 'R1-VHF-MARCONI-NOVEMBER',
    name: 'Marconi Memorial CW 145 MHz - November',
    short: 'Marconi Memorial',
    start: '2026-11-07 14:00Z',
    end: '2026-11-08 13:59Z',
    bands: ['2m']
  }
]
