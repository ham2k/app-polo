// Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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
