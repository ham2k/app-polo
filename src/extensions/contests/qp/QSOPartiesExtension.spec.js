// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

jest.mock('../../../ui/index.js', () => ({}))
jest.mock('../../../store/operations', () => ({ setOperationData: jest.fn() }))
jest.mock('./QSOPartiesActivityOptions', () => ({ ActivityOptions: () => null }))
jest.mock('./QSOPartiesSpotting', () => ({ QSOPartiesPostSelfSpot: jest.fn(), SpotsHook: jest.fn() }))

import RAW_US_STATES from '../../../data/usStates.json'
import RAW_CANADIAN_PROVINCES from '../../../data/canadianProvinces.json'

import { QSO_PARTY_DATA, ReferenceHandler } from './QSOPartiesExtension'

const CO_REF = { type: 'qp', ref: 'CO', location: 'ADA', mobile: true }

function simulateOperation ({ ref, qsoCount, theirLocations = ['NY'], theirCalls, theirEntities, bands = ['20m'], modes = ['CW'] }) {
  const operation = { refs: [ref] }
  const qsos = []
  let score

  for (let i = 0; i < qsoCount; i++) {
    const theirLocation = theirLocations[i % theirLocations.length]
    const theirCall = theirCalls?.[i] ?? `K1AA${i}`
    const qso = {
      key: `qso-${i}`,
      uuid: `uuid-${i}`,
      band: bands[i % bands.length],
      mode: modes[i % modes.length],
      their: { call: theirCall, baseCall: theirCall, exchange: theirLocation, entityPrefix: theirEntities?.[i % theirEntities.length] },
      refs: [{ type: 'qp', location: theirLocation }]
    }
    const qsoScore = ReferenceHandler.scoringForQSO({ qso, qsos, operation, ref, score })
    score = ReferenceHandler.accumulateScoreForOperation({ qsoScore, score, operation, ref })
    qsos.push(qso)
  }

  return score
}

describe('QSO Party county activation bonus', () => {
  // Colorado awards mobile & rover stations 500 points per activated county,
  // but only once a county has at least 15 QSOs logged from it. Below the
  // minimum, no bonus applies.
  it('awards the bonus once the per-county QSO minimum is reached', () => {
    const score = simulateOperation({ ref: CO_REF, qsoCount: 15 })
    expect(score.activatedCounties.ADA).toEqual(15)
    expect(score.bonusTotal).toEqual(500)
  })

  it('awards no bonus below the per-county QSO minimum', () => {
    const score = simulateOperation({ ref: CO_REF, qsoCount: 14 })
    expect(score.bonusTotal).toEqual(0)
  })

  it('does not treat an out-of-state location as an activated county', () => {
    const score = simulateOperation({ ref: { ...CO_REF, location: 'NY' }, qsoCount: 15 })
    expect(score.activatedCounties).toEqual({})
    expect(score.bonusTotal).toEqual(0)
  })
})

describe('QSO Parties without a bonus section', () => {
  // Most parties define no `bonus` block at all. Scoring and summarizing must
  // still work for them, rather than crashing on a missing bonus definition.
  it('scores and summarizes an operation for a party with no bonus rules', () => {
    const ref = { type: 'qp', ref: 'GA', location: 'FULT' }
    const score = simulateOperation({ ref, qsoCount: 3 })
    expect(score.bonusTotal).toEqual(0)
    expect(score.total).toBeGreaterThan(0)
    ReferenceHandler.summarizeScore({ score, operation: {}, ref })
    expect(score.summary).toBeTruthy()
  })
})

