// Copyright ©️ 2026 Jeff Kowalski <jeff.kowalski@gmail.com>
// SPDX-License-Identifier: MPL-2.0

// Pure helpers for Ham2K deep links, kept apart from the headless component in
// `DeepLinks.jsx` so they can be unit-tested without the React Native harness.

import { bandForFrequency } from '@ham2k/lib-operation-data'

import { findHooks } from '../extensions/registry'

const DEBUG = false

/**
 * Build a suggested QSO from deep-link parameters: the station being worked
 * (`their.call`), its hunted references (`their.refs`), and frequency/mode.
 */
export function buildSuggestedQSO (params, url) {
  let freq
  if (params.freq) {
    freq = Number(params.freq)
  } else if (params.frequency) {
    freq = Number(params.frequency) / 1000
  }
  const band = freq ? bandForFrequency(freq) : params.band

  const qso = {
    uuid: 'suggested-qso',
    their: {},
    band,
    freq,
    mode: params.mode?.toUpperCase(),
    startAtMillis: params.startAtMillis ? Number(params.startAtMillis) : undefined,
    _suggestedKey: url
  }

  if (params['their.call']) qso.their.call = params['their.call'].toUpperCase()

  // their.refs: hunted references, placed on the QSO, mapped from the
  // activity key (e.g. `pota`) to its hunting type.
  const theirRefs = parseRefs(params['their.refs'])
  if (theirRefs?.length) {
    qso.refs = theirRefs.map(({ type, ref }) => ({ type: huntingTypeForKey(type) ?? type, ref }))
  }

  return qso
}

export function activationTypeForKey (key) {
  return findHooks('activity', { key })[0]?.activationType
}

export function huntingTypeForKey (key) {
  return findHooks('activity', { key })[0]?.huntingType
}

/**
 * Parse a comma-separated list of `type:ref` pairs into `[{ type, ref }]`.
 * Types are matched against the activity registry; unknown types are skipped.
 * Returns `undefined` when the string is empty or yields no valid pairs.
 */
export function parseRefs (refsString) {
  if (!refsString) return undefined

  const refs = []
  refsString.split(',').map(r => r.trim()).filter(r => r).forEach(part => {
    const colon = part.indexOf(':')
    if (colon < 1) return
    const type = part.slice(0, colon).toLowerCase()
    const ref = part.slice(colon + 1)
    if (!ref) return
    if (!activationTypeForKey(type)) {
      if (DEBUG) console.log('[DeepLink] skipping unknown ref type:', type)
      return
    }
    refs.push({ type, ref })
  })

  return refs.length ? refs : undefined
}
