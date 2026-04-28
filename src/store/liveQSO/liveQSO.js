/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../../package.json'

import { qsonToADIF } from '../../tools/qsonToADIF'
import { dataExportOptions, selectOperation, selectOperationCallInfo } from '../operations'
import { selectSettings } from '../settings'
import { sendUDPMessage } from './liveQSOUDPNative'
import { LIVE_QSO_UDP_MESSAGE_FORMATS, selectLiveQSOHTTPSettings, selectLiveQSOUDPSettings } from './liveQSOSettings'

const queue = []
let processing = false

function buildRequestVariants ({ baseRequest, httpSettings }) {
  const bodies = adifBodiesForRequest(baseRequest.body, httpSettings)
  return bodies.map((body) => ({ ...baseRequest, body }))
}

function buildLiveQSOExports ({ action, operation, qso, settings, ourInfo }) {
  const qsoForExport = action === 'delete' ? { ...qso, deleted: false } : qso
  const exportOptions = dataExportOptions({ operation, qsos: [qsoForExport], settings, ourInfo })
    .filter((option) => option?.format === 'adif')

  const selectedOptions = selectExportOptions({ exportOptions })

  if (selectedOptions.length === 0) {
    return []
  }

  return selectedOptions.map((option) => ({
    exportType: option.exportType ?? option.handler?.key ?? 'live-qso',
    body: qsonToADIF({
      operation: { ...operation, ...(option.exportData || {}) },
      qsos: [qsoForExport],
      settings,
      format: option.format,
      ...option
    })
  })).filter((entry) => entry.body?.includes('<EOR>'))
}

function buildLiveQSORequests ({ exports, httpSettings, method }) {
  return exports.map((entry) => {
    return buildRequestVariants({
      httpSettings,
      baseRequest: {
        url: httpSettings.url,
        method,
        exportType: entry.exportType,
        body: entry.body
      }
    })
  }).flat()
}

function buildLiveQSOUDPDatagrams ({ exports, udpSettings }) {
  return exports.map((entry) => {
    return adifDatagramsForExport(entry.body, udpSettings).map((payload) => ({
      url: udpSettings.url,
      payload
    }))
  }).flat()
}

function selectExportOptions ({ exportOptions }) {
  return exportOptions.filter((option) => {
    return option?.exportType === 'full-adif' || option?.handler?.key === 'core-adif'
  })
}

async function postLiveQSORequest (request) {
  const response = await fetch(request.url, {
    method: request.method ?? 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'User-Agent': `Ham2K-PoLo/${packageJson.version}`,
      'X-Ham2K-Export-Type': request.exportType ?? 'live-qso'
    },
    body: request.body
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Live QSO request failed: ${response.status} ${response.statusText} ${text}`.trim())
  }
}

async function postLiveQSOUDPDatagram (datagram) {
  await sendUDPMessage({
    url: datagram.url,
    payload: datagram.payload,
    broadcast: false
  })
}

async function processQueue () {
  if (processing) return
  processing = true

  while (queue.length > 0) {
    const work = queue.shift()

    try {
      const state = work.getState()
      const settings = selectSettings(state)
      const httpSettings = selectLiveQSOHTTPSettings(settings)
      const udpSettings = selectLiveQSOUDPSettings(settings)
      const operation = selectOperation(state, work.uuid)
      const ourInfo = selectOperationCallInfo(state, work.uuid)
      const exports = buildLiveQSOExports({
        action: work.action,
        operation,
        qso: work.qso,
        settings,
        ourInfo
      })

      if (exports.length === 0) continue

      const method = methodForAction(work.action, httpSettings)
      if (method) {
        const requests = buildLiveQSORequests({
          exports,
          httpSettings,
          method
        })

        for (const request of requests) {
          await postLiveQSORequest(request)
        }
      }

      if (udpEnabledForAction(work.action, udpSettings)) {
        const datagrams = buildLiveQSOUDPDatagrams({
          exports,
          udpSettings
        })

        for (const datagram of datagrams) {
          await postLiveQSOUDPDatagram(datagram)
        }
      }
    } catch (error) {
      console.error('[LiveQSO] Error sending QSO', error)
    }

    await new Promise(resolve => setTimeout(resolve, 0))
  }

  processing = false
}

function methodForAction (action, httpSettings) {
  if (!httpSettings?.enabled || !httpSettings?.url) return undefined
  if (action === 'create') return 'POST'
  if (action === 'update' && httpSettings.sendEdits) return 'PUT'
  if (action === 'delete' && httpSettings.sendDeletes) return 'DELETE'
  return undefined
}

function udpEnabledForAction (action, udpSettings) {
  if (!udpSettings?.enabled || !udpSettings?.url) return false
  return action === 'create'
}

function adifBodiesForRequest (body, httpSettings) {
  const { header, records } = splitADIFBody(body)
  if (records.length === 0) return body ? [body] : []

  const formattedRecords = records.map((record) => `${record}\n`)
  if (!httpSettings.individualRequests) {
    if (httpSettings.sendADIFHeader) {
      return [body]
    } else {
      return [formattedRecords.join('')]
    }
  }

  const prefix = httpSettings.sendADIFHeader ? header : ''
  return formattedRecords.map((record) => `${prefix}${record}`)
}

function splitADIFBody (body) {
  const adif = `${body ?? ''}`
  const parts = adif.split(/<EOH>\s*/i)

  if (parts.length < 2) {
    return {
      header: '',
      records: adif.trim() ? [adif.trim()] : []
    }
  }

  const header = `${parts[0]}<EOH>\n`
  const recordsPart = parts.slice(1).join('')
  const records = recordsPart
    .split(/<EOR>\s*/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${part} <EOR>`)

  return { header, records }
}

function adifDatagramsForExport (body, udpSettings) {
  const { header, records } = splitADIFBody(body)
  if (records.length === 0) return body ? [body] : []

  return records.map((record) => {
    if (udpSettings.messageFormat === LIVE_QSO_UDP_MESSAGE_FORMATS.wsjtxCompatible) {
      // FIXME: wrap this single-record ADIF payload in a WSJT-X compatible UDP packet.
      return `${header}${record}\n`
    }

    return `${header}${record}\n`
  })
}

export function enqueueLiveQSOPosts ({ getState, uuid, qsos, action = 'create' }) {
  const activeQSOs = (qsos || []).filter((qso) => {
    if (!qso || qso.event) return false
    if (action === 'delete') return qso.deleted
    return !qso.deleted
  })
  activeQSOs.forEach((qso) => {
    queue.push({ getState, uuid, qso, action })
  })

  if (activeQSOs.length > 0) {
    setTimeout(() => {
      processQueue()
    }, 0)
  }
}