describe('QSO Party rover-only county activation bonus', () => {
  // Tennessee awards 500 points per county with at least 10 QSOs, but only to
  // mobile & rover operators. A fixed station activating the same county earns
  // nothing, so the bonus must be gated on the operation's `mobile` flag.
  const TN_COUNTY = { type: 'qp', ref: 'TN', location: 'ANDE' }

  it('awards the bonus to a mobile or rover station', () => {
    const score = simulateOperation({ ref: { ...TN_COUNTY, mobile: true }, qsoCount: 10 })
    expect(score.activatedCounties.ANDE).toEqual(10)
    expect(score.bonusTotal).toEqual(500)
  })

  it('awards nothing below the per-county QSO minimum', () => {
    const score = simulateOperation({ ref: { ...TN_COUNTY, mobile: true }, qsoCount: 9 })
    expect(score.bonusTotal).toEqual(0)
  })

  it('awards nothing to a fixed station in the same county', () => {
    const score = simulateOperation({ ref: TN_COUNTY, qsoCount: 10 })
    expect(score.activatedCounties).toEqual({})
    expect(score.bonusTotal).toEqual(0)
  })

  it('adds the bonus after the multiplier, as Tennessee requires', () => {
    const score = simulateOperation({ ref: { ...TN_COUNTY, mobile: true }, qsoCount: 10 })
    expect(score.total).toEqual((score.qsoPoints * score.mult) + 500)
  })
})

describe('QSO Party in-state state multiplier', () => {
  // Colorado counts 50 states, so a Colorado station working a Colorado county
  // earns both the county and Colorado itself. Working a second county adds
  // only the county, since the state is already claimed.
  it('counts our own state as a multiplier alongside the county', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'CO', location: 'ADA' }, qsoCount: 2, theirLocations: ['BOU', 'PAR']
    })
    expect(Object.keys(score.counties).sort()).toEqual(['BOU', 'PAR'])
    expect(score.states.CO).toBeTruthy()
    expect(score.mult).toEqual(3)
  })

  it('does not give an out-of-state station the state multiplier', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'CO', location: 'NY' }, qsoCount: 2, theirLocations: ['BOU', 'PAR']
    })
    expect(score.mult).toEqual(2)
  })

  // Tennessee counts 49 states and never Tennessee itself, so a Tennessee
  // station working Tennessee counties earns only the counties.
  it('leaves parties that exclude their own state alone', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'TN', location: 'ANDE' }, qsoCount: 2, theirLocations: ['BEDF', 'BENT']
    })
    expect(score.mult).toEqual(2)
  })
})

describe('QSO Party data', () => {
  // A party is offered in the activity options only once it has an `options`
  // block. Without `points` every QSO silently falls back to a single point,
  // so an incomplete party must never become selectable. (KS, 2026)
  it('gives every selectable party its QSO point values', () => {
    const selectable = Object.keys(QSO_PARTY_DATA).filter(key => QSO_PARTY_DATA[key].options && !QSO_PARTY_DATA[key].disabled)
    const missingPoints = selectable.filter(key => Object.keys(QSO_PARTY_DATA[key].points ?? {}).length === 0)
    expect(missingPoints).toEqual([])
  })

  it('gives every selectable party its counties', () => {
    const selectable = Object.keys(QSO_PARTY_DATA).filter(key => QSO_PARTY_DATA[key].options && !QSO_PARTY_DATA[key].disabled)
    const missingCounties = selectable.filter(key => Object.keys(QSO_PARTY_DATA[key].counties ?? {}).length === 0)
    expect(missingCounties).toEqual([])
  })
})

describe('Kansas QSO Party scoring', () => {
  // Kansas: phone 2 points, CW and RTTY 3, multipliers counted once overall,
  // and the first Kansas county logged also counts as the Kansas multiplier.
  it('scores CW QSOs at 3 points each with the state multiplier included', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'KS', location: 'ATC' }, qsoCount: 2, theirLocations: ['ALL', 'AND']
    })
    expect(score.qsoPoints).toEqual(6)
    expect(score.mult).toEqual(3)
    expect(score.total).toEqual(18)
  })

  // Kansas totals are (QSO points x multipliers) + bonus, so the one-time 100
  // point KS0KS bonus lands outside the multiplier, not inside it.
  it('adds the KS0KS bonus after the multiplier', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'KS', location: 'ATC' },
      qsoCount: 2,
      theirLocations: ['ALL', 'AND'],
      theirCalls: ['KS0KS']
    })
    expect(score.bonusTotal).toEqual(100)
    expect(score.total).toEqual((score.qsoPoints * score.mult) + 100)
    expect(score.total).toEqual(118)
  })
})

