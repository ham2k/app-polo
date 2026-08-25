// Copyright ©️ 2026 Jeff Kowalski <jeff.kowalski@gmail.com>
// SPDX-License-Identifier: MPL-2.0

// A deep-linked suggested QSO carries an authoritative freq/mode. These tests
// cover how it interacts with the logging flow: the freq/mode must become the
// VFO ("last known good") so the next QSO keeps them after logging, an
// unstarted blank QSO must not be queued and restored (which would revert the
// freq/mode), and an interrupted manual entry must be preserved. A spot-tap
// suggested QSO (no `_updatesVFO`) is the opposite: it must NOT update the VFO,
// so the next QSO reverts to whatever the operator had before the spot tap.

import { manageNextQSO, radioValuesFor } from './loggingFunctions'
import { buildSuggestedQSO } from '../../../../../tools/deepLinkTools'
import { setVFO } from '../../../../../store/station/stationSlice'
import { bandForFrequency } from '@ham2k/lib-operation-data'

jest.mock('@ham2k/lib-operation-data', () => ({
  bandForFrequency: (freq) => {
    if (freq >= 14000 && freq < 14350) return '20m'
    if (freq >= 7000 && freq < 7300) return '40m'
    return undefined
  },
  modeForFrequency: (freq) => (freq < 10000 ? 'CW' : 'SSB')
}))

jest.mock('../../../../../extensions/registry', () => ({
  findHooks: (category, { key } = {}) => {
    if (category !== 'activity') return []
    const hooks = [
      { key: 'sota', activationType: 'sotaActivation', huntingType: 'sota' },
      { key: 'pota', activationType: 'potaActivation', huntingType: 'pota' },
      // Mirrors how contest extensions (e.g. CQWPXExtension) attach an exchange
      // number: mutate the `qso` this hook is handed. That mutation only reaches
      // the logged QSO if the caller passes it the object it's about to return.
      { key: 'marker', prepareNewQSO: ({ qso }) => { qso._touchedByActivity = true } }
    ]
    return key ? hooks.filter(h => h.key === key) : hooks
  }
}))

// Back the UI-state helpers with the real (state.ui[component][key]) shape so
// manageNextQSO can read/write the in-progress QSO through our harness store.
jest.mock('../../../../../store/ui', () => ({
  setStateForComponentAndKey: (payload) => ({ type: 'ui/setStateForComponentAndKey', payload }),
  selectStateForComponentAndKey: (state, component, key) => state?.ui?.[component]?.[key]
}))

jest.mock('./useCallLookup', () => ({ resetCallLookupCache: () => () => {} }))

// Stub the station slice so importing loggingFunctions doesn't pull in
// @reduxjs/toolkit (ESM, untransformed by the RN jest preset). The harness below
// applies the resulting setVFO action, mirroring the real reducer (merge freq/mode,
// recompute band from freq). selectVFO reads the same flat `state.vfo` the harness keeps.
jest.mock('../../../../../store/station/stationSlice', () => ({
  setVFO: (payload) => ({ type: 'station/setVFO', payload }),
  selectVFO: (state) => state?.vfo || {}
}))

// --- harness: a minimal store that applies the only two action kinds these paths
// dispatch (UI-state writes and VFO writes), so VFO round-trips like production.
function makeHarness (initialVFO) {
  const state = { ui: {}, vfo: { ...initialVFO } }
  const getState = () => state
  const dispatch = (action) => {
    if (typeof action === 'function') return action(dispatch, getState)
    if (action?.type === 'ui/setStateForComponentAndKey') {
      const { component, key, value } = action.payload
      state.ui[component] = state.ui[component] || {}
      state.ui[component][key] = value
    } else if (action?.type === 'station/setVFO') {
      const data = { ...action.payload }
      if (data.freq) data.band = bandForFrequency(data.freq)
      state.vfo = { ...state.vfo, ...data }
    }
    return action
  }
  return {
    dispatch,
    getState,
    vfo: () => state.vfo,
    currentQSO: () => state.ui.OpLoggingTab?.qso
  }
}

const OPERATION = { uuid: 'op-1', local: {} }

const URL_VFO = 'com.ham2k:///vfo?frequency=14285000&mode=SSB'
const URL_QSO = 'com.ham2k:///qso?their.call=K1ABC&their.refs=pota%3AUS-1234&frequency=7185000&mode=CW'

// Parse the URL the way DeepLinks.jsx does (inline `new URL` on the path),
// then build the suggested QSO from the resulting params.
function suggestedFromURL (url) {
  const [, rest] = url.split('://')
  const [hostname, ...restParts] = rest.split('/')
  const urlObject = new URL(`https://${hostname || 'default:1'}/${restParts.join('/')}`)
  const params = Object.fromEntries(urlObject.searchParams)
  return buildSuggestedQSO(params, url)
}

