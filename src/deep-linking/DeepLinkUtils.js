/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { bandForFrequency, modeForFrequency } from '@ham2k/lib-operation-data'

export const URL_SCHEME = 'com.ham2k.polo://'

// Map URL type/sig param to operation activation type (for myRef - what YOU are activating)
export const TYPE_TO_ACTIVATION = {
  sota: 'sotaActivation',
  pota: 'potaActivation',
  wwff: 'wwffActivation',
  gma: 'gmaActivation',
  wca: 'wcaActivation',
  zlota: 'zlotaActivation'
  // iota: 'iotaActivation', // IOTA not yet supported in Polo
}

// Map URL type/sig param to QSO hunting type (for theirRef - what THEY have that you're chasing)
export const TYPE_TO_HUNTING = {
  sota: 'sota',
  pota: 'pota',
  wwff: 'wwff',
  gma: 'gma',
  wca: 'wca',
  zlota: 'zlota'
}

/**
 * Parse a deep link URL and extract parameters
 */
export function parseDeepLinkURL (url) {
  if (!url.startsWith(URL_SCHEME)) return null

  try {
    // URL format: com.ham2k.polo://qso?params...
    // We need to convert this to a parseable format
    const urlPath = url.slice(URL_SCHEME.length)
    const [, queryString] = urlPath.split('?')

    if (!queryString) return null

    const params = new URLSearchParams(queryString)

    const myRef = params.get('myRef') || undefined
    const mySig = params.get('mySig')?.toLowerCase() || undefined
    const theirRef = params.get('theirRef') || undefined
    const theirSig = params.get('theirSig')?.toLowerCase() || undefined

    // Need at least one complete ref pair
    const hasMyRef = myRef && mySig
    const hasTheirRef = theirRef && theirSig

    if (!hasMyRef && !hasTheirRef) {
      console.log('[DeepLink] No valid ref pair provided')
      return null
    }

    // Validate mySig if provided
    if (mySig && !TYPE_TO_ACTIVATION[mySig]) {
      console.log('[DeepLink] Unknown mySig:', mySig)
      return null
    }

    // Validate theirSig if provided
    if (theirSig && !TYPE_TO_ACTIVATION[theirSig]) {
      console.log('[DeepLink] Unknown theirSig:', theirSig)
      return null
    }

    return {
      myRef,
      mySig,
      theirRef,
      theirSig,
      freq: parseFrequency(params.get('freq')),
      mode: params.get('mode')?.toUpperCase() || undefined,
      time: params.get('time') ? parseInt(params.get('time'), 10) : undefined,
      myCall: params.get('myCall')?.toUpperCase() || undefined,
      theirCall: params.get('theirCall')?.toUpperCase() || undefined
    }
  } catch (e) {
    console.error('[DeepLink] Error parsing URL:', e)
    return null
  }
}

/**
 * Parse frequency from string (Hz)
 */
function parseFrequency (freqStr) {
  if (!freqStr) return undefined
  const hz = parseInt(freqStr, 10)
  return isNaN(hz) ? undefined : hz
}

/**
 * Build a suggested QSO object with a unique key for triggering the pre-fill flow
 */
export function buildSuggestedQSO ({ theirRef, theirSig, freq, mode, time, myCall, theirCall }) {
  const qso = {
    _suggestedKey: `deeplink-${Date.now()}`,
    their: {},
    our: {}
  }

  if (theirCall) {
    qso.their.call = theirCall
  }

  if (myCall) {
    qso.our.call = myCall
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

  if (time) {
    qso.startAtMillis = time
  }

  // Add their ref for chasing/hunting (the station being worked has this ref)
  // Use hunting type (e.g., 'pota') not activation type (e.g., 'potaActivation')
  if (theirRef && theirSig) {
    const theirHuntingType = TYPE_TO_HUNTING[theirSig]
    qso.refs = [{ type: theirHuntingType, ref: theirRef }]
  }

  return qso
}