describe('Multi-state QSO Parties', () => {
  // CPQP spans three provinces, so its own key is not a multiplier. The state
  // multiplier has to come from the county's province, and a party whose
  // counties map to no state or province earns no state multiplier at all.
  it('counts the county\'s province, never the party key', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'CPQP', location: 'AIR' }, qsoCount: 2, theirLocations: ['AIR', 'BRC']
    })
    expect(Object.keys(score.mults).some(mult => mult.endsWith('CPQP'))).toEqual(false)
    expect(Object.keys(score.mults).some(mult => mult.endsWith('AB'))).toEqual(true)
  })
})

describe('QSO Party DX entity multiplier cap', () => {
  // New Hampshire lets in-state stations count up to 10 DXCC entities as
  // multipliers. Entities beyond the cap still earn QSO points, but a repeat
  // QSO with an entity already counted must not be blocked by the cap.
  const NH_REF = { type: 'qp', ref: 'NH', location: 'MER' }
  const entities = ['DL', 'F', 'G', 'I', 'EA', 'OK', 'SM', 'LA', 'OZ', 'PA', 'HB', 'OE']

  it('counts DX entities as multipliers up to the cap', () => {
    const score = simulateOperation({ ref: NH_REF, qsoCount: 12, theirLocations: ['DX'], theirEntities: entities })
    expect(Object.keys(score.entities)).toHaveLength(10)
    expect(score.mult).toEqual(10)
    expect(score.qsoPoints).toEqual(24)
  })

  it('does not let the cap block an entity that already counted', () => {
    const score = simulateOperation({ ref: NH_REF, qsoCount: 11, theirLocations: ['DX'], theirEntities: entities.slice(0, 10) })
    expect(score.mult).toEqual(10)
    expect(score.entities.DL).toEqual(2)
  })
})

describe('Arizona QSO Party multipliers', () => {
  // Arizona counts multipliers differently on each side of the state line.
  // Out-of-state stations count the 15 counties again on every band and mode.
  it('counts a county again on each band and mode for non-Arizona stations', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'AZ', location: 'NY' }, qsoCount: 3, theirLocations: ['MCP'], bands: ['20m', '40m', '40m'], modes: ['CW', 'CW', 'SSB']
    })
    expect(score.mult).toEqual(3)
  })

  // Arizona stations count states, provinces and DXCC entities once per mode,
  // and never counties: two Arizona counties on CW are one multiplier, Arizona.
  it('counts states per mode and not counties for Arizona stations', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'AZ', location: 'PMA' }, qsoCount: 4, theirLocations: ['MCP', 'YMA', 'NY', 'NY'], bands: ['20m', '20m', '20m', '40m']
    })
    expect(Object.keys(score.mults).sort()).toEqual(['CW:AZ', 'CW:NY'])
  })

  // A DX station logged without a location must count as its DXCC entity. Its
  // prefix is never used as the location, because prefixes like PA, CT or OH
  // would be read as the US state of the same name.
  it('counts a DX station as its entity, not as a state that shares its prefix', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'AZ', location: 'PMA' }, qsoCount: 1, theirLocations: [undefined], theirCalls: ['PA3XYZ'], theirEntities: ['PA']
    })
    expect(Object.keys(score.mults)).toEqual(['CW:DXPA'])
    expect(score.states).toEqual({})
  })

  // Total Score = (QSO points x multipliers) + bonus, with K7A worth 100 once.
  it('adds the one-time K7A bonus after the multiplier', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'AZ', location: 'NY' }, qsoCount: 2, theirLocations: ['MCP'], theirCalls: ['K7A', 'K7A'], bands: ['20m', '40m']
    })
    expect(score.bonusTotal).toEqual(100)
    expect(score.total).toEqual((4 * 2) + 100)
  })
})

