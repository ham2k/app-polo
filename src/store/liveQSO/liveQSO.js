/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../../package.json'

import { fmtADIFDate, fmtADIFTime } from '../../tools/timeFormats'
import { qsonToADIF } from '../../tools/qsonToADIF'
import { dataExportOptions, selectOperation, selectOperationCallInfo } from '../operations'
import { selectSettings } from '../settings'
import {
  buildN1MMContactDeleteXMLForQSO,
  buildN1MMContactInfoXMLForQSO,
  buildN1MMContactReplaceXMLForQSO,
  sendLiveQSON1MMPacket
} from './liveQSON1MMMessage'
import { sendUDPMessage, sendWSJTXLoggedADIFMessage } from './liveQSOUDPNative'
import { LIVE_QSO_UDP_MESSAGE_FORMATS, selectLiveQSOHTTPSettings, selectLiveQSON1MMSettings, selectLiveQSOUDPSettings } from './liveQSOSettings'
import { WSJTXLoggedADIFMessage } from './liveQSOWSJTXMessage'

const queue = []
let processing = false
const WSJTX_MAGIC_NUMBER = 0xadbccbda
const WSJTX_SCHEMA_NUMBER = 3
const WSJTX_LOGGED_ADIF_TYPE = 12
const WSJTX_SENDER_ID = `Ham2K-PoLo/${packageJson.version}`

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
    return adifDatagramsForExport(entry, udpSettings).map((payload) => ({
      url: udpSettings.url,
      ...payload
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
  if (datagram.wsjtxMessage) {
    await sendWSJTXLoggedADIFMessage({
      url: datagram.url,
      message: datagram.wsjtxMessage,
      broadcast: false
    })
    return
  }

  await sendUDPMessage({
    url: datagram.url,
    payload: datagram.payload,
    broadcast: false
  })
}

async function runLiveQSOTask (label, task) {
  try {
    await task()
  } catch (error) {
    console.error(`[LiveQSO] ${label}`, error)
  }
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
      const n1mmSettings = selectLiveQSON1MMSettings(settings)
      const operation = selectOperation(state, work.uuid)
      const ourInfo = selectOperationCallInfo(state, work.uuid)
      const method = methodForAction(work.action, httpSettings)
      const shouldSendN1MM = n1mmEnabledForAction(work.action, n1mmSettings)
      const shouldBuildADIFExports = !!method || udpEnabledForAction(work.action, udpSettings)
      const exports = shouldBuildADIFExports
        ? buildLiveQSOExports({
          action: work.action,
          operation,
          qso: work.qso,
          settings,
          ourInfo
        })
        : []

      if (shouldBuildADIFExports && exports.length === 0 && !shouldSendN1MM) continue

      if (method) {
        await runLiveQSOTask(`HTTP ${method} failed`, async () => {
          const requests = buildLiveQSORequests({
            exports,
            httpSettings,
            method
          })

          for (const request of requests) {
            await postLiveQSORequest(request)
          }
        })
      }

      if (udpEnabledForAction(work.action, udpSettings)) {
        await runLiveQSOTask('UDP ADIF send failed', async () => {
          const datagrams = buildLiveQSOUDPDatagrams({
            exports,
            udpSettings
          })

          for (const datagram of datagrams) {
            await postLiveQSOUDPDatagram(datagram)
          }
        })
      }

      if (shouldSendN1MM) {
        await runLiveQSOTask('N1MM send failed', async () => {
          const n1mmPayload = buildLiveQSON1MMPayload({
            action: work.action,
            qso: work.qso,
            operation,
            previousQSO: work.liveQSOContext?.previousQSO,
            n1mmSettings
          })

          if (!n1mmPayload) return

          await sendLiveQSON1MMPacket({
            settings: n1mmSettings,
            payload: n1mmPayload
          })
        })
      }
    } catch (error) {
      console.error('[LiveQSO] Error preparing QSO send', error)
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

function n1mmEnabledForAction (action, n1mmSettings) {
  if (!n1mmSettings?.enabled || !n1mmSettings?.url) return false
  if (action === 'create') return true
  if (action === 'update' && n1mmSettings.sendEdits) return true
  if (action === 'delete' && n1mmSettings.sendDeletes) return true
  return false
}

function buildLiveQSON1MMPayload ({ action, qso, operation, previousQSO, n1mmSettings }) {
  const options = {
    qso,
    operation,
    previousQSO,
    skipEmptyFields: n1mmSettings.skipEmptyFields !== false
  }

  if (action === 'create') {
    return buildN1MMContactInfoXMLForQSO(options)
  }

  if (action === 'update') {
    return buildN1MMContactReplaceXMLForQSO(options)
  }

  if (action === 'delete') {
    return buildN1MMContactDeleteXMLForQSO(options)
  }

  return undefined
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

function adifDatagramsForExport (entry, udpSettings) {
  const { body } = entry
  const { header, records } = splitADIFBody(body)
  if (records.length === 0) {
    return body ? [{ payload: body }] : []
  }

  return records.map((record) => {
    const adifText = `${header}${record}\n`
    if (udpSettings.messageFormat === LIVE_QSO_UDP_MESSAGE_FORMATS.wsjtxCompatible) {
      return {
        wsjtxMessage: new WSJTXLoggedADIFMessage({
          magicNumber: WSJTX_MAGIC_NUMBER,
          schemaNumber: WSJTX_SCHEMA_NUMBER,
          messageType: WSJTX_LOGGED_ADIF_TYPE,
          senderId: WSJTX_SENDER_ID,
          adifText
        })
      }
    }

    return {
      payload: adifText
    }
  })
}

export function buildLiveQSOTestADIF (date = new Date()) {
  return [
    'ADIF test from Ham2K PoLo',
    '<ADIF_VER:5>3.1.5',
    '<PROGRAMID:21>Ham2K Portable Logger',
    `<PROGRAMVERSION:${packageJson.version.length}>${packageJson.version}`,
    '<EOH>',
    `<CALL:6>N0CALL <MODE:2>CW <BAND:3>20m <FREQ:9>14.069000 <QSO_DATE:8>${fmtADIFDate(date)} <TIME_ON:6>${fmtADIFTime(date)} <EOR>`
  ].join('\n')
}

export async function sendLiveQSOHTTPTest ({ settings, date = new Date() }) {
  const response = await fetch(settings?.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'User-Agent': `Ham2K-PoLo/${packageJson.version}`,
      'X-Ham2K-Export-Type': 'full-adif'
    },
    body: buildLiveQSOTestADIF(date)
  })

  return {
    ok: response.ok,
    status: response.status
  }
}

export async function sendLiveQSOUDPTest ({ settings, date = new Date() }) {
  const datagrams = adifDatagramsForExport({
    exportType: 'full-adif',
    body: buildLiveQSOTestADIF(date)
  }, settings)

  for (const datagram of datagrams) {
    await postLiveQSOUDPDatagram({
      url: settings?.url,
      ...datagram
    })
  }
}

export function enqueueLiveQSOPosts ({ getState, uuid, qsos, action = 'create', liveQSOContext }) {
  const activeQSOs = (qsos || []).filter((qso) => {
    if (!qso || qso.event) return false
    if (action === 'delete') return qso.deleted
    return !qso.deleted
  })
  activeQSOs.forEach((qso) => {
    queue.push({
      getState,
      uuid,
      qso,
      action,
      liveQSOContext: qso.uuid === liveQSOContext?.previousQSO?.uuid ? liveQSOContext : undefined
    })
  })

  if (activeQSOs.length > 0) {
    setTimeout(() => {
      processQueue()
    }, 0)
  }
}