// Models the user logging the in-progress QSO: clear the form, then ask for the
// next QSO from the current VFO, exactly what LoggingPanel does after addQSOs().
function logCurrentAndAdvance (h) {
  const logged = h.currentQSO()
  h.dispatch({ type: 'ui/setStateForComponentAndKey', payload: { component: 'OpLoggingTab', key: 'qso', value: undefined } })
  h.dispatch(manageNextQSO({ qsos: [logged], operation: OPERATION, settings: {} }))
  return h.currentQSO()
}

// Mirror the app's steady state right after logging a contact: a blank new QSO
// is already showing, seeded from the current VFO. This blank is what a
// suggested QSO interrupts, and what must not be queued and restored.
function seedBlankQSO (h) {
  h.dispatch(manageNextQSO({ qsos: [], operation: OPERATION, settings: {} }))
}

describe('deep-linked frequency and mode (vfo link)', () => {
  it('applies the freq/mode to the in-progress QSO', () => {
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, settings: {} }))

    const qso = h.currentQSO()
    expect(qso.freq).toBe(14285) // 14285000 Hz / 1000
    expect(qso.mode).toBe('SSB')
    expect(qso.band).toBe('20m')
  })

  it('updates the VFO to the suggested freq/mode', () => {
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, settings: {} }))

    expect(h.vfo().freq).toBe(14285)
    expect(h.vfo().mode).toBe('SSB')
  })

  it('keeps the next QSO on the most recent freq/mode after logging', () => {
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    seedBlankQSO(h) // operator is sitting on a blank QSO at 7000 when the link arrives
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, settings: {} }))

    const next = logCurrentAndAdvance(h)
    expect(next.freq).toBe(14285)
    expect(next.mode).toBe('SSB')
    expect(next.band).toBe('20m')
  })

  it('carries the VFO forward to a new QSO when the VFO has been written', () => {
    // control: when the VFO IS written (as a manual freq edit does),
    // carry-forward works, isolating the VFO write as the load-bearing step
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    h.dispatch(setVFO({ freq: 14285, mode: 'SSB' })) // what editing the freq field dispatches

    h.dispatch(manageNextQSO({ qsos: [], operation: OPERATION, settings: {} }))
    const qso = h.currentQSO()
    expect(qso.freq).toBe(14285)
    expect(qso.mode).toBe('SSB')
    expect(qso.band).toBe('20m')
  })

  it('preserves an interrupted entry (with a call) across a deep link', () => {
    // if the operator had already started a contact, that entry must be
    // restored after the deep-linked QSO is logged; only empty blanks are dropped
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    seedBlankQSO(h)
    const started = { ...h.currentQSO(), their: { call: 'N0CALL' } } // operator typed a call
    h.dispatch({ type: 'ui/setStateForComponentAndKey', payload: { component: 'OpLoggingTab', key: 'qso', value: started } })

    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, settings: {} }))

    const next = logCurrentAndAdvance(h)
    expect(next.their?.call).toBe('N0CALL')
    expect(next.freq).toBe(7000)
  })
})

describe('deep-linked suggested QSO (qso link)', () => {
  it('applies the freq/mode and their.call to the in-progress QSO', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_QSO), qsos: [], operation: OPERATION, settings: {} }))

    const qso = h.currentQSO()
    expect(qso.freq).toBe(7185) // 7185000 Hz / 1000
    expect(qso.mode).toBe('CW')
    expect(qso.their.call).toBe('K1ABC')
  })

  it('keeps the next QSO on the suggested freq/mode after logging, without the call', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })
    seedBlankQSO(h) // blank QSO at 14250 showing before the link
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_QSO), qsos: [], operation: OPERATION, settings: {} }))

    const next = logCurrentAndAdvance(h)
    expect(next.freq).toBe(7185)
    expect(next.mode).toBe('CW')
    expect(next.band).toBe('40m')
    expect(next.their?.call).toBeUndefined()
  })
})