describe('Pennsylvania QSO Party scoring', () => {
  const PA_REF = { type: 'qp', ref: 'PA', location: 'ELK' }

  // Pennsylvania allows in-state stations exactly one DX multiplier, however
  // many DXCC entities they work.
  it('counts all DX as a single multiplier', () => {
    const score = simulateOperation({ ref: PA_REF, qsoCount: 3, theirLocations: ['DX'], theirEntities: ['DL', 'F', 'G'] })
    expect(score.mult).toEqual(1)
  })

  // Each valid QSO with the bonus station is worth 200 points, so working it
  // on a second band earns the bonus again, all added after the multiplier.
  it('awards the K3ZMC bonus per band, after the multiplier', () => {
    const score = simulateOperation({
      ref: PA_REF, qsoCount: 2, theirLocations: ['MGY'], theirCalls: ['K3ZMC', 'K3ZMC'], bands: ['20m', '40m']
    })
    expect(score.bonusTotal).toEqual(400)
    expect(score.total).toEqual((score.qsoPoints * score.mult) + 400)
  })

  // K3ZMC pays again on every band and mode, so a callsign struck after the
  // first contact reads as "done" while most of its bonuses are still open.
  it('lists the band/mode slots each bonus station has paid in', () => {
    const score = simulateOperation({
      ref: PA_REF, qsoCount: 2, theirLocations: ['MGY'], theirCalls: ['K3ZMC', 'K3ZMC'], bands: ['40m', '80m'], modes: ['SSB', 'CW']
    })
    ReferenceHandler.summarizeScore({ score, operation: {}, ref: PA_REF })
    expect(score.longSummary).toContain('**~~K3ZMC~~** (80m CW, 40m PHONE)')
  })

  // Rule 12.d: the sponsor adds EPA and WPA when rescoring, so leaving them out
  // under-reports every in-state score by up to two multipliers.
  it('gives an in-state station each county\'s section, EPA or WPA, as well as the county', () => {
    const score = simulateOperation({ ref: PA_REF, qsoCount: 3, theirLocations: ['MGY', 'BUX', 'ALL'] })
    expect(Object.keys(score.mults).sort()).toEqual(['ALL', 'BUX', 'EPA', 'MGY', 'WPA'])
    ReferenceHandler.summarizeScore({ score, operation: {}, ref: PA_REF })
    expect(score.longSummary).toContain('### 2 ARRL Sections')
    expect(score.longSummary).toContain('**~~EPA~~**')
  })

  // Out of state the multipliers are the 67 counties alone (rule 10.b).
  it('does not give an out-of-state station the section', () => {
    const score = simulateOperation({ ref: { ...PA_REF, location: 'NY' }, qsoCount: 1, theirLocations: ['MGY'] })
    expect(Object.keys(score.mults)).toEqual(['MGY'])
  })

  // Our own county earns nothing without working anyone: ELK sits in WPA, and
  // a log that only worked EPA must not claim it.
  it('does not give an in-state station its own section', () => {
    const score = simulateOperation({ ref: PA_REF, qsoCount: 1, theirLocations: ['MGY'] })
    expect(Object.keys(score.mults).sort()).toEqual(['EPA', 'MGY'])
  })

  // A county line on the far side is two counties, and one section when both
  // lie in it.
  it('counts one section for a county line inside it', () => {
    const score = simulateOperation({ ref: PA_REF, qsoCount: 1, theirLocations: ['CAR/LEH'] })
    expect(Object.keys(score.mults).sort()).toEqual(['CAR', 'EPA', 'LEH'])
  })

  // Each county earns its section and nothing else says so: a county left out
  // of the table, or placed twice, silently costs a multiplier.
  it('places every county in exactly one section', () => {
    const { counties, countySections } = QSO_PARTY_DATA.PA
    const placed = Object.values(countySections).flat()
    expect(placed.sort()).toEqual(Object.keys(counties).sort())
  })

  // A QSO logged before the party was added to the operation has no serial
  // numbers. Its exports must leave them out, not print "undefined".
  it('exports a QSO without serial numbers cleanly', () => {
    const operation = { refs: [PA_REF], stationCall: 'K3AAA' }
    const qso = { band: '20m', mode: 'CW', their: { call: 'K3BBB', entityPrefix: 'K', guess: { entityCode: 'K', state: 'MD' } }, refs: [] }

    const adif = Object.assign({}, ...ReferenceHandler.adifFieldsForOneQSO({ qso, operation }))
    expect(adif.STX_STRING).toEqual('ELK')
    expect(adif.SRX_STRING).toEqual('MD')

    const rows = ReferenceHandler.qsoToCabrilloParts({ qso, ref: PA_REF, operation, settings: {} })
    expect(rows).toHaveLength(1)
    expect(rows[0].join('')).not.toContain('undefined')
  })

  // A DX QSO with no location exports as one row for "DX", not a row per letter.
  it('exports a DX QSO without a location as a single row', () => {
    const operation = { refs: [PA_REF], stationCall: 'K3AAA' }
    const qso = { band: '20m', mode: 'CW', their: { call: 'DL1ABC', entityPrefix: 'DL' }, refs: [] }
    const rows = ReferenceHandler.qsoToCabrilloParts({ qso, ref: PA_REF, operation, settings: {} })
    expect(rows).toHaveLength(1)
    expect(rows[0][rows[0].length - 1].trim()).toEqual('DX')
  })

  // Serial numbers are part of the exchange, so the number fields must show.
  it('exchanges serial numbers', () => {
    expect(QSO_PARTY_DATA.PA.exchange).toContain('Number')
  })
})

