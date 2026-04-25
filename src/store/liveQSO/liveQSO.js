/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * and Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../../package.json'

import { qsonToADIF } from '../../tools/qsonToADIF'
import { dataExportOptions, selectOperation, selectOperationCallInfo } from '../operations'
import { selectSettings } from '../settings'

const TEST_PUSH_URL = 'http://example.org/'

const queue = []
let processing = false

function buildGenericADIFPayload ({ operation, qso, settings }) {
  return {
    url: TEST_PUSH_URL,
    exportType: 'live-qso-generic',
    body: qsonToADIF({
      operation,
      qsos: [qso],
      settings,
      handler: { key: 'live-qso' },
      format: 'adif',
      exportType: 'live-qso',
      includeOtherRefs: true,
      combineSegmentRefs: true
    })
  }
}

function buildLiveQSORequests ({ operation, qso, settings, ourInfo }) {
  const exportOptions = dataExportOptions({ operation, qsos: [qso], settings, ourInfo })
    .filter((option) => option?.format === 'adif')

  const refAwareOptions = exportOptions.filter((option) => option?.handler?.key !== 'core-adif')
  const selectedOptions = refAwareOptions.length > 0 ? refAwareOptions : []

  if (selectedOptions.length === 0) {
    return [buildGenericADIFPayload({ operation, qso, settings })]
  }

  return selectedOptions.map((option) => {
    return {
      url: TEST_PUSH_URL,
      exportType: option.exportType ?? option.handler?.key ?? 'live-qso',
      body: qsonToADIF({
        operation: { ...operation, ...(option.exportData || {}) },
        qsos: [qso],
        settings,
        format: option.format,
        ...option
      })
    }
  }).filter((request) => request.body?.includes('<EOR>'))
}

async function postLiveQSORequest (request) {
  const response = await fetch(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'User-Agent': `Ham2K-PoLo/${packageJson.version}`,
      'X-Ham2K-Export-Type': request.exportType ?? 'live-qso'
    },
    body: request.body
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Live QSO POST failed: ${response.status} ${response.statusText} ${text}`.trim())
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
      const operation = selectOperation(state, work.uuid)
      const ourInfo = selectOperationCallInfo(state, work.uuid)

      const requests = buildLiveQSORequests({
        operation,
        qso: work.qso,
        settings,
        ourInfo
      })

      for (const request of requests) {
        await postLiveQSORequest(request)
      }
    } catch (error) {
      console.error('[LiveQSO] Error sending QSO', error)
    }

    await new Promise(resolve => setTimeout(resolve, 0))
  }

  processing = false
}

export function enqueueLiveQSOPosts ({ getState, uuid, qsos }) {
  const activeQSOs = (qsos || []).filter((qso) => qso && !qso.event && !qso.deleted)
  activeQSOs.forEach((qso) => {
    queue.push({ getState, uuid, qso })
  })

  if (activeQSOs.length > 0) {
    setTimeout(() => {
      processQueue()
    }, 0)
  }
}
