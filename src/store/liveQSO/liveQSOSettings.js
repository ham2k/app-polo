/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { findBestHook, findHooks } from '../../extensions/registry'

export const DEFAULT_LIVE_QSO_HTTP_URL = ''
export const DEFAULT_LIVE_QSO_EXPORTER = 'full-adif'

export function liveQSOExporterValueForOption ({ option, handler }) {
  return option?.exportType || handler?.key
}

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
    exporter: liveQSOSettings.exporter || DEFAULT_LIVE_QSO_EXPORTER,
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

export function liveQSOExporterOptions ({ settings, t = (_key, defaultValue) => defaultValue }) {
  const optionsByValue = new Map()

  const addOption = ({ value, label, priority = 0 }) => {
    if (!value || !label) return

    const existing = optionsByValue.get(value)
    if (!existing || priority > existing.priority) {
      optionsByValue.set(value, { value, label, priority })
    }
  }

  const collectOption = ({ option, label, priority = 0 }) => {
    if (option?.format !== 'adif') return
    const value = liveQSOExporterValueForOption({ option, handler: option?.handler })
    addOption({
      value,
      label: option.exportName || label || value,
      priority
    })
  }

  addOption({
    value: DEFAULT_LIVE_QSO_EXPORTER,
    label: t('screens.liveQSOHTTPSettings.exporter.options.fullADIF', 'Full ADIF Export'),
    priority: 1000
  })

  findHooks('activity').forEach((hook) => {
    const sampleOperations = hook.sampleOperations?.({ t, settings }) || []

    sampleOperations.forEach((operation) => {
      ;(operation?.refs || []).filter((ref) => ref?.type).forEach((ref) => {
        const refHook = findBestHook(`ref:${ref.type}`, { withFunction: 'suggestExportOptions' })
        if (!refHook?.suggestExportOptions) return

        const options = refHook.suggestExportOptions({ t, operation, qsos: operation.qsos, ref, settings }) || []
        options.forEach((option) => {
          collectOption({
            option: { ...option, handler: refHook },
            label: refHook.shortName || refHook.name || liveQSOExporterValueForOption({ option, handler: refHook })
          })
        })
      })
    })
  })

  findHooks('export', { withFunction: 'suggestExportOptions' }).forEach((hook) => {
    const sampleOperations = hook.sampleOperations?.({ t, settings }) || [{}]

    sampleOperations.forEach((operation) => {
      const options = hook.suggestExportOptions({ t, operation, qsos: operation.qsos, settings }) || []
      options.forEach((option) => {
        collectOption({
          option: { ...option, handler: hook },
          label: hook.shortName || hook.name || liveQSOExporterValueForOption({ option, handler: hook }),
          priority: option.exportType === DEFAULT_LIVE_QSO_EXPORTER ? 1000 : 0
        })
      })
    })
  })

  return Array.from(optionsByValue.values())
    .sort((a, b) => (b.priority - a.priority) || a.label.localeCompare(b.label))
    .map(({ value, label }) => ({ value, label }))
}