describe('South Dakota QSO Party scoring', () => {
  // QSO Points x Multipliers = Total + Bonus: the W0OJY club station is worth
  // 100 points once, outside the multiplier.
  it('adds the W0OJY bonus once, after the multiplier', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'SD', location: 'NY' }, qsoCount: 2, theirLocations: ['MINN'], theirCalls: ['W0OJY', 'W0OJY'], bands: ['20m', '40m']
    })
    expect(score.bonusTotal).toEqual(100)
    expect(score.total).toEqual((4 * 1) + 100)
  })
})

describe('California QSO Party scoring', () => {
  // New in 2026: phone QSOs are worth 3 points, the same as CW.
  it('scores phone and CW QSOs at 3 points each', () => {
    const score = simulateOperation({
      ref: { type: 'qp', ref: 'CA', location: 'NY' }, qsoCount: 2, theirLocations: ['ALAM', 'MARN'], modes: ['SSB', 'CW']
    })
    expect(score.qsoPoints).toEqual(6)
  })
})

describe('QSO Parties where in-state stations do not count counties', () => {
  // Arizona and Delaware stations count their own state once, never its
  // counties, so working every county must not inflate the multiplier.
  it('counts the state instead of each county', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'DE', location: 'NDE' }, qsoCount: 3, theirLocations: ['KDE', 'SDE', 'NY'] })
    expect(Object.keys(score.mults).sort()).toEqual(['DE', 'NY'])
  })

  // The Prairies and Atlantic Canada parties span several provinces: in-region
  // stations count each province once per band, however many of its districts
  // or counties they work. Those only count for stations outside the region.
  it('counts the province once for in-region stations of a multi-province party', () => {
    const cpqp = simulateOperation({ ref: { type: 'qp', ref: 'CPQP', location: 'AIR' }, qsoCount: 2, theirLocations: ['AIR', 'BRC'] })
    expect(Object.keys(cpqp.mults)).toEqual(['20m:AB'])

    const acqp = simulateOperation({ ref: { type: 'qp', ref: 'ACQP', location: 'NLASJ' }, qsoCount: 2, theirLocations: ['NLBMT', 'NLASJ'] })
    expect(Object.keys(acqp.mults)).toEqual(['20m:NL'])
  })

  it('still counts each district for stations outside the region', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'CPQP', location: 'NY' }, qsoCount: 2, theirLocations: ['AIR', 'BRC'] })
    expect(Object.keys(score.mults).sort()).toEqual(['20m:AIR', '20m:BRC'])
  })

  // The counties still identify the station for dupe checking: the same
  // station in the same county is a dupe, but a mobile that moved to a new
  // county is a fresh QSO worth points.
  it('still flags a repeat QSO from the same county as a dupe', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'AZ', location: 'PMA' }, qsoCount: 2, theirLocations: ['MCP'], theirCalls: ['K7XX', 'K7XX'] })
    expect(score.dupeCount).toEqual(1)
    expect(score.qsoPoints).toEqual(2)
  })

  it('scores a mobile again once it changes county', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'AZ', location: 'PMA' }, qsoCount: 2, theirLocations: ['MCP', 'YMA'], theirCalls: ['K7XX', 'K7XX'] })
    expect(score.dupeCount).toEqual(0)
    expect(score.qsoPoints).toEqual(4)
  })
})

