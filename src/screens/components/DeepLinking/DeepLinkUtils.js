/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025-2026 Jeff Kowalski <jeff.KC6X@gmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'
import { findHooks } from '../../../extensions/registry'

export const URL_SCHEME = 'com.ham2k.polo://'

export function activationTypeForKey (key) {
  const hook = findHooks('activity').find(h => h.key === key)
  return hook?.activationType
}

export function huntingTypeForKey (key) {
  const hook = findHooks('activity').find(h => h.key === key)
  return hook?.huntingType
}

/**
 * Parse a comma-separated refs string (e.g. "sota:W6/CT-006,pota:US-1234")
 * into an array of { type, ref } objects. Validates each type against findHooks('activity').
 * Returns undefined if the string is empty or all entries are invalid.
 */
function parseRefs (refsStr) {
  if (!refsStr) return undefined

  const refs = []
  for (const pair of refsStr.split(',')) {
    const colonIndex = pair.indexOf(':')
    if (colonIndex < 1) continue

    const type = pair.slice(0, colonIndex).toLowerCase()
    const ref = pair.slice(colonIndex + 1)
    if (!ref) continue

    if (!activationTypeForKey(type)) {
      console.log('[DeepLink] Unknown ref type:', type)
      return null // invalid type → reject entire URL
    }
    refs.push({ type, ref })
  }

  return refs.length > 0 ? refs : undefined
}

/**
 * Parse a deep link URL and extract parameters
 */
export function parseDeepLinkURL (url) {
  if (!url.startsWith(URL_SCHEME)) return null

  try {
    // URL format: com.ham2k.polo://qso?params...
    const urlPath = url.slice(URL_SCHEME.length)
    const [, queryString] = urlPath.split('?')

    if (!queryString) return null

    const params = new URLSearchParams(queryString)

    const ourRefs = parseRefs(params.get('our.refs'))
    const theirRefs = parseRefs(params.get('their.refs'))

    // parseRefs returns null on invalid type (reject URL)
    if (ourRefs === null || theirRefs === null) return null

    // Need at least one ref set
    if (!ourRefs && !theirRefs) {
      console.log('[DeepLink] No valid ref pair provided')
      return null
    }

    return {
      ourRefs,
      theirRefs,
      freq: parseFrequency(params.get('frequency')),
      mode: params.get('mode')?.toUpperCase() || undefined,
      startAtMillis: params.get('startAtMillis') ? parseInt(params.get('startAtMillis'), 10) : undefined,
      ourCall: params.get('our.call')?.toUpperCase() || undefined,
      theirCall: params.get('their.call')?.toUpperCase() || undefined,
      returnpath: parseReturnpath(params.get('returnpath'))
    }
  } catch (e) {
    console.error('[DeepLink] Error parsing URL:', e)
    return null
  }
}

/**
 * Parse returnpath parameter — the base URL of the CAT device (e.g., "http://sotacat.local/").
 * Validates that it contains a protocol, and strips any trailing path to keep just the origin.
 */
function parseReturnpath (returnpathStr) {
  if (!returnpathStr) return undefined
  if (!returnpathStr.includes('://')) return undefined

  try {
    const url = new URL(returnpathStr)
    return url.origin
  } catch {
    return undefined
  }
}

/**
 * Parse frequency from string (Hz) and convert to kHz for internal storage.
 * SOTAcat and other deep-link sources send frequency in Hz (e.g., 7245000 for 7.245 MHz).
 * The app stores frequency in kHz internally.
 */
function parseFrequency (freqStr) {
  if (!freqStr) return undefined
  const hz = parseInt(freqStr, 10)
  return isNaN(hz) ? undefined : hz / 1000
}

/**
 * Build a suggested QSO object with a unique key for triggering the pre-fill flow
 */
export function buildSuggestedQSO ({ theirRefs, freq, mode, startAtMillis, ourCall, theirCall }) {
  const qso = {
    _suggestedKey: `deeplink-${Date.now()}`,
    their: {},
    our: {}
  }

  if (theirCall) {
    qso.their.call = theirCall
  }

  if (ourCall) {
    qso.our.call = ourCall
  }

  if (freq) {
    qso.freq = freq
    qso.band = bandForFrequency(freq)
    if (!mode) {
      // Derive mode from frequency if not provided
      qso.mode = modeForFrequency(freq)
    }
  }

  if (mode) {
    qso.mode = mode
  }

  if (startAtMillis) {
    qso.startAtMillis = startAtMillis
  }

  // Add their refs for chasing/hunting (the station being worked has these refs)
  // Use hunting type (e.g., 'pota') not activation type (e.g., 'potaActivation')
  if (theirRefs?.length > 0) {
    qso.refs = theirRefs.map(({ type, ref }) => ({
      type: huntingTypeForKey(type),
      ref
    }))
  }

  return qso
}
