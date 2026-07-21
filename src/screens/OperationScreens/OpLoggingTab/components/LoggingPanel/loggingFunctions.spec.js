// Copyright ©️ 2026 Jeff Kowalski <jeff.kowalski@gmail.com>
// SPDX-License-Identifier: MPL-2.0

// A deep-linked suggested QSO carries an authoritative freq/mode. These tests
// cover how it interacts with the logging flow: the freq/mode must become the
// VFO ("last known good") so the next QSO keeps them after logging, an
// unstarted blank QSO must not be queued and restored (which would revert the
// freq/mode), and an interrupted manual entry must be preserved.

import { manageNextQSO } from './loggingFunctions'
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
    // Activities carry no `prepareNewQSO`, so the QSO-prep hooks are inert here.
    const hooks = [
      { key: 'sota', activationType: 'sotaActivation', huntingType: 'sota' },
      { key: 'pota', activationType: 'potaActivation', huntingType: 'pota' }
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
// recompute band from freq).
jest.mock('../../../../../store/station/stationSlice', () => ({
  setVFO: (payload) => ({ type: 'station/setVFO', payload })
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
  h.dispatch(manageNextQSO({ qsos: [logged], operation: OPERATION, vfo: h.vfo(), settings: {} }))
  return h.currentQSO()
}

// Mirror the app's steady state right after logging a contact: a blank new QSO
// is already showing, seeded from the current VFO. This blank is what a
// suggested QSO interrupts, and what must not be queued and restored.
function seedBlankQSO (h) {
  h.dispatch(manageNextQSO({ qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))
}

describe('deep-linked frequency and mode (vfo link)', () => {
  it('applies the freq/mode to the in-progress QSO', () => {
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))

    const qso = h.currentQSO()
    expect(qso.freq).toBe(14285) // 14285000 Hz / 1000
    expect(qso.mode).toBe('SSB')
    expect(qso.band).toBe('20m')
  })

  it('updates the VFO to the suggested freq/mode', () => {
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))

    expect(h.vfo().freq).toBe(14285)
    expect(h.vfo().mode).toBe('SSB')
  })

  it('keeps the next QSO on the most recent freq/mode after logging', () => {
    const h = makeHarness({ band: '40m', freq: 7000, mode: 'SSB' })
    seedBlankQSO(h) // operator is sitting on a blank QSO at 7000 when the link arrives
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))

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

    h.dispatch(manageNextQSO({ qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))
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

    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_VFO), qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))

    const next = logCurrentAndAdvance(h)
    expect(next.their?.call).toBe('N0CALL')
    expect(next.freq).toBe(7000)
  })
})

describe('deep-linked suggested QSO (qso link)', () => {
  it('applies the freq/mode and their.call to the in-progress QSO', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_QSO), qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))

    const qso = h.currentQSO()
    expect(qso.freq).toBe(7185) // 7185000 Hz / 1000
    expect(qso.mode).toBe('CW')
    expect(qso.their.call).toBe('K1ABC')
  })

  it('keeps the next QSO on the suggested freq/mode after logging, without the call', () => {
    const h = makeHarness({ band: '20m', freq: 14250, mode: 'SSB' })
    seedBlankQSO(h) // blank QSO at 14250 showing before the link
    h.dispatch(manageNextQSO({ suggestedQSO: suggestedFromURL(URL_QSO), qsos: [], operation: OPERATION, vfo: h.vfo(), settings: {} }))

    const next = logCurrentAndAdvance(h)
    expect(next.freq).toBe(7185)
    expect(next.mode).toBe('CW')
    expect(next.band).toBe('40m')
    expect(next.their?.call).toBeUndefined()
  })
})