describe('California QSO Party', () => {
  const CA_IN = { type: 'qp', ref: 'CA', location: 'ALAM' }

  // CQP's in-state entrants chase states and provinces: a California county is
  // worth the CA multiplier and nothing more.
  it('counts an in-state contact as California, never as its county', () => {
    const score = simulateOperation({ ref: CA_IN, qsoCount: 2, theirLocations: ['LASS', 'SCRU'] })
    expect(Object.keys(score.mults)).toEqual(['CA'])
  })

  it('counts counties for out-of-state stations', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'CA', location: 'NY' }, qsoCount: 2, theirLocations: ['LASS', 'SCRU'] })
    expect(Object.keys(score.mults).sort()).toEqual(['LASS', 'SCRU'])
  })

  // 63 are workable from inside California and the sponsor counts 58. Capping
  // what is RECORDED instead would show worked ones as still needed.
  it('counts at most 58 multipliers for an in-state station, and keeps every one worked', () => {
    const codes = [...Object.keys(RAW_US_STATES), ...Object.keys(RAW_CANADIAN_PROVINCES)].map(code => code.toUpperCase()).filter(code => code !== 'DC')
    expect(codes).toHaveLength(63)
    const theirLocations = codes.map(code => code === 'CA' ? 'LASS' : code)
    const theirEntities = codes.map(code => RAW_CANADIAN_PROVINCES[code.toLowerCase()] ? 'VE' : 'K')
    const score = simulateOperation({ ref: CA_IN, qsoCount: 63, theirLocations, theirEntities })
    expect(Object.keys(score.mults)).toHaveLength(63)
    expect(score.mult).toEqual(58)
  })

  it('scores phone at 3 points, the same as CW', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'CA', location: 'NY' }, qsoCount: 1, theirLocations: ['LASS'], modes: ['SSB'] })
    expect(score.qsoPoints).toEqual(3)
  })

  // The serial is exchanged INSTEAD of a report, so there is no RST column: a
  // checker reading one column late takes the 599 for the serial.
  it('exports the serial and no RST', () => {
    const operation = { refs: [CA_IN], stationCall: 'N6DE' }
    const qso = { band: '15m', mode: 'CW', their: { call: 'KW8N', entityPrefix: 'K' }, refs: [{ type: 'qp', location: 'OH', ourNumber: '1', theirNumber: '142' }] }
    const rows = ReferenceHandler.qsoToCabrilloParts({ qso, ref: CA_IN, operation, settings: {} })
    expect(rows.map(row => row.map(cell => cell.trim()))).toEqual([['N6DE', '1', 'ALAM', 'KW8N', '142', 'OH']])
  })

  it('names Santa Cruz correctly', () => {
    expect(QSO_PARTY_DATA.CA.counties.SCRU).toEqual('Santa Cruz')
  })
})

describe('County lines', () => {
  // Three-way county corners exist and CQP says to send them all: each of our
  // counties pairs with each of theirs.
  it('scores every pairing when a line runs through three counties', () => {
    const score = simulateOperation({ ref: { type: 'qp', ref: 'CA', location: 'ALAM/CCOS/SCLA' }, qsoCount: 1, theirLocations: ['NY/NJ'] })
    expect(score.qsoPoints).toEqual(3 * 2 * 3)
  })
})
