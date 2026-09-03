// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { EHF_BANDS, SHF_BANDS, UHF_BANDS, VHF_BANDS } from '@ham2k/lib-operation-data'

import { qsonToCabrillo } from './qsonToCabrillo'

const settings = { operatorCall: 'K1OP' }

// A QSO Party operation keeps the same ref throughout, but changes the county we operate from
// at each segment. The operation record itself always carries the *latest* segment's refs.
const handler = {
  key: 'qp',
  qsoToCabrilloParts: ({ qso, ref }) => [qso.their.call, ref?.location]
}

function qso ({ call, startAtMillis }) {
  return { startAtMillis, band: '20m', mode: 'SSB', their: { call, sent: '59' }, our: { call: 'K1OP', sent: '59' } }
}

function segment ({ event, startAtMillis, location }) {
  return { startAtMillis, event: { event, operation: { refs: [{ type: 'qp', ref: 'co', location }] } } }
}

describe('qsonToCabrillo segment refs', () => {
  it('reports the county in effect for each segment, not the last one', () => {
    const cabrillo = qsonToCabrillo({
      operation: { stationCall: 'K1OP', refs: [{ type: 'qp', ref: 'co', location: 'ADA' }] },
      settings,
      handler,
      qsos: [
        segment({ event: 'start', startAtMillis: 1000, location: 'DEL' }),
        qso({ call: 'K1KK', startAtMillis: 2000 }),
        segment({ event: 'break', startAtMillis: 3000, location: 'ADA' }),
        qso({ call: 'K2KK', startAtMillis: 4000 })
      ]
    })

    expect(cabrillo).toMatch(/QSO:.*K1KK DEL/)
    expect(cabrillo).toMatch(/QSO:.*K2KK ADA/)
  })
})

// Microwave operators routinely type the frequency in MHz ("10368.1"), which PoLo stores as-is
// but still resolves to the right band. The Cabrillo band identifier has to come from the band,
// or those QSOs are reported as HF frequencies.
describe('qsonToCabrillo frequencies', () => {
  const bandHandler = { key: 'qp', qsoToCabrilloParts: ({ qso }) => [qso.their.call] }

  function bandQSO ({ band, freq }) {
    return { startAtMillis: 1000, band, freq, mode: 'SSB', their: { call: 'K1KK' }, our: { call: 'K1OP' } }
  }

  function cabrilloFor (qso) {
    return qsonToCabrillo({ operation: { stationCall: 'K1OP' }, settings, handler: bandHandler, qsos: [qso] })
  }

  it('reports microwave bands by identifier, whatever units the frequency was logged in', () => {
    expect(cabrilloFor(bandQSO({ band: '3cm', freq: 10368.1 }))).toMatch(/QSO: 10G/)
    expect(cabrilloFor(bandQSO({ band: '3cm', freq: 10368100 }))).toMatch(/QSO: 10G/)
    expect(cabrilloFor(bandQSO({ band: '1.25cm', freq: 24192.1 }))).toMatch(/QSO: 24G/)
    expect(cabrilloFor(bandQSO({ band: '6mm', freq: 47088.5 }))).toMatch(/QSO: 47G/)
    expect(cabrilloFor(bandQSO({ band: '4mm' }))).toMatch(/QSO: 75G/)
  })

  it('reports VHF and UHF bands by identifier', () => {
    expect(cabrilloFor(bandQSO({ band: '2m', freq: 144200 }))).toMatch(/QSO: 144 /)
    expect(cabrilloFor(bandQSO({ band: '1.25m', freq: 222100 }))).toMatch(/QSO: 222 /)
    expect(cabrilloFor(bandQSO({ band: '70cm', freq: 432100 }))).toMatch(/QSO: 432 /)
  })

  // Every band reported by identifier needs a table entry, or it exports as '0'.
  // The two lists have to stay in sync as the band list grows.
  it('has an identifier for every band that reports one', () => {
    const bands = [...VHF_BANDS, ...UHF_BANDS, ...SHF_BANDS, ...EHF_BANDS]
    const missing = bands.filter(band => cabrilloFor(bandQSO({ band })).match(/QSO: 0 /))
    expect(missing).toEqual([])
  })

  it('reports HF in kHz', () => {
    expect(cabrilloFor(bandQSO({ band: '20m', freq: 14074 }))).toMatch(/QSO: 14074/)
  })
})

// Every contest handler reads the operator's default reports out of `settings`,
// so the exporter has to hand them over; without it they all fall back to 59/599.
describe('qsonToCabrillo settings', () => {
  const reportHandler = {
    key: 'qp',
    qsoToCabrilloParts: ({ qso, operation, settings }) => [
      operation.stationCall || settings.operatorCall,
      settings?.defaultReport || '59',
      qso.their.call
    ]
  }

  it('passes settings to the handler', () => {
    const cabrillo = qsonToCabrillo({
      operation: {},
      settings: { operatorCall: 'K1OP', defaultReport: '55' },
      handler: reportHandler,
      qsos: [{ startAtMillis: 1000, band: '20m', mode: 'SSB', their: { call: 'K1KK' }, our: {} }]
    })
    expect(cabrillo).toMatch(/QSO: 14000 PH .* K1OP 55 K1KK/)
  })
})