// A spot tap builds its own suggested QSO (OpSpotsTab.jsx), with no `_updatesVFO` flag: the
// operator is only considering the spot's contact, not reporting the radio's real state, so
// unlike a deep link it must NOT overwrite the VFO.
describe('spot-tap suggested QSO (does not update VFO)', () => {
  const spotQSO = () => ({
    their: { call: 'W1AW' },
    band: '40m',
    freq: 7185,
    mode: 'CW',
    refs: [],
    _suggestedKey: 'spot-1'
  })

  it('applies the freq/mode and their.call to the in-progress QSO', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: spotQSO(), qsos: [], operation: OPERATION, settings: {} }))

    const qso = h.currentQSO()
    expect(qso.freq).toBe(7185)
    expect(qso.mode).toBe('CW')
    expect(qso.their.call).toBe('W1AW')
  })

  it('does not update the VFO', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: spotQSO(), qsos: [], operation: OPERATION, settings: {} }))

    expect(h.vfo().freq).toBe(14250)
    expect(h.vfo().mode).toBe('SSB')
  })

  it('reverts the next QSO to the prior VFO freq/mode after logging, not the spot', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })
    seedBlankQSO(h) // blank QSO at 14250 showing before the spot tap
    h.dispatch(manageNextQSO({ suggestedQSO: spotQSO(), qsos: [], operation: OPERATION, settings: {} }))

    const next = logCurrentAndAdvance(h)
    expect(next.freq).toBe(14250)
    expect(next.mode).toBe('SSB')
    expect(next.band).toBe('20m')
  })

  it('carries the VFO power into the suggested QSO, without writing it back to the VFO', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB', power: 100 })
    h.dispatch(manageNextQSO({ suggestedQSO: spotQSO(), qsos: [], operation: OPERATION, settings: {} }))

    expect(h.currentQSO().power).toBe(100)
    expect(h.vfo().power).toBe(100) // unchanged, not overwritten with something else
  })

  it('falls back to the power already on screen when the VFO has none', () => {
    // Defends against a repeat of the bug where a spot tap wiped TxPowerControl:
    // even with no VFO power recorded yet, the currently-displayed power must
    // carry forward into the suggestion, not blank out.
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' }) // no power on the VFO
    h.dispatch({ type: 'ui/setStateForComponentAndKey', payload: { component: 'OpLoggingTab', key: 'qso', value: { power: 75 } } })

    h.dispatch(manageNextQSO({ suggestedQSO: spotQSO(), qsos: [], operation: OPERATION, settings: {} }))

    expect(h.currentQSO().power).toBe(75)
  })

  it('preserves an explicit power of 0 on the suggestion instead of overwriting it', () => {
    // power: 0 (e.g. a QRPp contact) is a real, meaningful value and must not
    // be treated the same as "no power set".
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB', power: 100 })

    h.dispatch(manageNextQSO({ suggestedQSO: { ...spotQSO(), power: 0 }, qsos: [], operation: OPERATION, settings: {} }))

    expect(h.currentQSO().power).toBe(0)
  })

  it('hands activity hooks the QSO that actually gets logged, not a discarded copy', () => {
    // Contest extensions attach exchange numbers by mutating the `qso` object their
    // prepareNewQSO hook receives; if that's a different object than what's returned,
    // the number silently never reaches the logged contact.
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })

    h.dispatch(manageNextQSO({ suggestedQSO: spotQSO(), qsos: [], operation: OPERATION, settings: {} }))

    expect(h.currentQSO()._touchedByActivity).toBe(true)
  })
})

// Selecting an existing, already-logged QSO for editing must show that QSO's own
// power (even if blank) rather than the VFO's, and must never write to the VFO —
// the operator revisiting an old contact isn't reporting the radio's current state.
describe('editing an existing logged QSO', () => {
  it('shows the QSO\'s own power, not the VFO\'s', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB', power: 100 })
    const logged = { uuid: 'qso-1', band: '40m', freq: 7185, mode: 'CW', power: 5 }

    h.dispatch(manageNextQSO({ selectedUUID: 'qso-1', qsos: [logged], operation: OPERATION, settings: {} }))

    expect(h.currentQSO().power).toBe(5)
    expect(h.vfo().power).toBe(100) // untouched
  })

  it('does not backfill power from the VFO when the logged QSO has none', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB', power: 100 })
    const logged = { uuid: 'qso-1', band: '40m', freq: 7185, mode: 'CW' } // no power ever recorded

    h.dispatch(manageNextQSO({ selectedUUID: 'qso-1', qsos: [logged], operation: OPERATION, settings: {} }))

    expect(h.currentQSO().power).toBeUndefined()
    expect(h.vfo().power).toBe(100) // untouched
  })
})

// Band and mode cannot be recovered once a QSO is logged, so the app flags a QSO
// that is missing either one. What counts as "missing" depends on whose radio
// data applies: a QSO still being entered borrows the VFO's, but one already in
// the log must stand on its own, or the flag would be silenced by the radio's
// current state rather than by the operator fixing the record.
describe('radioValuesFor', () => {
  const vfo = { band: '20m', freq: 14074000, mode: 'FT8' }

  it('lets a new QSO borrow whatever the radio is set to', () => {
    expect(radioValuesFor({ qso: { _isNew: true }, vfo })).toEqual(vfo)
  })

  it('prefers what the operator typed over the radio', () => {
    const qso = { _isNew: true, band: '40m', freq: 7032000, mode: 'CW' }
    expect(radioValuesFor({ qso, vfo })).toEqual({ band: '40m', freq: 7032000, mode: 'CW' })
  })

  it('borrows the radio between QSOs, so the panel does not complain about a QSO that does not exist yet', () => {
    expect(radioValuesFor({ qso: undefined, vfo })).toEqual(vfo)
  })

  it('reports a logged QSO as missing what it is actually missing, whatever the radio says now', () => {
    expect(radioValuesFor({ qso: { band: '40m' }, vfo })).toEqual({ band: '40m', freq: undefined, mode: undefined })
  })

  it('gives an event the radio state, since events carry no radio data of their own', () => {
    expect(radioValuesFor({ qso: { event: { event: 'note' }, band: 'event' }, vfo })).toEqual(vfo)
  })
})
