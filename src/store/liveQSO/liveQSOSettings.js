/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export const DEFAULT_LIVE_QSO_HTTP_URL = ''

export function normalizeLiveQSOURL (url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed
  return `http://${trimmed}`
}

export function selectLiveQSOHTTPSettings (settings) {
  const liveQSOSettings = settings?.liveQSO?.http || {}

  return {
    enabled: liveQSOSettings.enabled === true,
    url: normalizeLiveQSOURL(liveQSOSettings.url || DEFAULT_LIVE_QSO_HTTP_URL),
    individualRequests: liveQSOSettings.individualRequests === true,
    sendADIFHeader: liveQSOSettings.sendADIFHeader !== false,
    sendEdits: liveQSOSettings.sendEdits === true
  }
}

export function summarizeLiveQSOURL (url, options = {}) {
  const { empty = 'No URL configured', maxLength = 42 } = options
  const normalized = normalizeLiveQSOURL(url)

  if (!normalized) return empty
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}
