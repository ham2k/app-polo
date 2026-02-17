/*
 * Copyright ©️ 2026 Jeff Kowalski <jeff.KC6X@gmail.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { fetchWithTimeout } from '../../../tools/fetchWithTimeout'

const CAT_TIMEOUT = 5000

/**
 * Set the SOTAcat radio frequency.
 * @param {string} catAddress - Base URL of the SOTAcat device (e.g., "http://sotacat.local")
 * @param {number} freqKHz - Frequency in kHz (app internal format)
 * @returns {{ success: boolean, error?: string }}
 */
export async function setFrequency (catAddress, freqKHz) {
  const freqHz = Math.round(freqKHz * 1000)
  try {
    const response = await fetchWithTimeout(
      `${catAddress}/api/v1/frequency?frequency=${freqHz}`,
      { method: 'PUT', timeout: CAT_TIMEOUT }
    )
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Set the SOTAcat radio mode.
 * @param {string} catAddress - Base URL of the SOTAcat device
 * @param {string} mode - Mode string (e.g., "CW", "SSB", "FM", "USB", "LSB")
 * @returns {{ success: boolean, error?: string }}
 */
export async function setMode (catAddress, mode) {
  try {
    const response = await fetchWithTimeout(
      `${catAddress}/api/v1/mode?mode=${encodeURIComponent(mode)}`,
      { method: 'PUT', timeout: CAT_TIMEOUT }
    )
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Tune the SOTAcat radio to a given frequency and mode.
 * Sets frequency first, then mode (matching SOTAcat's own chase.js pattern).
 * @param {string} catAddress - Base URL of the SOTAcat device
 * @param {number} freqKHz - Frequency in kHz
 * @param {string} mode - Mode string
 * @returns {{ success: boolean, error?: string }}
 */
export async function tuneRadio (catAddress, freqKHz, mode) {
  if (freqKHz) {
    const freqResult = await setFrequency(catAddress, freqKHz)
    if (!freqResult.success) {
      return freqResult
    }
  }

  if (mode) {
    const modeResult = await setMode(catAddress, mode)
    if (!modeResult.success) {
      return modeResult
    }
  }

  return { success: true }
}
